# Vercel Deployment Guide

## Required Environment Variables

Set the following environment variables in your Vercel dashboard:

### Database Configuration
```
DATABASE_URL="your-postgresql-connection-string"
REDIS_URL="your-redis-connection-string"
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### Build Configuration
```
NODE_ENV="production"
PRISMA_GENERATE_SKIP_AUTOINSTALL="true"
```

### Optional Email Configuration
```
EMAIL_USER="your-gmail@gmail.com"
EMAIL_PASS="your-gmail-app-password"
```

## Build Configuration

The project includes:
- `vercel.json` with custom build commands
- Monorepo workspace configuration
- Automatic Prisma client generation during build

## Deployment Steps

1. Connect your GitHub repository to Vercel
2. Set the root directory to the repository root (not /apps/web)
3. Configure the environment variables listed above
4. Deploy - Vercel will use the configuration from `vercel.json`

## Troubleshooting

### Common Issues:
1. **Prisma Client Missing**: Ensure `DATABASE_URL` is set and accessible during build
2. **Workspace Dependencies**: The build process now automatically generates Prisma client
3. **TypeScript Errors**: The root `tsconfig.json` handles monorepo workspace configuration

### Build Command Override
If needed, you can override the build command in Vercel dashboard:
```bash
npm install && npm run db:generate && npm run build --workspace=apps/web
```