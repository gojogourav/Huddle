// components/UserProfilePosts.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

// --- Types ---
interface ProfilePost { id: string; url: string; text?: string; }
// Type based on the provided fetchUserPosts backend controller response
interface FetchPostsBackendResponse {
    success: boolean;
    data?: {
        _count?: { posts: number; };
        posts: ProfilePost[];
    };
    message?: string;
}

interface UserProfilePostsProps {
    identifier: string; // Username or ID to fetch posts for
    profileUsername: string | undefined; // Username for alt text (can be undefined initially)
    isOwnProfile: boolean; // To customize messages
}

export function UserProfilePosts({ identifier, profileUsername = 'user', isOwnProfile }: UserProfilePostsProps) {
    const [posts, setPosts] = useState<ProfilePost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [postsError, setPostsError] = useState<string | null>(null);

    // --- Fetch Posts ---
    const fetchPosts = useCallback(async () => {
        // Don't fetch if identifier isn't set yet by the parent
        if (!identifier) {
             console.log("[UserProfilePosts] No identifier provided yet.");
             setIsLoadingPosts(false); // Ensure loading stops if no identifier
             return;
         }
        console.log(`[UserProfilePosts:fetchPosts] START for identifier: ${identifier}`);
        setIsLoadingPosts(true); setPostsError(null); setPosts([]); // Reset
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            // Use the correct endpoint: GET /api/user/:identifier/post
            const res = await fetch(`${backendUrl}/api/user/${identifier}/post`, { credentials: 'include', cache: 'no-store' });
            console.log(`[UserProfilePosts:fetchPosts] Response Status: ${res.status}`);
            if (!res.ok) throw new Error(`Failed to fetch posts (${res.status})`);
            const data: FetchPostsBackendResponse = await res.json();
            console.log(`[UserProfilePosts:fetchPosts] Data Received:`, data);
            if (!data.success || !data.data) throw new Error(data.message || 'Failed to load posts data.');
            setPosts(data.data.posts || []);
            console.log(`[UserProfilePosts:fetchPosts] SUCCESS. Count: ${data.data.posts?.length ?? 0}`);
        } catch (err: any) {
            console.error("[UserProfilePosts:fetchPosts] CATCH:", err);
            setPostsError(err.message || "Could not load posts.");
            setPosts([]);
        } finally {
             console.log(`[UserProfilePosts:fetchPosts] FINALLY. Setting loading false.`);
            setIsLoadingPosts(false);
        }
    }, [identifier]); // Depend only on identifier

    // --- Initial Load Effect ---
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]); // Re-fetch when identifier changes (via fetchPosts identity change)

    // --- Render Logic ---
    if (isLoadingPosts) {
        return <div className="flex justify-center mt-10"><Loader2 className="h-8 w-8 animate-spin text-[#ff0050]" /></div>;
    }

    if (postsError) {
         return <p className="text-center text-red-600 mt-10">{postsError}</p>;
    }

    if (posts.length === 0) {
         return <p className="text-center text-neutral-500 mt-10">{isOwnProfile ? "Share your first photo!" : `${profileUsername} hasn't posted yet.`}</p>;
    }

    // --- Post Grid ---
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
            {posts.map((post, index) => (
                <Link key={post.id} href={`/post/${post.id}`} className="block aspect-square relative overflow-hidden rounded-lg group">
                    <Image
                        src={post.url}
                        alt={`Post by ${profileUsername}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" // Adjusted sizes
                        priority={index < 12} // Prioritize first few images
                    />
                </Link>
            ))}
        </div>
    );
}