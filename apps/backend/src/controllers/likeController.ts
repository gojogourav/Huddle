import { AuthenticationRequest } from "@/middlewares/authMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/utils";


export const likeTogglePost = async (req: AuthenticationRequest<{identifier:string}>, res: Response): Promise<void> => {
    const currentUserId = req.user?.id;
    const postId = req.params.identifier;
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

export const likeToggleComment = async (req: AuthenticationRequest, res: Response): Promise<void> => {
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