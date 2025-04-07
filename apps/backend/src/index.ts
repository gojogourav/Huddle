import express from 'express'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/authRoutes'
import { Server, Socket } from 'socket.io';
const app = express()
import http from 'http'
import { redisClient } from './config/redisConnection';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app)
const io = new Server(server,{
    cors: {
        origin: '*',
        methods:["GET","POST"]
    }
})

io.on('connection', (socket) => {
    const loginData = {
        identifier: "user@example.com",
        password: "yourPassword",
        socketId: socket.id // Send the connected socket id
    };

    fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
    })
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.error(err));


    console.log('Client connected', socket.id);
    const redisSub = redisClient.duplicate();
    try {

        redisSub.subscribe(socket.id)
    } catch (error) {
        console.error('Subsccription Error', (error as Error).message);

    }
    redisSub.on('message', (channel: string, message: string) => {
        if (channel === socket.id) {
            socket.emit('otp-status', JSON.parse(message));
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        redisSub.unsubscribe();
        redisSub.quit();
    });


})


app.use(express.json());
app.use(cookieParser())
app.use('/api/auth', authRoutes)

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);

})