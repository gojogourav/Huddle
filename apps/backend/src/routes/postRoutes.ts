import { deletePost, fetchExplorePosts, fetchSinglePost, PostPosts } from '../controllers/postController';
import { authMiddleware } from '../middlewares/authMiddleware';
import express from 'express'
const router = express.Router();

router.delete('/post/:identifier', authMiddleware,deletePost)

router.get('/post/:identifier', authMiddleware, fetchSinglePost);

router.post('/',authMiddleware,PostPosts)
router.get('/explore', authMiddleware, fetchExplorePosts);

 export default router