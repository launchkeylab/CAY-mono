FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Copy workspace packages
COPY ../../packages/database ./packages/database

# Install dependencies
RUN npm ci --only=production

# Copy worker source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S worker -u 1001

# Change ownership of app directory
RUN chown -R worker:nodejs /app
USER worker

# Expose health check port (optional)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Start the worker
CMD ["npm", "start"]