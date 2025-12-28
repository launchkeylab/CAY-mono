# CAY Worker EC2 Deployment Guide

This guide covers deploying the CAY worker service to AWS EC2 while keeping the web application on Vercel.

## Architecture Overview

- **Web App**: Deployed on Vercel (Next.js)
- **Worker Service**: Deployed on EC2 (Node.js + BullMQ)
- **Database**: PostgreSQL (shared between web and worker)
- **Redis**: Job queue for BullMQ (on EC2)

## Prerequisites

1. AWS EC2 instance (t3.micro or larger)
2. SSH key pair configured
3. Security groups configured
4. PostgreSQL database accessible from EC2

## Security Group Configuration

Your EC2 security group should allow:

```
Inbound Rules:
- SSH (22) from your IP
- HTTP (80) from anywhere (if using health checks)
- Custom TCP (6379) from Vercel IPs (for Redis, if needed)

Outbound Rules:
- HTTPS (443) to anywhere (for database connections)
- Custom TCP (5432) to your database
```

## Initial EC2 Setup

1. **Launch EC2 instance** with Amazon Linux 2 or Ubuntu
2. **Copy setup script** to your instance:
   ```bash
   scp scripts/setup-ec2.sh ec2-user@YOUR_EC2_IP:~/
   ```
3. **Run setup script**:
   ```bash
   ssh ec2-user@YOUR_EC2_IP
   chmod +x setup-ec2.sh
   sudo ./setup-ec2.sh
   ```

## Environment Configuration

1. **Create environment file** on EC2:
   ```bash
   ssh ec2-user@YOUR_EC2_IP
   cd /opt/cay-worker
   cp .env.production .env
   ```

2. **Edit environment variables**:
   ```bash
   # Required environment variables
   DATABASE_URL="postgresql://username:password@your-db-host:5432/cay"
   REDIS_URL="redis://localhost:6379"
   NODE_ENV="production"
   ```

## Deployment Process

### First-time Deployment

```bash
# From your local machine
./scripts/deploy-worker.sh YOUR_EC2_IP --build
```

### Subsequent Deployments

```bash
# Quick deployment (reuses existing Docker image)
./scripts/deploy-worker.sh YOUR_EC2_IP

# Full rebuild
./scripts/deploy-worker.sh YOUR_EC2_IP --build
```

## Monitoring and Management

### Service Management

```bash
# Check service status
sudo systemctl status cay-worker

# Start/stop/restart service
sudo systemctl start cay-worker
sudo systemctl stop cay-worker
sudo systemctl restart cay-worker

# View service logs
journalctl -u cay-worker -f
```

### Docker Management

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f worker
docker-compose logs -f redis

# Restart specific service
docker-compose restart worker

# Update and restart
docker-compose pull && docker-compose up -d
```

### Redis Management

```bash
# Connect to Redis CLI
redis-cli

# Monitor Redis
redis-cli monitor

# Check Redis info
redis-cli info
```

## Connecting Vercel to EC2 Worker

Update your Vercel environment variables to point to your EC2 Redis instance:

```bash
# In Vercel dashboard or via CLI
REDIS_URL="redis://YOUR_EC2_IP:6379"
```

## Scaling Considerations

### Vertical Scaling
- Upgrade EC2 instance type (t3.small, t3.medium, etc.)
- Increase Redis memory configuration

### Horizontal Scaling
- Deploy multiple worker instances
- Use AWS ElastiCache for Redis
- Implement load balancing

### Managed Services Migration
- **Database**: Migrate to AWS RDS
- **Redis**: Migrate to AWS ElastiCache
- **Monitoring**: Add CloudWatch integration

## Troubleshooting

### Common Issues

1. **Worker not processing jobs**
   ```bash
   # Check Redis connection
   docker-compose exec worker node -e "
   const Redis = require('ioredis');
   const redis = new Redis(process.env.REDIS_URL);
   redis.ping().then(console.log).catch(console.error);
   "
   ```

2. **Database connection issues**
   ```bash
   # Test database connectivity
   docker-compose exec worker node -e "
   const { db } = require('@cay/database');
   db.timer.findMany().then(console.log).catch(console.error);
   "
   ```

3. **Service won't start**
   ```bash
   # Check systemd logs
   journalctl -u cay-worker -n 50

   # Check Docker logs
   docker-compose logs worker
   ```

### Performance Monitoring

```bash
# Monitor system resources
htop

# Monitor Docker stats
docker stats

# Monitor Redis performance
redis-cli --latency-monitor
```

## Backup and Recovery

### Database Backups
- Ensure your PostgreSQL database has automated backups
- Test restore procedures regularly

### Redis Persistence
Redis is configured with persistence enabled. Data is stored in Docker volumes.

```bash
# Backup Redis data
docker-compose exec redis redis-cli BGSAVE

# View Redis data directory
docker volume inspect cay-worker_redis_data
```

## Security Best Practices

1. **Keep system updated**
   ```bash
   sudo yum update -y  # Amazon Linux
   sudo apt update && sudo apt upgrade -y  # Ubuntu
   ```

2. **Monitor access logs**
   ```bash
   sudo tail -f /var/log/secure  # SSH access logs
   ```

3. **Use security groups** instead of iptables when possible

4. **Rotate SSH keys** regularly

5. **Monitor for intrusion** using AWS GuardDuty or similar tools

## Cost Optimization

- Use **Reserved Instances** for predictable workloads
- Enable **detailed monitoring** to right-size instances
- Consider **Spot Instances** for development environments
- Use **AWS ElastiCache** for managed Redis (may be more cost-effective)

## Support and Maintenance

Regular maintenance tasks:
- Monitor disk usage (`df -h`)
- Check Docker image updates
- Review application logs
- Update dependencies in Docker images
- Test backup and restore procedures