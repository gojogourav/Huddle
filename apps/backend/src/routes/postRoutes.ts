import { deletePost, fetchSinglePost, PostPosts } from '../controllers/postController';
import { authMiddleware } from '../middlewares/authMiddleware';
import express from 'express'
const router = express.Router();

router.delete('/post/:identifier', authMiddleware,deletePost)

router.get('/post/:identifier', authMiddleware, fetchSinglePost);

router.post('/',authMiddleware,PostPosts)

 export default router