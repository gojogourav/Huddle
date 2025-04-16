import * as jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import * as  bcrypt from 'bcryptjs';
import { prisma, ratelimiterVerify, ratelimiterSignInSignUp } from '../utils/utils';
import { redisClient } from '../config/redisConnection';
import * as crypto from 'crypto';
import { emailQueue } from '../utils/queues/emailQueue';

// --- Interfaces ---
interface RegisterUserPayload {
    name: string;
    email: string;
    username: string;
    password: string;
}

interface LoginUserPayload {
    identifier: string; // email or username
    password: string;
}

interface VerifyPayload {
    otp: string;
}

interface VerificationData {
    userId: string;
    otpHash: string;
    type: 'registration' | 'login';
}

// --- Helper Functions ---

const generateToken = (res: Response, userId: string): void => {
    try {
        const access_token = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
        const refresh_token = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'strict' as const,
            path: '/',
        };
        res.cookie('access_token', access_token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
        res.cookie('refresh_token', refresh_token, cookieOptions);
    } catch (error) {
        console.error("Error generating tokens:", error);
        throw new Error("Failed to generate authentication tokens.");
    }
};

function generateSixDigitNumber(): string {
    return crypto.randomInt(100000, 1000000).toString();
}

function generateVerificationUUID(): string {
    return crypto.randomUUID();
}

// --- Route Handlers ---

export const registerUser = async (req: Request<{}, {}, RegisterUserPayload>, res: Response): Promise<void> => {
    const { email, username, password, name } = req.body;
    const lowerCaseEmail = email.toLowerCase();
    const lowerCaseUsername = username.toLowerCase();

    if (!email || !username || !password || !name) {
        res.status(400).json({ message: "All fields are required", ok: false });
        return;
    }

    let ip: string | undefined;
    try {
        const forwardedFor = req.headers['x-forwarded-for'];
        ip = typeof forwardedFor === 'string' ? forwardedFor.split(',').shift()?.trim() : req.socket.remoteAddress;
        if (!ip) throw new Error("Could not determine IP address");
        await ratelimiterSignInSignUp.consume(ip);
    } catch (rateLimitError: any) {
        const retryAfter = rateLimitError?.msBeforeNext ? Math.ceil(rateLimitError.msBeforeNext / 1000) : 10;
        res.status(429).json({ message: `Too many attempts. Please wait ${retryAfter} seconds.`, ok: false });
        return;
    }

    try {
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ username: lowerCaseUsername }, { email: lowerCaseEmail }] },
            select: { id: true, isVerified: true }
        });

        if (existingUser?.isVerified) {
            res.status(409).json({ message: "User already exists and is verified.", ok: false });
            return;
        }
        if (existingUser && !existingUser.isVerified) {
             // Decide how to handle existing unverified: error out, delete, or allow re-verification
             res.status(409).json({ message: "An unverified account exists. Please check your email or contact support.", ok: false });
             return;
        }

        const salt = await bcrypt.genSalt(12);
        const newHashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                username: lowerCaseUsername,
                email: lowerCaseEmail,
                passwordHash: newHashedPassword,
                name,
                isVerified: false
            }
        });

        try {
            const otp = generateSixDigitNumber();
            const verificationId = generateVerificationUUID();
            const otpSalt = await bcrypt.genSalt(10);
            const hashedOTP = await bcrypt.hash(otp, otpSalt);
            const redisKey = `verify:${verificationId}`;
            const verificationData: VerificationData = { userId: user.id, otpHash: hashedOTP, type: 'registration' };

            await redisClient.setex(redisKey, 15 * 60, JSON.stringify(verificationData)); // 15 min expiry
            await emailQueue.add('send-registration-otp', { email: user.email, otp: otp, name: user.name || user.username });

            res.status(201).json({
                message: 'Registration successful! Please verify your email with the OTP sent.',
                verificationId: verificationId,
                ok: true,
            });
        } catch (otpError) {
            console.error(`OTP process failed for user ${user.id}:`, otpError);
            res.status(500).json({ message: 'Registration succeeded, but failed to send verification email.', ok: false });
        }

    } catch (error: any) {
        console.error("Registration Error:", error);
        if (error?.code === 'P2002') {
             res.status(409).json({ message: "Username or email already taken.", ok: false });
        } else {
            res.status(500).json({ message: "Failed to register user.", ok: false });
        }
    }
};


export const loginUser = async (req: Request<{}, {}, LoginUserPayload>, res: Response): Promise<void> => {
    const { identifier, password } = req.body;
    const lowerCaseIdentifier = identifier.toLowerCase();

    if (!identifier || !password) {
        res.status(400).json({ message: "Identifier and password are required", ok: false });
        return;
    }

    let ip: string | undefined;
    try {
        const forwardedFor = req.headers['x-forwarded-for'];
        ip = typeof forwardedFor === 'string' ? forwardedFor.split(',').shift()?.trim() : req.socket.remoteAddress;
        if (!ip) throw new Error("Could not determine IP address");
        await ratelimiterSignInSignUp.consume(ip);
    } catch (rateLimitError: any) {
        const retryAfter = rateLimitError?.msBeforeNext ? Math.ceil(rateLimitError.msBeforeNext / 1000) : 10;
        res.status(429).json({ message: `Too many attempts. Please wait ${retryAfter} seconds.`, ok: false });
        return;
    }

    try {
        const cacheKey = `user:${lowerCaseIdentifier}`;
        let user: any = null; // Define type more specifically if possible
        try {
            const userCache = await redisClient.get(cacheKey);
            if (userCache) user = JSON.parse(userCache);
        } catch (redisError) { console.error("Redis GET error:", redisError); }

        if (!user) {
            user = await prisma.user.findFirst({
                where: { OR: [{ username: lowerCaseIdentifier }, { email: lowerCaseIdentifier }] },
                select: { id: true, name: true, passwordHash: true, email: true, username: true, isVerified: true }
            });
            if (user) {
                try {
                    await redisClient.setex(cacheKey, 3600, JSON.stringify(user));
                    if (user.email === lowerCaseIdentifier && user.username !== lowerCaseIdentifier) {
                         await redisClient.setex(`user:${user.username}`, 3600, JSON.stringify(user));
                     }
                } catch (redisError) { console.error("Redis SETEX error:", redisError); }
            }
        }

        if (!user || !user.passwordHash) {
            res.status(401).json({ message: "Invalid credentials.", ok: false });
            return;
        }

        if (!user.isVerified) {
             res.status(403).json({
                 message: "Account not verified. Please check your email.",
                 ok: false,
                 needsVerification: true
             });
             return;
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordCorrect) {
            res.status(401).json({ message: "Invalid credentials.", ok: false });
            return;
        }

        try {
            const otp = generateSixDigitNumber();
            const verificationId = generateVerificationUUID();
            const salt = await bcrypt.genSalt(10);
            const hashedOTP = await bcrypt.hash(otp, salt);
            const redisKey = `verify:${verificationId}`;
            const verificationData: VerificationData = { userId: user.id, otpHash: hashedOTP, type: 'login' };

            await redisClient.setex(redisKey, 5 * 60, JSON.stringify(verificationData)); // 5 min expiry
            await emailQueue.add('send-login-otp', { email: user.email, otp: otp });

            res.status(200).json({
                message: 'Credentials valid. OTP sent to complete login.',
                verificationId: verificationId,
                ok: true,
                needsOtp: true
            });
        } catch (otpError) {
            console.error(`Login OTP failed for user ${user.id}:`, otpError);
            res.status(500).json({ message: 'Failed to send login OTP.', ok: false });
        }

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "An unexpected error occurred during login.", ok: false });
    }
};


export const verifyRegistration = async (req: Request<{ id: string }, {}, VerifyPayload>, res: Response): Promise<void> => {
    const { id: verificationId } = req.params;
    const { otp } = req.body;

    if (!verificationId || !otp) {
        res.status(400).json({ message: "Verification ID and OTP required.", ok: false });
        return;
    }

    const redisKey = `verify:${verificationId}`;
    try {
        await ratelimiterVerify.consume(verificationId);
    } catch (rateLimitError: any) {
        const retryAfter = rateLimitError?.msBeforeNext ? Math.ceil(rateLimitError.msBeforeNext / 1000) : 5;
        res.status(429).json({ message: `Too many attempts. Wait ${retryAfter} seconds.`, ok: false });
        return;
    }

    try {
        const verificationDataString = await redisClient.get(redisKey);
        if (!verificationDataString) {
            res.status(404).json({ message: "Verification request not found or expired.", ok: false });
            return;
        }

        const verificationData: VerificationData = JSON.parse(verificationDataString);
        if (verificationData.type !== 'registration') {
            res.status(400).json({ message: "Invalid verification type.", ok: false });
            return;
        }
        if (!verificationData.userId || !verificationData.otpHash) throw new Error("Corrupted verification data");

        const isOtpValid = await bcrypt.compare(otp, verificationData.otpHash);
        if (!isOtpValid) {
            res.status(400).json({ message: "Invalid OTP.", ok: false });
            return;
        }

        await prisma.user.update({
            where: { id: verificationData.userId },
            data: { isVerified: true },
        });

        await redisClient.del(redisKey).catch(err => console.error("Failed to delete redis key:", err));

        res.status(200).json({ message: "Email verified successfully. You can now log in.", ok: true });

    } catch (error: any) {
        console.error("Registration Verification Error:", error);
        if (error instanceof SyntaxError || error.message === "Corrupted verification data") {
             res.status(500).json({ message: "Verification data error.", ok: false });
        } else if (error.code === 'P2025') { // Prisma record not found during update
            res.status(404).json({ message: "User associated with verification not found.", ok: false });
        }
         else {
             res.status(500).json({ message: "Verification failed.", ok: false });
        }
    }
};


export const verifyLogin = async (req: Request<{ id: string }, {}, VerifyPayload>, res: Response): Promise<void> => {
    const { id: verificationId } = req.params;
    const { otp } = req.body;

     if (!verificationId || !otp) {
        res.status(400).json({ message: "Verification ID and OTP required.", ok: false });
        return;
    }

    const redisKey = `verify:${verificationId}`;
    try {
        await ratelimiterVerify.consume(verificationId);
    } catch (rateLimitError: any) {
        const retryAfter = rateLimitError?.msBeforeNext ? Math.ceil(rateLimitError.msBeforeNext / 1000) : 5;
        res.status(429).json({ message: `Too many attempts. Wait ${retryAfter} seconds.`, ok: false });
        return;
    }

    try {
        const verificationDataString = await redisClient.get(redisKey);
        if (!verificationDataString) {
            res.status(404).json({ message: "Login verification request not found or expired.", ok: false });
            return;
        }

        const verificationData: VerificationData = JSON.parse(verificationDataString);
         if (verificationData.type !== 'login') {
             res.status(400).json({ message: "Invalid verification type for login.", ok: false });
             return;
         }
        if (!verificationData.userId || !verificationData.otpHash) throw new Error("Corrupted verification data");

        const isOtpValid = await bcrypt.compare(otp, verificationData.otpHash);
        if (!isOtpValid) {
            res.status(400).json({ message: "Invalid OTP.", ok: false });
            return;
        }

        generateToken(res, verificationData.userId);
        await redisClient.del(redisKey).catch(err => console.error("Failed to delete redis key:", err));

        res.status(200).json({ message: "Login successful.", ok: true });

    } catch (error: any) {
        console.error("Login Verification Error:", error);
         if (error instanceof SyntaxError || error.message === "Corrupted verification data") {
             res.status(500).json({ message: "Verification data error.", ok: false });
        } else {
             res.status(500).json({ message: "Login verification failed.", ok: false });
        }
    }
};


export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict' as const,
            path: '/',
        };
        res.clearCookie('access_token', cookieOptions);
        res.clearCookie('refresh_token', cookieOptions);
        res.status(200).json({ message: "Logged out successfully", ok: true });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ message: "Logout failed.", ok: false });
    }
};



export const cleanupUnverifiedUsers = async () => {
    const EXPIRY_HOURS = 24;
    const thresholdDate = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);
    console.log(`Cleanup: Deleting unverified users created before ${thresholdDate.toISOString()}`);
    try {
        const { count } = await prisma.user.deleteMany({
            where: { isVerified: false, createdAt: { lt: thresholdDate } }
        });
        console.log(`Cleanup successful: Deleted ${count} unverified users.`);
    } catch (error) {
        console.error("Error during unverified user cleanup:", error);
    }
};