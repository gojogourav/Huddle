import { fetchCurrUserProfile, fetchFollowingPost, fetchGlobalUserProfile, followersUsers, followingUsers, followToggle, isFollowing, updateProfile } from '../controllers/userController';
import { authMiddleware } from '../middlewares/authMiddleware';
import express from 'express'
const router = express.Router();

router.get('/profile', authMiddleware,fetchCurrUserProfile)
router.put('/profile', authMiddleware, updateProfile);
router.get('/:identifier', authMiddleware, fetchGlobalUserProfile);


router.get('/following-posts',authMiddleware,fetchFollowingPost)
router.get('/:identifier/isFollowing',authMiddleware,isFollowing)
router.get('/:identifier/followers',authMiddleware,followersUsers );
router.get('/:identifier/following',authMiddleware, followingUsers);
router.get('/:userIdToToggle/',authMiddleware,followToggle);


export default router