import { AuthenticationRequest } from "@/middlewares/authMiddleware";
import { Request, Response } from "express";
import { prisma } from "../utils/utils";


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

