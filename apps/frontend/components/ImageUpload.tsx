// components/ImageKitUpload.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, X, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button'; // Adjust path if needed
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';

// Define the shape of the props expected by the component
interface ImageKitUploadProps {
    /** Callback function triggered on successful upload. Receives { url, fileId }. */
    onUploadSuccess: (result: { url: string; fileId: string }) => void;
    /** Callback function triggered on upload error. Receives the Error object. */
    onUploadError: (error: Error) => void;
    /** Optional: Specify the folder path in ImageKit where the file should be uploaded. Defaults to "/uploads". */
    folder?: string;
    /** Optional: The URL of an image already uploaded, used for initial display and reverting on error. */
    currentImageUrl?: string | null;
    /** Optional: Control the visual style (e.g., button-like or overlay for avatar). */
    variant?: 'button' | 'avatar_overlay'; // Example variants
}

// Define the shape of the authentication parameters expected from the backend
interface ImageKitAuthParams {
    token: string;
    expire: number;
    signature: string;
}

// Function to fetch secure authentication parameters from YOUR backend API
// This function encapsulates the call to your server, which securely generates the credentials
async function getImageKitAuthParams(): Promise<ImageKitAuthParams> {
    try {
        // Use environment variable for backend URL, fallback to localhost for development
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const apiEndpoint = `${backendUrl}/api/utils/imagekit-auth`; // Your dedicated endpoint

        console.log(`Fetching ImageKit auth params from: ${apiEndpoint}`);

        // Include 'credentials: include' to send necessary cookies (like session/JWT tokens)
        // to your backend for authentication before generating ImageKit params.
        const response = await fetch(apiEndpoint, {
            method: 'GET', // Assuming GET request for auth params
            credentials: 'include',
            cache: 'no-store', // Ensure fresh params are always fetched
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Try parsing error JSON
            console.error("Backend response not OK:", response.status, errorData);
            throw new Error(errorData.message || `Failed to fetch ImageKit auth params (${response.status})`);
        }

        const authData = await response.json();

        // Validate the structure of the response from your backend
        if (!authData.success || !authData.token || !authData.expire || !authData.signature) {
             console.error("Invalid auth params received:", authData);
             throw new Error("Invalid authentication parameters received from server.");
        }

        console.log("Successfully fetched ImageKit auth params.");
        return {
            token: authData.token,
            expire: authData.expire,
            signature: authData.signature,
        };
    } catch (error) {
        // Log the error and re-throw it so the caller can handle it
        console.error("Failed to fetch ImageKit Auth Params:", error);
        throw error;
    }
}

// --- The Reusable Image Upload Component ---
export function ImageKitUpload({
    onUploadSuccess,
    onUploadError,
    folder = "/uploads", // Default folder in ImageKit
    currentImageUrl,
    variant = 'button', // Default variant style
}: ImageKitUploadProps) {

    // --- State Variables ---
    const [isUploading, setIsUploading] = useState(false); // Tracks if upload is in progress
    const [error, setError] = useState<string | null>(null); // Stores upload/fetch error messages
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null); // Holds URL for image preview (local blob or final URL)
    const fileInputRef = useRef<HTMLInputElement>(null); // Reference to the hidden file input element

    // --- Effect to update preview if the external currentImageUrl changes ---
    useEffect(() => {
        setPreviewUrl(currentImageUrl ?? null);
    }, [currentImageUrl]);

    // --- Callback function to handle file selection and upload ---
    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return; // Exit if no file selected

        setIsUploading(true);
        setError(null); // Clear previous errors
        setError(null); // Clear upload-specific error if re-trying

        // Create a temporary local URL for immediate preview
        const localPreviewUrl = URL.createObjectURL(file);
        setPreviewUrl(localPreviewUrl);

        // Get the public key from client-side environment variables
        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        if (!publicKey) {
            const errMsg = "ImageKit public key (NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY) is not configured.";
            console.error(errMsg);
            setError(errMsg);
            setIsUploading(false);
            onUploadError(new Error(errMsg));
            URL.revokeObjectURL(localPreviewUrl); // Clean up blob URL
            setPreviewUrl(currentImageUrl ?? null); // Revert preview
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
            return;
        }

        try {
            // 1. Fetch secure authentication parameters from *your* backend
            console.log("Requesting auth params...");
            const { signature, expire, token } = await getImageKitAuthParams();
            console.log("Auth params received.");

            // 2. Prepare FormData for direct upload to ImageKit's API
            const formData = new FormData();
            formData.append('file', file); // The actual image file
            formData.append('fileName', file.name); // Use the original filename
            formData.append('publicKey', publicKey); // Your public API key
            formData.append('folder', folder); // Target folder in ImageKit
            formData.append('signature', signature); // The generated signature from backend
            formData.append('expire', expire.toString()); // Expiry timestamp from backend
            formData.append('token', token); // Unique token from backend
            formData.append('useUniqueFileName', 'true'); // Recommended: prevents overwriting files with same name

            // 3. Upload the file directly to ImageKit
            console.log("Uploading to ImageKit...");
            const imageKitUploadUrl = 'https://upload.imagekit.io/api/v1/files/upload';
            const response = await fetch(imageKitUploadUrl, {
                method: 'POST',
                body: formData,
                // Note: No 'credentials: include' needed for this external API call
            });

            const result = await response.json();
            console.log("ImageKit upload response status:", response.status);

            if (!response.ok) {
                // ImageKit usually provides error details in 'message'
                console.error("ImageKit upload failed:", result);
                throw new Error(result.message || `ImageKit upload failed (${response.status})`);
            }

            // 4. Handle Successful Upload
            console.log("ImageKit upload successful:", result);
            setPreviewUrl(result.url); // Update preview state with the final, permanent URL
            onUploadSuccess({ url: result.url, fileId: result.fileId }); // Notify parent component
            URL.revokeObjectURL(localPreviewUrl); // Clean up the temporary blob URL

        } catch (err: any) {
            // 5. Handle Errors (auth fetch or upload)
            console.error("ImageKit Upload Process Error:", err);
            const errorMsg = err.message || "Upload failed. Please try again.";
            setError(errorMsg); // Set general error state for display
            setError(errorMsg); // Set specific upload error if needed by parent
            setPreviewUrl(currentImageUrl ?? null); // Revert preview back to original image on error
            onUploadError(err instanceof Error ? err : new Error(errorMsg)); // Notify parent
            URL.revokeObjectURL(localPreviewUrl); // Clean up blob URL on error
        } finally {
            // 6. Cleanup: Always stop loading and reset file input
            setIsUploading(false);
            // Reset file input value to allow selecting the same file again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }, [onUploadSuccess, onUploadError, folder, currentImageUrl]); // Include dependencies

    // --- Helper function to programmatically click the hidden file input ---
    const triggerFileInput = () => {
        // Prevent triggering if an upload is already in progress
        if (!isUploading) {
            fileInputRef.current?.click();
        }
    };

    // --- Helper function to remove the preview/current image ---
    const removePreview = () => {
        setPreviewUrl(null);
        setError(null);
        setError(null);
        // Signal removal to parent by sending empty strings (or nulls)
        onUploadSuccess({ url: '', fileId: '' });
        // Reset the file input so the same file can be re-selected
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // --- Render Component ---
    return (
        <div>
            {/* Hidden file input element, controlled via ref */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/gif,image/jpg,image/webp" // Define acceptable image types
                style={{ display: 'none' }} // Keep it hidden
                disabled={isUploading} // Disable while uploading
            />

            {/* Render based on selected variant */}
            {variant === 'avatar_overlay' ? (
                 <div
                    className={`relative group w-24 h-24 md:w-32 md:h-32 ${isUploading ? '' : 'cursor-pointer'}`} // Adjust size as needed
                    onClick={triggerFileInput}
                    title={isUploading ? "Uploading..." : "Click to change image"}
                >
                     <Avatar className="h-full w-full border-2">
                         <AvatarImage src={previewUrl || '/default-avatar.png'} alt="Profile picture preview" key={previewUrl} />
                         <AvatarFallback>{/* Add fallback text/icon */}</AvatarFallback>
                     </Avatar>
                     {/* Overlay shown on hover (when not uploading) or always if uploading */}
                     <div className={`absolute inset-0 flex items-center justify-center bg-black/50 rounded-full transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                         {isUploading ? (
                             <Loader2 className="h-8 w-8 text-white animate-spin" />
                         ) : (
                              <ImagePlus className="h-8 w-8 text-white" />
                         )}
                     </div>
                 </div>
            ) : ( // Default 'button' variant
                 <div className="border border-gray-300 rounded-lg p-4 text-center">
                     {previewUrl ? (
                        // Display preview image and remove button
                        <div className="relative group inline-block mb-2">
                            <Image
                                src={previewUrl}
                                alt="Upload preview"
                                width={200} // Adjust preview size as needed
                                height={200}
                                className="object-contain rounded-lg mx-auto max-h-48"
                            />
                            {/* Remove Button */}
                            <button
                                type="button"
                                onClick={removePreview}
                                disabled={isUploading}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 leading-none shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                aria-label="Remove image"
                            >
                                <X size={14} strokeWidth={3}/>
                            </button>
                        </div>
                     ) : (
                        // Display the upload trigger button
                        <Button
                            type="button"
                            variant="outline"
                            onClick={triggerFileInput}
                            disabled={isUploading}
                            className="w-full h-32 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed hover:border-[#ff0050] hover:text-[#ff0050]"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <ImagePlus className="h-8 w-8 mb-2" />
                                    <span>Click to upload image</span>
                                </>
                            )}
                        </Button>
                     )}
                 </div>
            )}

            {/* Display general errors below the upload area */}
            {error && <p className="text-red-600 text-sm mt-2 text-center">{error}</p>}
            {/* Display upload-specific errors if needed (often same as general error) */}
            {/* {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>} */}
        </div>
    );
}