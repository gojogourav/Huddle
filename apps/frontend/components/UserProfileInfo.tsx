// src/components/UserProfileInfo.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
    Share, UserPlus, UserCheck, Loader2, Settings, Save, XCircle, X, ImagePlus
} from 'lucide-react';
import Link from 'next/link';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// Assuming these are shadcn/ui components, adjust paths if needed
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Correctly import ALL necessary form components from shadcn/ui
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth'; // Adjust path if needed

// --- Types ---
interface ProfileData {
    id: string;
    username: string;
    email: string;
    name: string | null;
    profilePic: string | null;
    bio: string | null;
    createdAt: string;
    _count: { posts: number; followers: number; following: number; };
}
interface ImageKitAuthParams { token: string; expire: number; signature: string; }

// --- Zod Schema for Editable Fields ---
const editProfileSchema = z.object({
    name: z.string().max(50, "Name cannot exceed 50 characters.").trim().optional(),
    bio: z.string().max(160, "Bio cannot exceed 160 characters.").trim().optional(),
});
type EditProfileFormValues = z.infer<typeof editProfileSchema>;

// --- Helper: Fetch ImageKit Auth Params ---
async function getImageKitAuthParams(): Promise<ImageKitAuthParams> {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const response = await fetch(`${backendUrl}/api/utils/imagekit-auth`, { credentials: 'include' });
        if (!response.ok) { const d = await response.json().catch(() => ({})); throw new Error(d.message || `Auth Params Fetch Failed (${response.status})`); }
        const authData = await response.json();
        if (!authData.success || !authData.token || !authData.expire || !authData.signature) throw new Error("Invalid auth params received.");
        return authData;
    } catch (error) { console.error("[ImageKit] Fetch Auth Error:", error); throw error; }
}

// ========================================================================
// --- Integrated ImageKitUpload Component ---
// ========================================================================
interface ImageKitUploadProps {
    onUploadSuccess: (result: { url: string; fileId: string }) => void;
    onUploadError: (error: Error) => void;
    folder?: string;
    currentImageUrl?: string | null;
    disabled?: boolean;
    profileUsername?: string;
}

function ImageKitUpload({
    onUploadSuccess, onUploadError, folder = "/profile-pictures", currentImageUrl,
    disabled = false, profileUsername = '?',
}: ImageKitUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to sync preview with external prop changes
    useEffect(() => { setPreviewUrl(currentImageUrl ?? null); }, [currentImageUrl]);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; if (!file || isUploading) return;
        setIsUploading(true); setUploadError(null); onUploadError(new Error()); // Clear parent error
        const localPreviewUrl = URL.createObjectURL(file); setPreviewUrl(localPreviewUrl);
        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        if (!publicKey) { const e = new Error("ImageKit Key missing"); setUploadError(e.message); setIsUploading(false); URL.revokeObjectURL(localPreviewUrl); setPreviewUrl(currentImageUrl ?? null); onUploadError(e); if (fileInputRef.current) fileInputRef.current.value = ""; return; }
        try {
            const { signature, expire, token } = await getImageKitAuthParams();
            const formData = new FormData();
            formData.append('file', file); formData.append('fileName', file.name); formData.append('publicKey', publicKey);
            formData.append('folder', folder); formData.append('signature', signature); formData.append('expire', expire.toString());
            formData.append('token', token); formData.append('useUniqueFileName', 'true');
            const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: formData });
            const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Upload failed');
            setPreviewUrl(result.url); onUploadSuccess({ url: result.url, fileId: result.fileId }); URL.revokeObjectURL(localPreviewUrl);
        } catch (err: any) {
            const errorMsg = err.message || "Upload failed."; setUploadError(errorMsg);
            setPreviewUrl(currentImageUrl ?? null); onUploadError(err instanceof Error ? err : new Error(errorMsg)); URL.revokeObjectURL(localPreviewUrl);
        } finally {
            setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = "";
        }
    // Dependencies need to be stable or included
    }, [onUploadSuccess, onUploadError, folder, currentImageUrl, isUploading]); // Removed unstable internal setters

    const triggerFileInput = () => { if (!isUploading && !disabled) fileInputRef.current?.click(); };

    // Using the avatar_overlay variant logic directly here
    return (
        <div
            className={`relative group w-full h-full ${isUploading || disabled ? 'opacity-70' : 'cursor-pointer'}`} // Adjust opacity when disabled/uploading
            onClick={triggerFileInput}
            title={disabled ? "" : isUploading ? "Uploading..." : "Click to change image"}
        >
            {/* Hidden file input */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} disabled={isUploading || disabled} />
            {/* Avatar Display */}
            <Avatar className="h-full w-full border-2">
                <AvatarImage src={previewUrl || '/default-avatar.png'} alt="Profile picture" key={previewUrl} />
                <AvatarFallback className="text-4xl">{profileUsername?.substring(0, 1).toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            {/* Overlay shown on hover (when not uploading) or always if uploading */}
            {!disabled && ( // Only show overlay interaction if not disabled
                 <div className={`absolute inset-0 flex items-center justify-center bg-black/40 rounded-full transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}`}>
                    {isUploading ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <ImagePlus className="h-8 w-8 text-white" />}
                </div>
            )}
            {/* Internal Upload Error Display */}
            {uploadError && <p className="absolute -bottom-5 left-0 right-0 text-red-600 text-xs p-1 text-center truncate" title={uploadError}>{uploadError}</p>}
        </div>
    );
}
// --- End of ImageKitUpload ---


// ============================================================
// --- User Profile Info Component Definition ---
// ============================================================
interface UserProfileInfoProps {
    identifier: string;
    profileData: ProfileData | null;
    isLoading: boolean; // Loading state from parent (for profile fetch)
    error: string | null; // Error state from parent (for profile fetch)
    onProfileUpdate?: () => void; // Callback for parent to refetch profile
}

export function UserProfileInfo({
    identifier,
    profileData,
    isLoading: isLoadingProfileProp, // Rename parent prop
    error: errorProp,
    onProfileUpdate
}: UserProfileInfoProps) {

    const { currentUser, refetchUser } = useAuth();

    // --- Internal State Management ---
    // Derived state for profile, ensures it updates when prop changes
    const profile = profileData;
    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editModeProfilePicUrl, setEditModeProfilePicUrl] = useState<string | null>(profileData?.profilePic ?? null);

    // Action-specific loading/error states
    const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null); // Save/Follow errors
    const [uploadErrorState, setUploadErrorState] = useState<string | null>(null); // Upload specific error

    // Calculate derived state
    const isOwnProfile = !!profile && !!currentUser && profile.id === currentUser.id;

    // --- React Hook Form ---
    const form = useForm<EditProfileFormValues>({
        resolver: zodResolver(editProfileSchema),
        // Initial values set via reset in useEffect
        defaultValues: { name: '', bio: '' }
    });
    const { control, handleSubmit, reset, formState: { errors: formErrors } } = form;

    // --- Effect to Reset Form and Pic URL when Profile Data Changes ---
    useEffect(() => {
        if (profile) {
            reset({ name: profile.name || '', bio: profile.bio || '' });
            setEditModeProfilePicUrl(profile.profilePic || null);
            // If profile identifier changes, ensure edit mode is off
            if (identifier !== profile.username && identifier !== profile.id) {
                 setIsEditing(false);
            }
        } else {
            // Clear form if profile becomes null
            reset({ name: '', bio: '' });
            setEditModeProfilePicUrl(null);
        }
     // Add identifier to reset form if navigating between profiles
    }, [profile, reset, identifier]);


    // --- Fetch Follow Status ---
    const fetchFollowStatus = useCallback(async (targetUserId: string) => {
        if (!currentUser || targetUserId === currentUser?.id) { setIsFollowing(false); setIsLoadingFollowStatus(false); return; };
        setIsLoadingFollowStatus(true);
        try {
             const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
             const res = await fetch(`${backendUrl}/api/user/${targetUserId}/is-following`, { credentials: 'include', cache: 'no-store' });
             if (!res.ok) throw new Error(`Status check failed (${res.status})`);
             const data = await res.json();
             if (!data.success) throw new Error(data.message || 'Check failed');
             setIsFollowing(data.isFollowing);
        } catch (err: any) { console.error("[fetchFollowStatus] CATCH:", err); setIsFollowing(null); }
        finally { setIsLoadingFollowStatus(false); }
    }, [currentUser]);

    // Fetch follow status when the profile ID is available
    useEffect(() => {
        if (profile?.id) {
            fetchFollowStatus(profile.id);
        } else {
             setIsFollowing(null);
        }
    }, [profile?.id, fetchFollowStatus]); // Depend only on profile ID


    // --- Action Handlers ---
    const handleFollowToggle = async () => {
         if (!profile || !currentUser || isOwnProfile || followLoading || isFollowing === null) return;
         setFollowLoading(true); setActionError(null);
         const originalFollowState = isFollowing;
         setIsFollowing(!originalFollowState);
         try {
             const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
             const res = await fetch(`${backendUrl}/api/user/follow/${profile.id}`, { method: 'POST', credentials: 'include' });
             const data = await res.json();
             if (!res.ok || !data.success) throw new Error(data.message || 'Failed');
             setIsFollowing(data.action === 'followed user');
             if (onProfileUpdate) onProfileUpdate(); // Notify parent to refetch counts
         } catch (err: any) {
             setActionError(err.message || "Follow toggle failed.");
             setIsFollowing(originalFollowState);
         } finally {
             setFollowLoading(false);
         }
    };

    const handleEditToggle = () => {
        if (!isOwnProfile) return;
        const newState = !isEditing;
        setIsEditing(newState);
        setActionError(null); setUploadErrorState(null);
        if (newState && profile) {
             // Reset form just in case values were changed but not saved
             reset({ name: profile.name || '', bio: profile.bio || '' });
             setEditModeProfilePicUrl(profile.profilePic || null);
        }
    };

    const handleUploadSuccess = (result: { url: string; fileId: string }) => {
        setEditModeProfilePicUrl(result.url);
        setUploadErrorState(null);
    };
    const handleUploadError = (errorInstance: Error) => {
         setUploadErrorState(`Image Upload Failed: ${errorInstance.message}.`);
         // Revert edit state URL to the original profile pic when upload fails
         setEditModeProfilePicUrl(profile?.profilePic || null);
    };

    // Profile Update Submission
    const handleUpdateProfile = async (formData: EditProfileFormValues) => {
        if (!isOwnProfile || !currentUser || !profile) return;
        setIsSaving(true); setActionError(null); setUploadErrorState(null);
        try {
            const submissionData = {
                name: formData.name, bio: formData.bio,
                username: profile.username, email: profile.email, // Non-editable data included if needed by backend
                profilePic: editModeProfilePicUrl,
            };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/user/profile`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(submissionData),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update.');

            await refetchUser(); // Update global context
            if (onProfileUpdate) onProfileUpdate(); // Tell parent to refetch
            setIsEditing(false); // Exit edit mode

        } catch (err: any) { setActionError(err.message || "Failed to save."); }
        finally { setIsSaving(false); }
    };


    // --- Render Logic ---
    if (isLoadingProfileProp) { // Use loading state from props
         return <div className="flex items-center justify-center p-10"><Loader2 className="h-12 w-12 animate-spin text-[#ff0050]" /></div>;
    }
    if (errorProp && !profile) { // Use error state from props
        return <div className="text-red-600 p-4 text-center">{errorProp}</div>;
    }
    if (!profile) {
        return <div className="text-neutral-500 p-4 text-center">Profile data unavailable.</div>;
    }

    return (
        // Pass the whole form object via the Form Provider
        <Form {...form}>
            {/* The actual HTML form element */}
            <form onSubmit={handleSubmit(handleUpdateProfile)} className="space-y-4">
                {/* Profile Info Row */}
                <div className='flex items-center mt-2 px-2 py-4'>
                    {/* Avatar/Uploader */}
                    <div className='w-24 h-24 md:w-32 md:h-32 flex-shrink-0 mr-4'>
                        {isEditing ? (
                            <ImageKitUpload
                                onUploadSuccess={handleUploadSuccess}
                                onUploadError={handleUploadError}
                                currentImageUrl={editModeProfilePicUrl}
                                disabled={isSaving} // Disable during save
                                profileUsername={profile.username}
                            />
                        ) : (
                            <Avatar className="h-full w-full border-2">
                                <AvatarImage src={profile.profilePic || '/default-avatar.png'} alt={profile.username} />
                                <AvatarFallback className="text-4xl">{profile.username?.substring(0, 1).toUpperCase() || '?'}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>

                    {/* Details Section */}
                    <div className='font-sans flex-1 space-y-1'>
                        {isEditing ? (
                            <>
                                <FormField control={control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder="Name" {...field} disabled={isSaving} className="font-bold text-xl h-8 border-0 border-b rounded-none px-1 focus-visible:ring-0 focus:border-cyan-600 bg-gray-50/50"/>
                                        </FormControl>
                                        <FormMessage className="text-xs text-red-500"/>
                                    </FormItem>
                                )}/>
                                <FormField control={control} name="bio" render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea placeholder="Bio" {...field} disabled={isSaving} className="font-semibold text-sm h-16 border-0 border-b rounded-none px-1 resize-none focus-visible:ring-0 focus:border-cyan-600 bg-gray-50/50"/>
                                        </FormControl>
                                        <FormMessage className="text-xs text-red-500"/>
                                    </FormItem>
                                )}/>
                                <div className='text-neutral-400 text-sm pt-1'>@{profile.username}</div>
                            </>
                        ) : (
                            <>
                                <div className='font-bold text-xl'>{profile.name || profile.username}</div>
                                {profile.bio && <div className='font-semibold text-sm'>{profile.bio}</div>}
                                <div className='text-neutral-400 text-sm'>@{profile.username}</div>
                            </>
                        )}

                        {/* Stats - Links disabled during edit */}
                        <div className="flex space-x-4 text-sm pt-2">
                             <div><span className="font-bold">{profile._count.posts}</span> posts</div>
                            <Link href={isEditing ? '#' : `/profile/${identifier}/followers`} className={isEditing ? 'text-gray-400 pointer-events-none' : 'hover:underline'} aria-disabled={isEditing}><span className="font-bold">{profile._count.followers}</span> followers</Link>
                            <Link href={isEditing ? '#' : `/profile/${identifier}/following`} className={isEditing ? 'text-gray-400 pointer-events-none' : 'hover:underline'} aria-disabled={isEditing}><span className="font-bold">{profile._count.following}</span> following</Link>
                        </div>

                         {/* Buttons Section */}
                        <div className='pt-3 flex items-center space-x-2'>
                            {isOwnProfile ? (
                                isEditing ? ( // Save/Cancel Buttons
                                    <>
                                        <Button type="submit" size="sm" className="flex-grow h-9 text-sm bg-cyan-600 hover:bg-cyan-700 text-white" disabled={isSaving /* || isUploading - upload handled internally now */}>
                                            {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" className="flex-grow h-9 text-sm text-gray-700 hover:bg-gray-100" onClick={handleEditToggle} disabled={isSaving /* || isUploading*/}>
                                            <XCircle className="mr-1 h-4 w-4" /> Cancel
                                        </Button>
                                    </>
                                ) : ( // Original Edit/Share Buttons
                                    <>
                                        <div className='bg-cyan-600 h-9 w-full font-bold text-sm items-center justify-center content-center flex rounded-lg p-2 text-white cursor-pointer hover:bg-cyan-700' onClick={handleEditToggle}>
                                            Edit profile
                                        </div>
                                        <div className='cursor-pointer ml-3 flex-shrink-0'>
                                            {/* TODO: Implement share functionality */}
                                            <Share strokeWidth={2.5} className='h-6 w-6 text-cyan-600' />
                                        </div>
                                    </>
                                )
                            ) : ( // Follow Button
                                <Button type="button" variant={isFollowing ? "outline" : "default"} size="sm" className={`w-full h-9 text-sm ${isFollowing ? 'border-gray-300' : 'bg-[#ff0050] hover:bg-black text-white'}`} onClick={handleFollowToggle} disabled={followLoading || isLoadingFollowStatus || isFollowing === null}>
                                     {followLoading || isLoadingFollowStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : isFollowing ? <><UserCheck className="mr-1 h-4 w-4" /> Following</> : <><UserPlus className="mr-1 h-4 w-4" /> Follow</>}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Display Form/Upload/Save Errors Below Buttons, inside <form> */}
                 {(formErrors.name || formErrors.bio || actionError || uploadErrorState ) && isEditing && (
                     <div className="px-2 pt-0 pb-2 text-sm text-center font-medium text-red-600">
                         {actionError || uploadErrorState || formErrors.name?.message || formErrors.bio?.message}
                     </div>
                 )}
            </form>
        </Form> // <-- CLosing Form tag
    );
}