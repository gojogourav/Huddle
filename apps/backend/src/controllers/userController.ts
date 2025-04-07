import { AuthenticationRequest } from "@/middlewares/authMiddleware";
import { Response } from "express";
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