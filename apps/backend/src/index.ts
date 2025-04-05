import express from 'express'
import cookieParser from 'cookie-parser'
import router from './routes/authRoutes';
const app = express()


const PORT = process.env.PORT||5000;



app.use(express.json());
app.use(cookieParser())
app.use('/api/users',router)



app.get('/',(req,res)=>{
    res.send("Hello from backend")
})

app.listen(PORT,()=>{
    console.log(`Server running at http://localhost:${PORT}`);
    
})