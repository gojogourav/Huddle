// src/routes/tourPlanRoutes.ts
import express from 'express';
import { fetchMyTourPlans, generateTourPlanWithGemini, } from '../controllers/TourController'; // Adjust path
import { authMiddleware } from '../middlewares/authMiddleware'; // Adjust path

const router = express.Router();

// Generate a new tour plan based on preferences
// Requires authentication
router.post('/generate', authMiddleware, generateTourPlanWithGemini);
router.get('/my-plans', authMiddleware, fetchMyTourPlans); 
// Add other tour plan routes here later (e.g., get plan by ID, update, delete)
// router.get('/:planId', authMiddleware, getTourPlanById);
// router.put('/:planId', authMiddleware, updateTourPlan);
// router.delete('/:planId', authMiddleware, deleteTourPlan);

export default router;