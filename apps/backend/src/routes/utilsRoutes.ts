// src/routes/utilsRoutes.ts
import express from 'express';
import { getImageKitAuth } from '../controllers/utilsController'; // Adjust path
import { authMiddleware } from '../middlewares/authMiddleware'; // Import your authentication middleware

const router = express.Router();

// --- ImageKit Authentication Endpoint ---
// Apply authentication middleware to protect this route
router.get('/imagekit-auth', authMiddleware, getImageKitAuth);

export default router;