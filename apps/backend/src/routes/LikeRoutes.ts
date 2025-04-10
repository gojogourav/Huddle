import { likeToggleComment, likeTogglePost } from '../controllers/likeController';
import { authMiddleware } from '../middlewares/authMiddleware';
import express from 'express'
const router = express.Router();
router.post('/like-post/:identifier',authMiddleware,likeTogglePost)
router.post('/like-comment/:identifier',authMiddleware,likeToggleComment)

export default router