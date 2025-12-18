# Cay Monorepo

A full-stack application with safety timer functionality, built with Next.js, Node.js worker, and PostgreSQL.

## Architecture

- **apps/web**: Next.js frontend application with React
- **apps/worker**: Node.js background worker for processing jobs
- **packages/database**: Shared Prisma database package

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (for job queuing)
- npm

### Database Setup

1. **Install PostgreSQL**
   ```bash
   # macOS (using Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Windows
   # Download and install from https://www.postgresql.org/download/windows/
   ```

2. **Create Database**
   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres
   
   # Create database and user
   CREATE DATABASE cay_db;
   CREATE USER cay_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE cay_db TO cay_user;
   \q
   ```

3. **Install Redis**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt install redis-server
   sudo systemctl start redis-server
   
   # Windows
   # Download from https://redis.io/download
   ```

### Environment Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd cay-monorepo
   npm install
   ```

2. **Configure environment variables**
   ```bash
   # Create environment files
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env.local
   cp apps/worker/.env.example apps/worker/.env
   ```

3. **Set database connection**
   ```bash
   # In .env and apps/*/. env files
   DATABASE_URL="postgresql://cay_user:your_password@localhost:5432/cay_db"
   REDIS_URL="redis://localhost:6379"
   ```

### Database Migration

1. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

2. **Push schema to database**
   ```bash
   npm run db:push
   ```

### Running the Application

1. **Start all services**
   ```bash
   # Terminal 1: Web app
   npm run dev:web
   
   # Terminal 2: Worker
   npm run dev:worker
   ```

2. **Access the application**
   - Web app: http://localhost:3000
   - Database admin: Use a tool like pgAdmin or TablePlus

## Database Schema

The application includes:

- **Users**: Authentication and user management
- **Timers**: Safety timer functionality with escalation
- **Contacts**: Emergency contact management

## Development

### Available Scripts

- `npm run dev:web` - Start Next.js development server
- `npm run dev:worker` - Start worker in watch mode
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database

### Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Node.js, BullMQ (job queue)
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis
- **Email**: Nodemailer