import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redis : Redis | null = null;

export function getRedisClient() : Redis {
 if(redis) return redis;
 redis = new Redis({
 host: process.env.REDIS_HOST,                       
    port: Number(process.env.REDIS_PORT) || 6379,       
    password: process.env.REDIS_PASSWORD,               
    connectTimeout: 10000,                              
    retryStrategy: (times) => Math.min(times * 100, 3000), 
  });

  redis.on("connect", () => {
    console.log("✅ Redis connected");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
  });
  
 return redis;
} 
