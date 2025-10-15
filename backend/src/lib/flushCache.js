import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config(); // load env variables

// Initialize Redis
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

const flushChatKeys = async () => {
  try {
    const keys = await redisClient.keys("chat:messages:*");
    console.log("Keys to delete:", keys);

    for (const key of keys) {
      await redisClient.del(key);
      console.log("Deleted:", key);
    }
    console.log("✅ All chat keys cleared");
    process.exit();
  } catch (err) {
    console.error("❌ Error flushing keys:", err);
    process.exit(1);
  }
};

flushChatKeys();

