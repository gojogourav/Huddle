import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";

export const prisma = new PrismaClient()
export const redisClient = new Redis(6379)
const optsSignInSignUp = {
    storeClient: redisClient,
    points: 5,
    duration: 30,
    blockDuration: 30,
}
const optEmail = {
    storeClient: redisClient,
    points: 2,
    duration: 60,
    blockDuration: 60,
}
const optVerify = {
    storeClient: redisClient,
    points: 5,
    duration: 30,
    blockDuration: 30,
}
export const ratelimiterSignInSignUp = new RateLimiterRedis(optsSignInSignUp)
export const ratelimiterEmail = new RateLimiterRedis(optEmail)
export const ratelimiterVerify = new RateLimiterRedis(optVerify)

