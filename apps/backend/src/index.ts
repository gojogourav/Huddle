import express from 'express'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import likeRoutes from './routes/LikeRoutes'
import CommentRoutes from './routes/CommentRoutes'
import postRoutes from './routes/postRoutes'
import { Server, Socket } from 'socket.io';
const app = express()
import http from 'http'
import cors from 'cors'

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials:true
}))
const PORT = process.env.PORT || 5000;
const server = http.createServer(app)
const io = new Server(server,{
    cors: {
        origin: '*',
        methods:["GET","POST"]
    }
})

io.on('connection', (socket) => {

    console.log('Client connected', socket.id);
    
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}. Reason: ${reason}`);
    });


    socket.on('error', (error) => console.error(`Socket Error (${socket.id}):`, error));


})


app.use(express.json());
app.use(cookieParser())
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/like',likeRoutes)
app.use('/api/comment',CommentRoutes)
app.use('/api/post',postRoutes)
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);

})