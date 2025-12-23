#!/bin/bash

# EC2 Setup Script for CAY Worker
# Run this script on a fresh EC2 instance (Amazon Linux 2 or Ubuntu)

set -e

echo "🚀 Setting up EC2 instance for CAY Worker..."

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
else
    echo "Cannot detect OS. Please run on Amazon Linux 2 or Ubuntu."
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
if [[ "$OS" == *"Amazon Linux"* ]]; then
    sudo yum update -y
    sudo yum install -y docker git
elif [[ "$OS" == *"Ubuntu"* ]]; then
    sudo apt update
    sudo apt install -y docker.io docker-compose git curl
else
    echo "Unsupported OS: $OS"
    exit 1
fi

# Install Docker (for Amazon Linux)
if [[ "$OS" == *"Amazon Linux"* ]]; then
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker $USER
    
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Start Docker service
echo "🐳 Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Install Redis
echo "📡 Installing Redis..."
if [[ "$OS" == *"Amazon Linux"* ]]; then
    sudo yum install -y redis
elif [[ "$OS" == *"Ubuntu"* ]]; then
    sudo apt install -y redis-server
fi

# Configure Redis
echo "⚙️ Configuring Redis..."
sudo systemctl start redis
sudo systemctl enable redis

# Configure Redis for external connections (if needed)
sudo sed -i 's/bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf || sudo sed -i 's/bind 127.0.0.1/bind 0.0.0.0/' /etc/redis.conf
sudo systemctl restart redis

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/cay-worker
sudo chown $USER:$USER /opt/cay-worker

# Create systemd service
echo "⚡ Creating systemd service..."
sudo tee /etc/systemd/system/cay-worker.service > /dev/null <<EOF
[Unit]
Description=CAY Worker Service
Requires=docker.service redis.service
After=docker.service redis.service

[Service]
Type=oneshot
RemainAfterExit=true
WorkingDirectory=/opt/cay-worker
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=$USER

[Install]
WantedBy=multi-user.target
EOF

# Create docker-compose file for worker
echo "📝 Creating docker-compose configuration..."
cat > /opt/cay-worker/docker-compose.yml <<EOF
version: '3.8'

services:
  worker:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - REDIS_URL=redis://localhost:6379
    restart: unless-stopped
    depends_on:
      - redis
    network_mode: host

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
EOF

# Set up environment file
echo "📄 Creating environment file template..."
cat > /opt/cay-worker/.env.production <<EOF
# Copy this to .env and fill in your values
DATABASE_URL="postgresql://username:password@your-db-host:5432/cay"
REDIS_URL="redis://localhost:6379"
NODE_ENV="production"
EOF

# Reload systemd and enable service
echo "🔄 Enabling systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable cay-worker.service

echo "✅ EC2 setup completed!"
echo ""
echo "Next steps:"
echo "1. Copy your worker code to /opt/cay-worker/"
echo "2. Create .env file with your database credentials"
echo "3. Run: sudo systemctl start cay-worker"
echo ""
echo "To monitor the service:"
echo "- sudo systemctl status cay-worker"
echo "- docker logs cay-worker-worker-1"
echo ""
echo "🔐 Security Note: Configure your security groups to allow:"
echo "- Outbound HTTPS (443) for database connections"
echo "- Inbound Redis (6379) from your Vercel app IPs (if needed)"