import { Redis } from "@upstash/redis";

function createRedisConnection() {
  // Check if Upstash Redis environment variables are available
  if (process.env.UPSTASH_REDIS_ENDPOINT && process.env.UPSTASH_REDIS_TOKEN) {
    return new Redis({
      host: process.env.UPSTASH_REDIS_ENDPOINT,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }

  // Local development fallback
  // return new Redis("redis://localhost:6379", {
  //   maxRetriesPerRequest: null,
  // });
}
export const redisConnection = createRedisConnection();
