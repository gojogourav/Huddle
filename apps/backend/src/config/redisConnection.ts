import IORedis from 'ioredis'



export const redisClient = new IORedis(process.env.UPSHASH_API_KEY!,{
  maxRetriesPerRequest:null
})



redisClient
  .on('connect', () => console.log('Redis connected'))
  .on('ready', () => console.log('Redis ready'))
  .on('error', err => console.error('BullMQ Redis Error:', err))
  .on('reconnecting', () => console.log('Redis reconnecting...'))
  .on('end', () => console.log('Redis connection closed'));
