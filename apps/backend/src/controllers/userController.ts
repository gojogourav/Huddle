import { AuthenticationRequest } from "@/middlewares/authMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/utils";

export const fetchProfile = async (
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
        createdAt:'desc'
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
    const { text, image, userTag, location } = await req.body()
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
          connect:  taggedUsers
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
