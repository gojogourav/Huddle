import jwt from 'jsonwebtoken'
import { json, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma, ratelimiterVerify, redisClient } from '../utils/utils'
import { Resend } from 'resend'
import  crypto from 'crypto'
//redis stuff
import Redis from 'ioredis'
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { sendResendEmail } from '../utils/emailTemplate'
import { RedisClient } from 'ioredis/built/connectors/SentinelConnector/types'
import { ratelimiterSignInSignUp } from '../utils/utils'
interface registerUserPayload {
    name: string,
    email: string,
    username: string,
    password: string
}
interface loginUserPayload {
    identifier: string,
    password: string
}

const resend = new Resend(process.env.RESEND_API_KEY)

// const prisma = new PrismaClient()

const generateToken = (res: Response, id: string) => {
    const access_token = jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '1h' })
    const refresh_token = jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '7d' })
    res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 1000,
        sameSite: 'strict'
    })
    res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'strict'
    })
}

export const registerUser = async (req: Request<registerUserPayload>, res: Response) => {
    const { email, username, password, name } = await req.body;
    try {
        const forwardedFor = req.headers['x-forwarded-for']

        const ip = typeof forwardedFor === 'string'
            ? forwardedFor.split(',').shift()
            : req.socket.remoteAddress

        if (!ip) {
            throw new Error("Failed to get ip")
        }
        console.log(ip);

        await ratelimiterSignInSignUp.consume(ip)
    } catch (error) {
        console.log(error);

        res.status(300).json({ message: "Please wait 10 seconds before making another requrest" })
        return
    }
    try {

        const userExists = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }]
            }
        })

        if (userExists) {
            res.json({ error: "User already exists" })
            return
        }

        const salt = await bcrypt.genSalt(12);
        const newHashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash: newHashedPassword,
                name
            }
        })

        if (!user) {
            res.json({ error: 500, message: "Failed to crease user" })
            return
        }

        const { passwordHash, ...userData } = user

        res.json({ status: 200, message: "Please continue login", user: userData })
    } catch (error) {
        console.error(error);
        res.json({ error: 500, message: "Failed to crease user" })
        return
    }
}

export const loginUser = async (req: Request<loginUserPayload>, res: Response) => {
    const { identifier, password } = req.body;

    const forwardedFor = req.headers['x-forwarded-for']

    const ip = typeof forwardedFor === 'string'
        ? forwardedFor.split(',').shift()
        : req.socket.remoteAddress

    if (!ip) {
        res.status(400).json({ message: "Invalid request" });
        return;
    }
    console.log(ip);
    try {
        await ratelimiterSignInSignUp.consume(ip);
    } catch (rateLimitError) {
        res.status(429).json({ message: "Please wait 10 seconds before another request" });
        return
    }

    try {
        const cacheKey = `user:${identifier}`
        const userCache = await redisClient.get(cacheKey)
        let user = userCache ? JSON.parse(userCache) : null;

        if (!user) {
            const dbUser = userCache ? JSON.parse(userCache) : await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: identifier },
                        { email: identifier }
                    ]
                },
                select: { id: true, name: true, passwordHash: true, email: true }
            })

            if (!dbUser) {
                res.status(401).json({
                    message: "Invalid credentials"
                })
                return;
            }

            await redisClient.setex(cacheKey, 60 * 60, JSON.stringify(dbUser))
            user = dbUser;
        }

        if (!user) {
            console.log('where are you failing bish');

            res.json({ message: "failed to authenticate", staus: 401 })
            return
        }
        redisClient.setex(`user:${user.username}`, 60 * 60, JSON.stringify(user))
        console.log(`user beffore checking is password correct - ${user.passwordHash}`);

        const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash)

        if (!isPasswordCorrect) {
            res.json({ message: "failed to authenticate", staus: 401 })
            return
        }

        function generateSixDigitNumber() {
            const buffer = crypto.randomBytes(4);
            const randomInt = buffer.readInt32BE();
            let randomSixDigit = randomInt% 900000 + 100000;
            if(randomSixDigit<0) randomSixDigit=randomSixDigit*-1
            return randomSixDigit;
          }

          function generateVerificationUUID(){
            return crypto.randomUUID();
          }
          
        try{
            const otp = String(generateSixDigitNumber())
            await sendResendEmail(otp,user.email,res)
            const verificationID = generateVerificationUUID()
            const salt = await bcrypt.genSalt(12)
            const hashedOTP = await bcrypt.hash(otp,salt)

            redisClient.setex(`verifyId:${verificationID}`,15*60,JSON.stringify({userID:user.id,otp:hashedOTP}))

         res.status(200).json({
            verifyId:verificationID,
            message: 'OTP sent successfully. Please verify to complete login.',
            email: user.email
        });
        
        return;
    }catch (error) {
        console.error('Login Process Error:', error);
         res.status(500).json({ message: 'An internal error occurred during login.' });
        return
        }

    } catch (error) {
        console.error(error);

        res.status(401).json({ message: "failed to authenticate" })
        return
    }

}



export const verify = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const { id } =  req.params;
        const otpData = await redisClient.get(`verifyId:${id}`)
        if(!otpData) {
            throw new Error("Unauthorized access")
        } 
        const data = JSON.parse(otpData);

        const {otp} = req.body;

        const verifyOTP = await bcrypt.compare(otp,data.otp)
        try{
            ratelimiterVerify.consume(`${data.verifyId}`)

        }catch(error){
            res.status(500).json({message:"Please wait few moments before trying"})
            return
        }
        if(!verifyOTP){

            res.status(401).json({message:"Failed to authenticate user"})
            return;
        }
        
        generateToken(res,data.userID)
        
        res.status(201).json({message:"Successfully logged in please continue"})
    } catch (error) {
        console.error(error);
        res.status(500).json({error:"Unauthorized access"})
        return;
    }
}