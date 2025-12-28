import Redis from 'ioredis';

function createRedisConnection() {
  // Check if Upstash Redis environment variables are available
  if (process.env.UPSTASH_REDIS_ENDPOINT && process.env.UPSTASH_REDIS_PASSWORD) {
    return new Redis({
      host: process.env.UPSTASH_REDIS_ENDPOINT,
      port: 6379,
      password: process.env.UPSTASH_REDIS_PASSWORD,
      tls: {},
      maxRetriesPerRequest: null,
    });
  }

  // Fallback to traditional Redis URL (for backward compatibility)
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  // Local development fallback
  return new Redis('redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
}

export const redisConnection = createRedisConnection();