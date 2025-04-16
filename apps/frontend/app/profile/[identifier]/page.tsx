// app/profile/[identifier]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Menu, Settings } from 'lucide-react'; // Only necessary icons here

// Assuming these are shadcn/ui components, adjust paths if needed
import { Button } from '@/components/ui/button';
import { UserProfileInfo } from '@/components/UserProfileInfo'; // Import the info component
import { UserProfilePosts } from '@/components/userProfilePosts'; // Import the posts component
import { useAuth } from '@/hooks/useAuth'; // Adjust path if needed

// --- Types (Can be imported from shared types) ---
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

// --- Page Container Component ---
function UserProfilePageContainer() {
    const params = useParams();
    const identifier = params?.identifier as string; // Get identifier from URL
    const router = useRouter();
    const { currentUser } = useAuth(); // Only need currentUser to determine isOwnProfile

    // State for fetching profile data within this container
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Fetch Profile Data ---
    const fetchProfileForContainer = useCallback(async () => {
         if (!identifier) { setIsLoadingProfile(false); setError("User identifier missing."); return; }
         console.log(`[PageContainer:fetchProfile] START for identifier: ${identifier}`);
         setIsLoadingProfile(true); setError(null); setProfile(null); // Reset
         try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            // Use the correct endpoint for fetching global profile data
            const res = await fetch(`${backendUrl}/api/user/${identifier}/profile`, { credentials: 'include',method:"GET"});
             if (!res.ok) throw new Error(`User not found or failed to fetch profile (${res.status})`);
             const data = await res.json();
             if (!data.success || !data.data) throw new Error(data.message || 'Failed to load profile data.');
             setProfile(data.data); // Set the fetched profile data
             console.log(`[PageContainer:fetchProfile] SUCCESS for ${identifier}`);
         } catch (err: any) {
            console.error("[PageContainer:fetchProfile] CATCH:", err);
            setError(err.message);
            setProfile(null);
         } finally {
            console.log(`[PageContainer:fetchProfile] FINALLY for ${identifier}`);
            setIsLoadingProfile(false);
         }
    }, [identifier]);

    // Fetch profile on initial load or when identifier changes
    useEffect(() => {
        fetchProfileForContainer();
    }, [fetchProfileForContainer]);

    // Callback for UserProfileInfo to trigger a refetch
    const handleProfileUpdate = () => {
        console.log("[PageContainer] Profile update requested, refetching profile...");
        fetchProfileForContainer(); // Refetch the profile data
    }

    // Determine isOwnProfile after profile and currentUser are loaded
    const isOwnProfile = !!profile && !!currentUser && profile.id === currentUser.id;

    // --- Render Logic ---
    return (
         <div className='py-4 px-2 max-w-4xl mx-auto'>
            {/* Header */}
            <div className='justify-between flex items-center mb-4'>
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft strokeWidth={2.5} className='h-7 w-7' />
                </Button>
                <h1 className="font-semibold text-lg truncate px-2">
                    {isLoadingProfile ? 'Loading...' : (profile?.username || 'Profile')}
                </h1>
                 <div className="text-2xl flex items-center justify-center">
                      {/* Render icons based on loaded profile state */}
                      {!isLoadingProfile && profile && isOwnProfile && (
                           <Button variant="ghost" size="icon" onClick={() => router.push('/profile/edit')}> {/* Or trigger modal */}
                               <Settings strokeWidth={2.5} className='h-7 w-7'/>
                           </Button>
                      )}
                      {!isLoadingProfile && profile && !isOwnProfile && (
                           <Button variant="ghost" size="icon"> {/* Placeholder for menu */}
                               <Menu strokeWidth={2.5} className='h-6 w-6' />
                           </Button>
                       )}
                       {/* Placeholder if loading or error */}
                       {(isLoadingProfile || !profile) && <div className="w-10 h-10" />}
                 </div>
            </div>

             {/* Profile Info Component */}
             <UserProfileInfo
                identifier={identifier}
                profileData={profile} // Pass fetched data
                isLoading={isLoadingProfile} // Pass loading state
                error={error} // Pass error state
                onProfileUpdate={handleProfileUpdate} // Pass refetch callback
             />

             <hr className="my-4 border-gray-200" />

             {/* Post Grid Component */}
             <div className="mt-1">
                 {/* Render posts only if profile loaded successfully and identifier is available */}
                 {!isLoadingProfile && profile ? (
                     <UserProfilePosts
                        identifier={identifier} // Pass identifier from URL
                        profileUsername={profile.username} // Pass username for alt text
                        isOwnProfile={isOwnProfile}
                     />
                 ) : isLoadingProfile ? (
                     <div className="flex justify-center mt-10"><Loader2 className="h-8 w-8 animate-spin text-[#ff0050]" /></div>
                 ) : (
                     // Don't render posts if profile failed to load
                     <p className="text-center text-neutral-500 mt-10">Could not load posts.</p>
                 )}
            </div>
        </div>
    );
}

export default UserProfilePageContainer;