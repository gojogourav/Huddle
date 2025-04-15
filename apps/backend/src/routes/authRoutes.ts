import express from 'express'
import { registerUser,loginUser, verifyLogin, logout, verifyRegistration } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = express.Router();

router.post('/register',registerUser);
router.post('/login',loginUser)
router.post('/verify-login/:id',verifyLogin)
router.post('/logout',authMiddleware,logout)
router.post('/verify-registration/:id', verifyRegistration); // New route for registration verification

export default router