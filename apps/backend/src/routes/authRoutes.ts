import express from 'express'
import { registerUser,loginUser, verify } from '../controllers/authController';
const router = express.Router();

router.post('/register',registerUser);
router.post('/login',loginUser)
router.post('/verify/:id',verify)

export default router