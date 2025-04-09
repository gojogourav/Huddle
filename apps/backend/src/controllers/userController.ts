import { AuthenticationRequest } from "@/middlewares/authMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/utils";

export const fetchCurrUserProfile = async (
  req: AuthenticationRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,

      }
    });

    if (!userProfile) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: userProfile
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const fetchFollowingPost = async (req: AuthenticationRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id
    if (!currentUserId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }



    const followingRelatins = await prisma.userFollows.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        followerId: currentUserId
      },
      select: {
        followingId: true
      }
    })

    const followingIds = followingRelatins.map(relation => relation.followingId);

    const userIdsFetchPostsFrom = [...followingIds, currentUserId]
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({

      where: {
        userId: {
          in: userIdsFetchPostsFrom,
        },
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      },
      take: limit,
      skip
    });
    res.status(200).json({ posts });
    return


  } catch (err) {
    console.error('Error fetching following posts:', err);
    res.status(500).json({ message: 'Failed to fetch posts' });
    return;
  }
}

export const PostPosts = async (req: AuthenticationRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id
    if (!currentUserId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const { text, image, userTag, location } = await req.body
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image URL is required.' });
    }
    const filteredUserTags = userTag.filter((id: string) => id !== currentUserId);
    const taggedUsers = filteredUserTags.map((id: string) => ({ id }))
    const post = await prisma.post.create({
      data: {
        userId: currentUserId,
        url: image,
        text,
        location: location,
        tag: {
          connect: taggedUsers
        },
      }
    }
    )
    res.status(201).json(post);
    return;
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong' });

  }
}

export const fetchSinglePost = async (req: Request, res: Response): Promise<void> => { // Can use standard Request if auth not strictly needed, or AuthenticationRequest if needed
  try {
    const postId = req.params.id;
    if (!postId) {
      res.status(400).json({ success: false, message: "Post ID is required." });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, username: true, name: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, username: true, name: true } } // Author of comment
          }
        },
        likes: {
          select: { userId: true }
        },
        tag: {
          select: { id: true, username: true }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      }
    });

    if (!post) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }

    res.status(200).json({ success: true, data: post });

  } catch (error) {
    console.error("Error fetching single post:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching post" });
  }
};

export const fetchGlobalUserProfile = async (req: Request<{ identifier: string }>, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      res.status(400).json({ success: false, message: "Username or User ID is required." });
      return;
    }
    const userProfile = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { id: identifier }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,

        _count: {
          select: {
            posts: true,
            followers: true,
            following: true
          }
        }
      }
    });
    const isFollowing = await prisma.userFollows.findFirst({
      where: {
        followerId: "",

        followingId: userProfile?.id

      },

    })
    if (!userProfile) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(200).json({
      success: true,
      data: {
        ...userProfile,
        isFollowing: isFollowing // Include follow status if calculated
      }
    });

  } catch (error) {
    console.error("Error fetching single post:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching post" });
  }

}

export const updateProfile = async (req: AuthenticationRequest, res: Response) => {
  try {
    const userId = await req.user?.id
    if (!userId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const { profilePic, bio, username, email } = await req.body
    // TODO:password updating feature
    const updatedProfile = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        username: username,
        profilePic,
        bio,
        email,
      },
      select: {
        username: true,
        profilePic: true,
        bio: true,
        email: true
      }
    })
    if (!updateProfile) {
      res.status(500).json({ message: "Failed to update userProfile", status: 500 })
      console.error("Failed to update user profile");
    }
    res.status(200).json({

    })
  } catch (error) {
    console.error("Error fetching single post:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching post" });
  }
}

export const followingUsers = async (req: AuthenticationRequest, res: Response) => {
  try {
    const userId = await req.user?.id
    if (!userId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const followings = await prisma.userFollows.findMany({
      where: {
        followerId: userId
      },
      take: limit,
      skip
    })
    res.status(200).json({ followings })
  } catch (error) {
    console.error("Error fetching followings ", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching post" });
  }
}
export const followersUsers = async (req: AuthenticationRequest, res: Response) => {
  try {
    const userId = await req.user?.id
    if (!userId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const followers = await prisma.userFollows.findMany({
      where: {
        followingId: userId
      },
      take: limit,
      skip
    })
    res.status(200).json({ followers })
  } catch (error) {
    console.error("Error fetching followers ", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching post" });
  }
}
export const followToggle = async (req: AuthenticationRequest, res: Response) => {
  try {
    const userId = await req.user?.id
    const { userIdToToggle } = req.params

    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    if (!userIdToToggle) {
      res.status(400).json({ success: false, message: "Target user ID parameter is required." });
      return;
    }

    if (userId === userIdToToggle) {
      res.status(400).json({ success: false, message: "You cannot follow yourself." });
      return;
    }
    const targetUserExists = await prisma.user.findUnique({
      where: { id: userIdToToggle },
      select: { id: true }
    });
    if (!targetUserExists) {
      res.status(404).json({ success: false, message: "User you are trying to follow does not exist." });
      return;
    }
    const existingFollow = await prisma.userFollows.findUnique({
      where: {

        followerId_followingId: {
          followerId: userId,
          followingId: userIdToToggle,
        },
      },
      select: { followerId: true }
    });


    let action: 'followed user' | 'unfollowed user';

    if (existingFollow) {
      await prisma.userFollows.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: userIdToToggle,
          },
        },
      });
      action = 'unfollowed user';
      console.log(`User ${userId} unfollowed User ${userIdToToggle}`);
    } else {

      await prisma.userFollows.create({
        data: {
          followerId: userId,
          followingId: userIdToToggle,
        },
      });
      action = 'followed user';
      console.log(`User ${userId} followed User ${userIdToToggle}`);
    }


    res.status(200).json({
      success: true,
      action: action,
    });

  } catch (error) {
    console.error("Error fetching followers ", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching post" });

  }
}
export const deletePost = async (req: AuthenticationRequest, res: Response) => {
  const currentUserId = req.user?.id
  const { postId } = await req.params
  try {
    if (!currentUserId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    if (!postId) {
      res.status(400).json({ success: false, message: "Post ID parameter is required." });
      return;
    }

    const deleteResult = await prisma.post.deleteMany({
      where: {
        id: postId,
        userId: currentUserId,
      },
    });
    if (deleteResult.count === 0) {
      const postExists = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (postExists) {
        console.log(`User ${currentUserId} attempted to delete post ${postId} owned by another user.`);
        res.status(403).json({ success: false, message: "Forbidden: You are not authorized to delete this post." });
      } else {
        res.status(404).json({ success: false, message: "Post not found." });
      }
      return;
    }


    console.log(`User ${currentUserId} successfully deleted post ${postId}`);
    res.status(204).send();

  } catch (error) {
    console.error(`Error deleting post ${postId} for user ${currentUserId}:`, error);


    res.status(500).json({
      success: false,
      message: "Internal server error while deleting post."
    });

  }
}
export const createComment = async (req: AuthenticationRequest, res: Response) => {
  const currentUserId = req.user?.id

  try {

    const { text, postId } = req.body

    if (!currentUserId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    const createdComment = await prisma.comment.create({
      data: {
        userId: currentUserId,
        text,
        postId
      },
      select: {
        text: text,
        user: {
          select: {
            username: true,
            name: true,
          }
        },
        postId: true
      }
    })
    if (!createdComment) {
      res.status(500).json({ message: "Failed to create comment" })
      return
    }
    res.status(201).json(createdComment);
    return
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting post."
    });
    return
  }
}




export const deleteComment = async (req: AuthenticationRequest, res: Response): Promise<void> => {
  const currentUserId = req.user?.id;
  const { commentId } = req.params;


  if (!currentUserId) {
    res.status(401).json({ success: false, message: "Not authenticated" });
    return;
  }
  if (!commentId) {
    res.status(400).json({ success: false, message: "Comment ID parameter is required." });
    return;
  }

  try {

    const deleteResult = await prisma.comment.deleteMany({
      where: {
        id: commentId,
        userId: currentUserId,
      },
    });


    if (deleteResult.count === 0) {

      const commentExists = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true } });
      if (commentExists) {
        console.log(`User ${currentUserId} attempted to delete comment ${commentId} owned by another user.`);
        res.status(403).json({ success: false, message: "Forbidden: You are not authorized to delete this comment." });
      } else {

        res.status(404).json({ success: false, message: "Comment not found." });
      }
      return;
    }


    console.log(`User ${currentUserId} successfully deleted comment ${commentId}`);

    res.status(204).send();

  } catch (error: any) {
    console.error(`Error deleting comment ${commentId} for user ${currentUserId}:`, error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: "Comment not found or authorization failed." });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error while deleting comment."
      });
    }
  }
};


export const unlikePost = async (req: AuthenticationRequest, res: Response): Promise<void> => {
    const currentUserId = req.user?.id;
    const { postId } = req.params;
if (!currentUserId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }
    if (!postId) {
      res.status(404).json({message:"PostId wasn't provided"})
    }

    try {
        const isPostalreadyLiked = await prisma.like.findFirst({
            where: {
                postId: postId,
                userId: currentUserId,
            },
        });

        let action :'Liked Post' | 'Unliked Post';
        if (!isPostalreadyLiked) {
            const like = await prisma.like.create({
              data:{
                postId,
                userId:currentUserId
              }
            })
             action = 'Liked Post';

            res.status(200).json({post:postId,user:currentUserId,action})
            return;
        }else{
          const unlikePost = await prisma.like.delete({
            where:{
              id:isPostalreadyLiked.id,
              postId,
              userId:currentUserId
            }
          })
          action='Unliked Post'
          if(!unlikePost){
            res.status(500).json({message:"Failed to unlike post"})
            return
          }
          res.status(200).json({postId,user:currentUserId,action})
          return
        }

    } catch (error) {
        console.error(`Error unliking post ${postId} for user ${currentUserId}:`, error);
        res.status(500).json({
            success: false,
            message: "Internal server error while unliking post."
        });
    }
};
