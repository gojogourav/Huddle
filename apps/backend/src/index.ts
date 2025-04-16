import  express from 'express'
import  cookieParser from 'cookie-parser'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import likeRoutes from './routes/LikeRoutes'
import CommentRoutes from './routes/CommentRoutes'
import postRoutes from './routes/postRoutes'
import { Server, Socket } from 'socket.io';
import utilsRoutes from './routes/utilsRoutes'; 
const app = express()
import  http from 'http'
import  cors from 'cors'
import tourPlanRoutes from './routes/tourPlanRoute'
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials:true
}))
const PORT = process.env.PORT || 5000;
const server = http.createServer(app)
const io = new Server(server,{
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods:["GET","POST"],
        credentials:true
    }
})
io.on('connection',(socket:Socket)=>{
    console.log(`Soket Successfully connected :${socket.id} `);
    const usreId = socket.data.user?.id
    if (usreId) {
        console.log(`Authenticated user ${usreId} connected via socket ${socket.id}`);
        // Join a room specific to this user (for targeted emits)
        socket.join(usreId);
    }else{
        console.log(`Unauthenticated soket ${socket.id} connected`);
        
    }
    socket.on('disconnect', (reason: string) => {
        console.log(`Socket disconnected: ${socket.id}. Reason: ${reason}`);
    });

    socket.on('error', (error: Error) => {
        console.error(`Socket Error (${socket.id}):`, error);
    });
    // socket.on('client_event_example', (data: any) => {
    //     if (!usreId) return; // Only process if authenticated maybe?
    //     console.log(`Received 'client_event_example' from user ${usreId} (${socket.id}):`, data);
    //     // Example: Echo back to sender
    //     // socket.emit('server_response', { received: data });
    //     // Example: Broadcast to everyone *except* sender
    //     // socket.broadcast.emit('broadcast_message', { sender: userId, content: data });
    //     // Example: Broadcast to a specific user's room
    //     // io.to(someOtherUserId).emit('private_message', { from: userId, text: data.message });
    // });
    socket.on('update_location', (locationData) => {
        if (!usreId) return; // Ensure user is known
        console.log(`Received 'update_location' from User ${usreId}:`, locationData);
        // Queue job to update DB (Recommended)
        // locationUpdateQueue.add('updateUserLocation', { userId, ...locationData });
    });
    socket.on('request_nearby_users', async (currentLocation) => {
        if (!usreId) return;
        console.log(`Received 'request_nearby_users' from User ${usreId}`);
        // Call logic to find nearby users
        // const nearbyUsers = await findNearbyUsers(...);
        // socket.emit('nearby_users_update', nearbyUsers); // Emit back to sender
   });




})


app.use(express.json({ limit: '10mb' }));
app.use(cookieParser())
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/like',likeRoutes)
app.use('/api/comment',CommentRoutes)
app.use('/api/post',postRoutes)
app.use('/api/utils', utilsRoutes);
app.use('/api/tour-plan', tourPlanRoutes); 
server.listen(PORT, () => {

    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Socket.IO server initialized and listening.');

})