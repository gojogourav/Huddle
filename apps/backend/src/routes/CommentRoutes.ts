import { createComment } from '../controllers/commentController';
import { fetchCurrUserProfile, fetchGlobalUserProfile, followersUsers, followingUsers, updateProfile } from '../controllers/userController';
import { authMiddleware } from '../middlewares/authMiddleware';
import * as express from 'express';
const router = express.Router();

router.post('/comment/:postId',authMiddleware,createComment)
router.delete('/comment/:commentId',authMiddleware,createComment)

 export default router