import { Redis } from "ioredis";

function createRedisConnection() {
  // Check if Redis URL is available (Upstash or local)
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }

  // Local development fallback
  return new Redis("redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
}
export const redisConnection = createRedisConnection();
