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
        posts:true,
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

export const fetchGlobalUserProfile = async (req: AuthenticationRequest<{ identifier: string }>, res: Response): Promise<void> => {
  
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
    
    if (!userProfile) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(200).json({
      success: true,
      data: {
        ...userProfile,
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
    if (!updatedProfile) {
      res.status(500).json({ message: "Failed to update userProfile", status: 500 })
      console.error("Failed to update user profile");
    }
    res.status(200).json({
      updateProfile
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

export const isFollowing = async (req:AuthenticationRequest<{identifier:string}>,res:Response):Promise<void>=>{
  try{
    const userId = req.user?.id
    if (!userId) {
      res.status(400).json({ success: false, message: "not authenticated." });
      return;
    }
    const followingId = req.params.identifier
    const isFollowing = await prisma.userFollows.findFirst({
      where:{
        followerId:userId,
        followingId:followingId
      }
    }) 
    if(isFollowing){
      res.status(200).json({isFollowing:true,success:true})
      return
    }
    else{res.status(200).json({isFollowing:false,success:true})}
  }catch(error){
     console.error("Error fetching isFollowing ", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching post" });
  }
}

