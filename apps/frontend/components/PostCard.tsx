// components/PostCard.tsx
import React, { useState, useEffect } from 'react'; // Added useEffect for potential like status fetch
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import  {formatDistanceToNow}  from 'date-fns';
import { useAuth } from '@/hooks/useAuth'; // Adjust path if needed

interface PostFeedItem {
    id: string;
    url: string;
    text: string;
    createdAt: string;
    user: {
        id: string;
        username: string;
        name: string | null;
        profilePic: string | null;
    };
    _count: {
        likes: number;
        comments: number;
    };
    // Consider adding: isLikedByCurrentUser?: boolean; // Fetch this if possible
}

interface PostCardProps {
    post: PostFeedItem;
    // Removed currentUser prop, get from useAuth directly
}

export function PostCard({ post }: PostCardProps) {
    const { currentUser } = useAuth(); // Get user from hook

    
    const [isLiked, setIsLiked] = useState(false); 
    const [likeCount, setLikeCount] = useState(post._count.likes);
    const [likeLoading, setLikeLoading] = useState(false);


    useEffect(() => {

    }, [post.id, currentUser]); 

    const handleLikeToggle = async () => {
        if (!currentUser || likeLoading) return;
        setLikeLoading(true);
        const originalLikedState = isLiked;
        const originalLikeCount = likeCount;

        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            // Endpoint for liking a POST
            const response = await fetch(`${backendUrl}/api/like/toggle/post/${post.id}`, {
                method: 'POST', credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || data.action === undefined) {
                 throw new Error(data.message || "Failed to toggle like");
            }
             // Optional: update state based on response 'action'
             // setIsLiked(data.action === 'Liked Post');

        } catch (err: any) {
            console.error("PostCard Like Error:", err);
            setIsLiked(originalLikedState); // Revert
            setLikeCount(originalLikeCount);
        } finally {
            setLikeLoading(false);
        }
    };


    return (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            {/* Card Header */}
            <div className="flex items-center p-3">
                <Link href={`/profile/${post.user.username}`}>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={post.user.profilePic || '/default-avatar.png'} alt={post.user.username} />
                        <AvatarFallback>{post.user.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="ml-3 flex-1">
                    <Link href={`/profile/${post.user.username}`} className="font-semibold text-sm hover:underline">
                        {post.user.username}
                    </Link>
                     {/* Optional Location can go here */}
                     {/* {post.location && <p className="text-xs text-gray-500">{post.location}</p>} */}
                </div>
                 <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                 </span>
            </div>

            {/* Image */}
            <Link href={`/post/${post.id}`} className="block">
                <div className="relative aspect-square w-full bg-gray-100">
                    <Image src={post.url} alt={`Post by ${post.user.username}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw"/>
                </div>
            </Link>

             {/* Actions */}
             <div className="flex items-center justify-between p-3">
                 <div className="flex items-center space-x-3">
                     <Button variant="ghost" size="icon" onClick={handleLikeToggle} disabled={likeLoading || !currentUser}>
                         {likeLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <Heart className={`h-6 w-6 transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-gray-900'}`} />}
                     </Button>
                      <Link href={`/post/${post.id}`}> {/* Link whole card or just comment icon */}
                         <Button variant="ghost" size="icon">
                             <MessageCircle className="h-6 w-6 text-gray-600 hover:text-gray-900" />
                         </Button>
                      </Link>
                 </div>
            </div>

             {/* Likes and Caption */}
            <div className="px-3 pb-3 text-sm space-y-1">
                {likeCount > 0 && (
                    <div className="font-semibold">
                        {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                    </div>
                )}
                 <div className="line-clamp-2"> {/* Limit caption lines */}
                     <Link href={`/profile/${post.user.username}`} className="font-semibold mr-1 hover:underline">{post.user.username}</Link>
                     <span>{post.text}</span>
                 </div>
                 {post._count.comments > 0 && (
                    <Link href={`/post/${post.id}`} className="text-gray-500 text-xs">
                        View all {post._count.comments} comments
                    </Link>
                 )}
            </div>
        </div>
    );
}