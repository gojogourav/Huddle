// src/controllers/utilsController.ts
import { Response } from 'express';
const ImageKit = require('imagekit');
import { AuthenticationRequest } from "../middlewares";

// Initialize ImageKit SDK (do this once, e.g., in a config file or here)
// Ensure environment variables are loaded before this runs (e.g., using dotenv)
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

/**
 * Generates ImageKit authentication parameters for secure client-side uploads.
 * This endpoint MUST be protected by authentication middleware.
 */
export const getImageKitAuth = async (req: AuthenticationRequest, res: Response): Promise<void> => {
    // Check if user is authenticated (middleware should handle this, but double-check)
    if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
    }

    try {
        // Generate authentication parameters
        // You can optionally pass an expiry time in seconds (e.g., { expire: 600 } for 10 minutes)
        // Default expiry is usually sufficient (e.g., 1 hour)
        const authenticationParameters = imagekit.getAuthenticationParameters();

        // Send the parameters back to the client
        res.status(200).json({
            success: true,
            ...authenticationParameters // Contains token, expire, signature
        });

    } catch (error: any) {
        console.error('Error generating ImageKit authentication parameters:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate upload credentials.',
            error: error.message // Include error message for debugging if desired
        });
    }
};