import { fetchCurrUserProfile, fetchFollowingPost, fetchGlobalUserProfile, fetchUserPosts, followersUsers, followingUsers, followToggle, isFollowing, lookupUsersByUsername, updateProfile } from '../controllers/userController';
import { authMiddleware } from '../middlewares/authMiddleware';
import express from 'express'
const router = express.Router();

router.get('/profile', authMiddleware,fetchCurrUserProfile)
router.put('/profile', authMiddleware, updateProfile);
router.get('/:identifier/profile', authMiddleware, fetchGlobalUserProfile);
router.get('/:identifier/post', authMiddleware, fetchUserPosts);
router.get('/lookup', authMiddleware, lookupUsersByUsername);


router.get('/feed/following',authMiddleware,fetchFollowingPost)
router.get('/:identifier/is-following', authMiddleware, isFollowing); // Made path more specific
router.get('/:identifier/followers',authMiddleware,followersUsers );
router.get('/:identifier/following',authMiddleware, followingUsers);
router.post('/follow/:targetUserId', authMiddleware, followToggle);


export default router