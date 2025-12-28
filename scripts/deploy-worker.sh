#!/bin/bash

# CAY Worker Deployment Script
# Usage: ./deploy-worker.sh [EC2_HOST] [optional: --build]

set -e

# Configuration
EC2_HOST=${1:-""}
BUILD_FLAG=${2:-""}
WORKER_DIR="/opt/cay-worker"
LOCAL_WORKER_DIR="apps/worker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Validate inputs
if [ -z "$EC2_HOST" ]; then
    error "Usage: $0 <EC2_HOST> [--build]"
fi

if [ ! -d "$LOCAL_WORKER_DIR" ]; then
    error "Worker directory not found: $LOCAL_WORKER_DIR"
fi

log "🚀 Starting deployment to $EC2_HOST..."

# Check if we can connect to EC2
log "🔍 Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 ec2-user@$EC2_HOST "echo 'Connection successful'" > /dev/null 2>&1; then
    error "Cannot connect to EC2 instance. Please check your SSH configuration."
fi

# Create deployment package
log "📦 Creating deployment package..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy worker files
cp -r $LOCAL_WORKER_DIR/* $TEMP_DIR/
cp -r packages/database $TEMP_DIR/packages/

# Copy deployment files
cp scripts/cay-worker.service $TEMP_DIR/
mkdir -p $TEMP_DIR/scripts
cat > $TEMP_DIR/docker-compose.yml <<EOF
version: '3.8'

services:
  worker:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - REDIS_URL=\${REDIS_URL:-redis://localhost:6379}
    restart: unless-stopped
    network_mode: host
    container_name: cay-worker

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    container_name: cay-redis

volumes:
  redis_data:
EOF

# Create archive
log "📋 Creating deployment archive..."
cd $TEMP_DIR
tar -czf ../cay-worker-deploy.tar.gz .
cd - > /dev/null

# Upload to EC2
log "⬆️ Uploading files to EC2..."
scp $TEMP_DIR/../cay-worker-deploy.tar.gz ec2-user@$EC2_HOST:/tmp/

# Deploy on EC2
log "🔧 Deploying on EC2..."
ssh ec2-user@$EC2_HOST << 'EOF'
set -e

# Stop existing service
sudo systemctl stop cay-worker || true

# Extract new files
cd /opt/cay-worker
sudo tar -xzf /tmp/cay-worker-deploy.tar.gz
sudo chown -R ec2-user:ec2-user .

# Update systemd service if it exists
if [ -f cay-worker.service ]; then
    sudo cp cay-worker.service /etc/systemd/system/
    sudo systemctl daemon-reload
fi

# Build and start
if [ "$BUILD_FLAG" = "--build" ] || [ ! "$(docker images -q cay-worker 2> /dev/null)" ]; then
    echo "🔨 Building Docker image..."
    docker-compose build worker
fi

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    docker-compose ps
else
    echo "❌ Deployment failed!"
    docker-compose logs
    exit 1
fi

# Enable systemd service
sudo systemctl enable cay-worker || true
sudo systemctl start cay-worker || true

echo "🎉 Worker deployed successfully!"
EOF

# Cleanup
rm -f $TEMP_DIR/../cay-worker-deploy.tar.gz

log "✅ Deployment completed successfully!"
log "📊 To monitor the worker:"
log "   ssh ec2-user@$EC2_HOST 'cd /opt/cay-worker && docker-compose logs -f worker'"
log "🔍 To check service status:"
log "   ssh ec2-user@$EC2_HOST 'sudo systemctl status cay-worker'"