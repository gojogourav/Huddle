import { fetchProfile } from '../controllers/userController';
import { authMiddleware } from '../middlewares/authMiddleware';
import express from 'express'
const router = express.Router();

router.get('/profile', authMiddleware,fetchProfile)
 export default router