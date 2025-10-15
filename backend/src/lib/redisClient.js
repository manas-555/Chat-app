import { Redis } from "@upstash/redis";

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Optional connection log (useful for Render)
redisClient.ping()
  .then(() => console.log("✅ Connected to Upstash Redis"))
  .catch((err) => console.error("❌ Redis connection error:", err));

export default redisClient;

