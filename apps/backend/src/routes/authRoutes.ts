import express from 'express'
import { registerUser,loginUser, verify, logout } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = express.Router();

router.post('/register',registerUser);
router.post('/login',loginUser)
router.post('/verify/:id',verify)
router.post('/logout',authMiddleware,logout)
export default router