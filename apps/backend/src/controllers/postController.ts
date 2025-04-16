import { AuthenticationRequest } from "@/middlewares/authMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/utils";


export const PostPosts = async (req: AuthenticationRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id
    if (!currentUserId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const { text, image, userTag, location } =  req.body
    if (!image) {
      res.status(400).json({ success: false, message: 'Image URL is required.' });
      return
    }
    const tags = userTag
    const filteredUserTags = tags.filter((id: string) => id !== currentUserId);
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
    res.status(500).json({ message: 'Something went wrong' });
    return
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

export const fetchExplorePosts = async (req: AuthenticationRequest, res: Response) => {
  // Auth is optional here, req.user might be undefined if middleware allows unauthenticated access
  const currentUserId = req.user?.id;

  // Pagination
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12; // Default limit (e.g., 12 for a 3/4 col grid)
  const skip = (page - 1) * limit;

  try {
    
    // Fetch Posts
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: 'desc', // Fetch most recent posts first

      },
      include: {
        // Include data needed for the PostCard component
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true, // Important for PostCard display
          }
        },
        _count: {
          select: { likes: true, comments: true }
        },
      },
      take: limit,
      skip,
    });

    // Fetch total count for pagination using the same filter

    // Optional: Transform posts to add isLikedByCurrentUser boolean
    const transformedPosts = posts.map(post => {
        // Explicitly type post for safety, assuming 'likes' might be included
        const typedPost = post as typeof post & { likes?: Array<{userId: string}> };
        const { likes, ...restOfPost } = typedPost;
        return {
            ...restOfPost,
             // Add boolean flag based on whether the likes array (filtered for current user) has items
            isLikedByCurrentUser: !!(likes && likes.length > 0),
        };
    });


    res.status(200).json({
      success: true,
      posts: transformedPosts, // Send transformed posts
      pagination: {
        page,
        limit,
      },
    });

  } catch (err) {
    console.error('Error fetching explore posts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch explore posts' });
  }
};
