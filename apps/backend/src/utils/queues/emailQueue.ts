import { redisClient as bullMqConnection } from "../../config/redisConnection";
import { Queue, Worker } from "bullmq";
import { sendResendEmail } from "../emailTemplate";

export const emailQueue = new Queue('email-queue', {
    connection: bullMqConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
    }
})

export const emailWorker = new Worker('email-queue', async job => {
    const { email, otp, soketId } = job.data;
    await sendResendEmail(otp, email, soketId)
}, {
    connection: bullMqConnection,
    limiter: {
        max: 5,
        duration: 1000
    }
}
)

console.log('BullMQ Email Queue is initialized');

emailQueue.on('error',(error)=>{
    console.error('Error in bullmq queue', error);
})