// app/profile/[identifier]/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
    ArrowLeft, Menu, Share, UserPlus, UserCheck, Loader2, Settings, Save, XCircle, X, ImagePlus
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// Assuming these are shadcn/ui components, adjust paths if needed
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth'; // Adjust path if needed

// --- Reusable ImageKitUpload Component (Integrated for simplicity) ---

interface ImageKitUploadProps {
    onUploadSuccess: (result: { url: string; fileId: string }) => void;
    onUploadError: (error: Error) => void;
    folder?: string;
    currentImageUrl?: string | null;
    variant?: 'button' | 'avatar_overlay';
    disabled?: boolean; // To disable during save/upload
}

interface ImageKitAuthParams { token: string; expire: number; signature: string; }

async function getImageKitAuthParams(): Promise<ImageKitAuthParams> {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const response = await fetch(`${backendUrl}/api/utils/imagekit-auth`, { credentials: 'include' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to fetch auth params (${response.status})`);
        }
        const authData = await response.json();
        if (!authData.success || !authData.token || !authData.expire || !authData.signature) {
             throw new Error("Invalid authentication parameters received from server.");
        }
        return authData;
    } catch (error) {
        console.error("[ImageKit] Failed to fetch Auth Params:", error);
        throw error;
    }
}

function ImageKitUpload({
    onUploadSuccess,
    onUploadError,
    folder = "/profile-pictures", // Sensible default for profile
    currentImageUrl,
    variant = 'avatar_overlay', // Default to avatar style for profile page context
    disabled = false, // Parent component can disable it
}: ImageKitUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null); // Internal error state
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { // Keep preview in sync with external prop
        setPreviewUrl(currentImageUrl ?? null);
    }, [currentImageUrl]);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isUploading) return; // Prevent upload if already uploading

        setIsUploading(true); setUploadError(null); onUploadError(new Error()); // Clear parent error too?
        const localPreviewUrl = URL.createObjectURL(file);
        setPreviewUrl(localPreviewUrl);

        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        if (!publicKey) { /* ... error handling ... */ setUploadError("ImageKit Key missing"); setIsUploading(false); URL.revokeObjectURL(localPreviewUrl); setPreviewUrl(currentImageUrl ?? null); onUploadError(new Error("ImageKit Key missing")); return; }

        try {
            const { signature, expire, token } = await getImageKitAuthParams();
            const formData = new FormData();
            formData.append('file', file); formData.append('fileName', file.name); formData.append('publicKey', publicKey);
            formData.append('folder', folder); formData.append('signature', signature); formData.append('expire', expire.toString());
            formData.append('token', token); formData.append('useUniqueFileName', 'true');

            const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Upload failed');

            setPreviewUrl(result.url); // Keep internal preview updated
            onUploadSuccess({ url: result.url, fileId: result.fileId }); // Notify parent with final URL
            URL.revokeObjectURL(localPreviewUrl);
        } catch (err: any) {
            console.error("Upload Error:", err);
            const errorMsg = err.message || "Upload failed.";
            setUploadError(errorMsg); // Show internal error
            setPreviewUrl(currentImageUrl ?? null); // Revert internal preview
            onUploadError(err instanceof Error ? err : new Error(errorMsg)); // Notify parent
            URL.revokeObjectURL(localPreviewUrl);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [onUploadSuccess, onUploadError, folder, currentImageUrl, isUploading]); // Add isUploading

    const triggerFileInput = () => { if (!isUploading && !disabled) fileInputRef.current?.click(); };
    const removePreview = (e: React.MouseEvent<HTMLButtonElement>) => { // Added event arg
        e.stopPropagation(); // Prevent triggering the main div click
        setPreviewUrl(null); setUploadError(null);
        onUploadSuccess({ url: '', fileId: '' }); // Signal removal
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Render based on variant
    if (variant === 'avatar_overlay') {
        return (
            <div
                className={`relative group w-24 h-24 md:w-32 md:h-32 ${isUploading || disabled ? '' : 'cursor-pointer'}`}
                onClick={triggerFileInput}
                title={disabled ? "" : isUploading ? "Uploading..." : "Click to change image"}
            >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} disabled={isUploading || disabled}/>
                <Avatar className="h-full w-full border-2">
                    <AvatarImage src={previewUrl || '/default-avatar.png'} alt="Profile picture" key={previewUrl} />
                    <AvatarFallback>{/* Fallback needed */}</AvatarFallback>
                </Avatar>
                {/* Overlay */}
                <div className={`absolute inset-0 flex items-center justify-center bg-black/40 rounded-full transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}`}>
                    {isUploading ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <ImagePlus className="h-8 w-8 text-white" />}
                </div>
                {/* Display internal upload error */}
                {uploadError && <p className="absolute bottom-0 left-0 right-0 bg-red-500/80 text-white text-xs p-1 text-center truncate">{uploadError}</p>}
            </div>
        );
    }

    // Default 'button' variant (kept for potential other uses)
    return (
        <div className="border border-gray-300 rounded-lg p-4 text-center">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} disabled={isUploading || disabled}/>
             {previewUrl ? (
                 <div className="relative group inline-block mb-2">
                     <Image src={previewUrl} alt="Preview" width={200} height={200} className="object-contain rounded-lg mx-auto max-h-48"/>
                      <button type="button" onClick={removePreview} disabled={isUploading || disabled} className="absolute -top-2 -right-2 ..."><X size={14}/></button>
                 </div>
             ) : (
                <Button type="button" variant="outline" onClick={triggerFileInput} disabled={isUploading || disabled} className="w-full h-32 ...">
                     {isUploading ? <><Loader2/>Uploading...</> : <><ImagePlus/>Click to upload</>}
                 </Button>
             )}
             {uploadError && <p className="text-red-600 text-sm mt-2">{uploadError}</p>}
        </div>
    );
}


// --- Profile Page Types (Keep as defined before) ---
interface ProfilePost { id: string; url: string; }
interface ProfileData { /* ... */ id: string; username: string; email: string; name: string | null; profilePic: string | null; bio: string | null; createdAt: string; _count: { posts: number; followers: number; following: number; }; }
interface FetchPostsResponse { /* ... */ success: boolean; posts: ProfilePost[]; pagination?: any; message?: string; }

// --- Zod Schema for Editable Fields (Keep as defined before) ---
const editProfileSchema = z.object({
    name: z.string().max(50, "Name too long").trim().optional(),
    bio: z.string().max(160, "Bio too long").trim().optional(),
});
type EditProfileFormValues = z.infer<typeof editProfileSchema>;


// --- The Main Profile Page Component ---
function UserProfilePage() {
    const router = useRouter();
    const params = useParams();
    const identifier = params?.identifier as string;
    const { currentUser, isLoading: authLoading, refetchUser } = useAuth();

    // --- State ---
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [posts, setPosts] = useState<ProfilePost[]>([]);
    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editModeProfilePicUrl, setEditModeProfilePicUrl] = useState<string | null>(null); // State for the *potential* new pic URL

    // Loading States
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    // Removed isUploading state here, managed internally by ImageKitUpload

    // Error States
    const [error, setError] = useState<string | null>(null); // General page/action errors
    // Removed uploadError state here, ImageKitUpload handles its own display

    const isOwnProfile = !!profile && !!currentUser && profile.id === currentUser.id;

    // --- React Hook Form ---
    const { control, handleSubmit, reset, formState: { errors: formErrors } } = useForm<EditProfileFormValues>({
        resolver: zodResolver(editProfileSchema),
        defaultValues: { name: '', bio: '' }
    });

    // --- Data Fetching Callbacks ---
    const fetchProfile = useCallback(async () => {
         if (!identifier) { setIsLoadingProfile(false); return; }
         console.log(`[fetchProfile] START for identifier: ${identifier}`);
         setIsLoadingProfile(true); setError(null); setProfile(null);
         try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            // ** Backend MUST select 'email' and 'profilePic' for this endpoint **
            const res = await fetch(`${backendUrl}/api/user/${identifier}/profile`, { credentials: 'include', cache: 'no-store' });
             if (!res.ok) throw new Error('User not found or failed to fetch profile.');
             const data = await res.json();
             if (!data.success) throw new Error(data.message || 'Failed to load profile.');
             setProfile(data.data);
             reset({ name: data.data.name || '', bio: data.data.bio || '' });
             setEditModeProfilePicUrl(data.data.profilePic || null); // Initialize with fetched pic
             console.log(`[fetchProfile] SUCCESS for ${identifier}`);
         } catch (err: any) { console.error("[fetchProfile] CATCH:", err); setError(err.message); setProfile(null); }
         finally { setIsLoadingProfile(false); }
    }, [identifier, reset]);

    const fetchPosts = useCallback(async (userId: string) => {
        console.log(`[fetchPosts] START for userId: ${userId}`);
        setIsLoadingPosts(true);
        try {
             const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
             // Use the CORRECT backend endpoint based on your routes
             // This assumes you created GET /api/user/:identifier/post
             const res = await fetch(`${backendUrl}/api/user/${userId}/post`, { credentials: 'include', cache: 'no-store' });
             if (!res.ok) throw new Error(`Failed to fetch posts (${res.status})`);
             const data = await res.json(); // Backend returns { success: boolean, data: { posts: [] } }
             if (!data.success || !data.data) throw new Error(data.message || 'Failed to load posts data.');
             setPosts(data.data.posts || []); // Extract posts from the 'data' object
             console.log(`[fetchPosts] SUCCESS for ${userId}. Count: ${data.data.posts?.length ?? 0}`);
        } catch (err: any) { console.error("[fetchPosts] CATCH:", err); setPosts([]); }
        finally { setIsLoadingPosts(false); }
    }, []);

    const fetchFollowStatus = useCallback(async (targetUserId: string) => {
        if (!currentUser || targetUserId === currentUser?.id) { setIsFollowing(false); setIsLoadingFollowStatus(false); return; };
        console.log(`[fetchFollowStatus] START for targetUserId: ${targetUserId}`);
        setIsLoadingFollowStatus(true);
        try {
             const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
             // Use CORRECT endpoint GET /api/user/:identifier/is-following
             const res = await fetch(`${backendUrl}/api/user/${targetUserId}/is-following`, { credentials: 'include', cache: 'no-store' });
             if (!res.ok) throw new Error(`Could not check follow status (${res.status})`);
             const data = await res.json();
             if (!data.success) throw new Error(data.message || 'Check failed');
             setIsFollowing(data.isFollowing);
             console.log(`[fetchFollowStatus] SUCCESS for ${targetUserId}. isFollowing: ${data.isFollowing}`);
        } catch (err: any) { console.error("[fetchFollowStatus] CATCH:", err); setIsFollowing(null); }
        finally { setIsLoadingFollowStatus(false); }
    }, [currentUser]);

    // --- Initial Data Load Effects ---
    useEffect(() => { fetchProfile(); }, [fetchProfile]);
    useEffect(() => { if (profile?.id) { fetchPosts(profile.id); fetchFollowStatus(profile.id); } else { setPosts([]); setIsFollowing(null); } }, [profile, fetchPosts, fetchFollowStatus]);

    // --- Action Handlers ---
    const handleFollowToggle = async () => {
         if (!profile || !currentUser || isOwnProfile || followLoading || isFollowing === null) return;
         setFollowLoading(true); setError(null);
         const originalFollowState = isFollowing;
         setIsFollowing(!originalFollowState);
         try {
             const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
             // Use CORRECT endpoint POST /api/user/follow/:targetUserId
             const res = await fetch(`${backendUrl}/api/user/follow/${profile.id}`, { method: 'POST', credentials: 'include' });
             const data = await res.json();
             if (!res.ok || !data.success) throw new Error(data.message || 'Failed');
             setIsFollowing(data.action === 'followed user');
             await fetchProfile(); // Refetch profile for accurate counts after action

         } catch (err: any) {
             setError(err.message || "Could not update follow status.");
             setIsFollowing(originalFollowState); // Revert status
             // Optionally refetch profile even on error to get definite state
             // await fetchProfile();
         } finally {
             setFollowLoading(false);
         }
    };

    const handleEditToggle = () => {
        if (!isOwnProfile) return;
        const newState = !isEditing;
        setIsEditing(newState);
        setError(null);
        if (newState && profile) {
             reset({ name: profile.name || '', bio: profile.bio || '' });
             setEditModeProfilePicUrl(profile.profilePic || null); // Reset edit pic to current profile pic
        }
    };

    // --- Image Upload Specific Handlers passed to ImageKitUpload ---
    const handleUploadSuccess = (result: { url: string; fileId: string }) => {
        setEditModeProfilePicUrl(result.url); // Update the URL to be saved
        setError(null); // Clear general errors if upload succeeds
        // No need to call form.setValue as profilePic isn't in the zod schema
    };
    const handleUploadError = (uploadErrorInstance: Error) => {
         // Error display is handled internally by ImageKitUpload, but we can set general error too
         setError(`Image Upload Failed: ${uploadErrorInstance.message}. Please try again or cancel edit.`);
         // Revert the preview URL in state back to the original profile picture
         setEditModeProfilePicUrl(profile?.profilePic || null);
    };

    // --- Profile Update Submission ---
    const handleUpdateProfile = async (formData: EditProfileFormValues) => {
        if (!isOwnProfile || !currentUser || !profile) return;
        setIsSaving(true); setError(null);
        try {
            const submissionData = {
                name: formData.name,
                bio: formData.bio,
                username: profile.username, // Keep original non-editable fields
                email: profile.email,
                profilePic: editModeProfilePicUrl, // Send URL currently in state
            };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            // Use CORRECT endpoint PUT /api/user/profile
            const response = await fetch(`${backendUrl}/api/user/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(submissionData),
            });
            const data = await response.json();
            if (!response.ok) {
                // Backend might return specific errors (like username taken if it were editable)
                throw new Error(data.message || 'Failed to update profile.');
            }

            await refetchUser(); // Update global auth state
            await fetchProfile(); // Refetch profile data to show saved values
            setIsEditing(false); // Exit edit mode on successful save

        } catch (err: any) {
            setError(err.message || "Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Render Logic ---
    if (isLoadingProfile || authLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-[#ff0050]" /></div>;
    }
    if (!profile) {
        return ( <div className="min-h-screen flex flex-col items-center justify-center p-4"> <p className="text-red-600 text-center mb-4">{error || "User profile could not be loaded."}</p> <Button variant="outline" onClick={() => router.push('/')}>Go Home</Button> </div> );
    }

    return (
        <div className='py-4 px-2 max-w-4xl mx-auto'>
            {/* Header */}
            <div className='justify-between flex items-center mb-4'>
                <Button variant="ghost" size="icon" onClick={() => !isEditing && router.back()} disabled={isEditing || isSaving}>
                    <ArrowLeft strokeWidth={2.5} className='h-6 w-6' />
                </Button>
                <h1 className="font-semibold text-lg truncate px-2">{isEditing ? "Edit Profile" : profile.username}</h1>
                 <div className="w-10 h-10 flex items-center justify-center">
                     {!isEditing && isOwnProfile && ( <Button variant="ghost" size="icon" onClick={handleEditToggle}> <Settings strokeWidth={2.5} className='h-6 w-6'/> </Button> )}
                     {!isEditing && !isOwnProfile && ( <Button variant="ghost" size="icon"> <Menu strokeWidth={2.5} className='h-6 w-6' /> </Button> )}
                     {isEditing && <div className="w-10 h-10" />}
                 </div>
            </div>

            {/* Use form tag wrapping the section that contains submit button */}
            <form onSubmit={handleSubmit(handleUpdateProfile)} className="space-y-4">
                {/* Profile Info Row */}
                <div className='flex items-center mt-2 px-2 py-4'>
                     {/* Avatar/Uploader */}
                     <div className='w-24 h-24 md:w-32 md:h-32 flex-shrink-0 mr-4'>
                         {isEditing ? (
                            // Pass editModeProfilePicUrl and handlers to ImageKitUpload
                            <ImageKitUpload
                                onUploadSuccess={handleUploadSuccess}
                                onUploadError={handleUploadError}
                                currentImageUrl={editModeProfilePicUrl} // URL being edited
                                variant="avatar_overlay"
                                disabled={isSaving} // Disable upload while saving
                            />
                         ) : (
                             <Avatar className="h-full w-full border-2">
                                <AvatarImage src={profile.profilePic || '/default-avatar.png'} alt={profile.username} />
                                <AvatarFallback className="text-4xl">{profile.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                             </Avatar>
                         )}
                     </div>

                    {/* Details Section */}
                    <div className='font-sans flex-1 space-y-1'>
                        {isEditing ? (
                            <>
                                <FormField control={control} name="name" render={({ field }) => ( <FormItem> <FormControl> <Input placeholder="Name" {...field} disabled={isSaving} className="font-bold text-xl h-8 border-0 border-b rounded-none px-1 focus-visible:ring-0 focus:border-cyan-600 bg-gray-50/50"/> </FormControl> <FormMessage className="text-xs text-red-500"/> </FormItem> )}/>
                                <FormField control={control} name="bio" render={({ field }) => ( <FormItem> <FormControl> <Textarea placeholder="Bio" {...field} disabled={isSaving} className="font-semibold text-sm h-16 border-0 border-b rounded-none px-1 resize-none focus-visible:ring-0 focus:border-cyan-600 bg-gray-50/50"/> </FormControl> <FormMessage className="text-xs text-red-500"/> </FormItem> )}/>
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
                            <Link href={isEditing ? '#' : `/profile/${identifier}/followers`} className={isEditing ? 'text-gray-400' : 'hover:underline'} aria-disabled={isEditing}><span className="font-bold">{profile._count.followers}</span> followers</Link>
                            <Link href={isEditing ? '#' : `/profile/${identifier}/following`} className={isEditing ? 'text-gray-400' : 'hover:underline'} aria-disabled={isEditing}><span className="font-bold">{profile._count.following}</span> following</Link>
                        </div>

                         {/* Buttons Section */}
                        <div className='pt-3 flex items-center space-x-2'>
                            {isOwnProfile ? (
                                isEditing ? ( // Save/Cancel Buttons
                                    <>
                                        <Button type="submit" size="sm" className="flex-grow h-9 text-sm bg-cyan-600 hover:bg-cyan-700 text-white" disabled={isSaving ||isLoadingPosts }>
                                            {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" className="flex-grow h-9 text-sm text-gray-700 hover:bg-gray-100" onClick={handleEditToggle} disabled={isSaving || isLoadingPosts}>
                                            <XCircle className="mr-1 h-4 w-4" /> Cancel
                                        </Button>
                                    </>
                                ) : ( // Original Edit/Share Buttons
                                    <>
                                        <div className='bg-cyan-600 h-9 w-full font-bold text-sm items-center justify-center content-center flex rounded-lg p-2 text-white cursor-pointer hover:bg-cyan-700' onClick={handleEditToggle}>
                                            Edit profile
                                        </div>
                                        <div className='cursor-pointer ml-3 flex-shrink-0'>
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

                {/* Display Form/Save Errors within the form */}
                 {(formErrors.name || formErrors.bio || error) && (
                     <div className="px-2 pt-0 pb-2 text-sm text-center font-medium text-red-600">
                          {/* Show only one error for simplicity */}
                         {error || formErrors.name?.message || formErrors.bio?.message}
                     </div>
                 )}
             </form>


            <hr className="my-4 border-gray-200" />

            {/* Post Grid */}
            <div className="mt-1">
                {isLoadingPosts ? (
                    <div className="flex justify-center mt-10"><Loader2 className="h-8 w-8 animate-spin text-[#ff0050]" /></div>
                ) : posts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                         {posts.map((post) => (
                             <Link key={post.id} href={`/post/${post.id}`} className="block aspect-square relative overflow-hidden rounded-lg group">
                                 <Image
                                     src={post.url}
                                     alt={`Post by ${profile.username}`}
                                     fill
                                     className="object-cover transition-transform duration-300 group-hover:scale-105"
                                     sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                     priority={posts.indexOf(post) < 8} // Prioritize loading first few images
                                 />
                             </Link>
                         ))}
                    </div>
                ) : (
                    <p className="text-center text-neutral-500 mt-10">{isOwnProfile ? "Share your first photo!" : `${profile.username} hasn't posted yet.`}</p>
                )}
            </div>
        </div>
    );
}

export default UserProfilePage;