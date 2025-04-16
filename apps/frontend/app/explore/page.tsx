// app/explore/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { PostCard } from '@/components/PostCard'; // Adjust path if needed
// import { useAuth } from '@/hooks/useAuth'; // Import if needed

// --- Types ---
interface ExplorePostUser { id: string; username: string; name: string | null; profilePic: string | null; }
interface ExplorePostItem {
    id: string; url: string; text: string; location?: string | null; createdAt: string;
    userId: string; user: ExplorePostUser; _count: { likes: number; comments: number; };
    isLikedByCurrentUser: boolean;
}
interface FetchExploreResponse {
    success: boolean;
    posts: ExplorePostItem[];
    pagination?: { page: number; limit: number; totalPages: number; totalPosts: number; };
    message?: string;
}

// --- Component Definition ---
function ExplorePage() {
    // const { currentUser } = useAuth();

    const [posts, setPosts] = useState<ExplorePostItem[]>([]);
    const [isLoading, setIsLoading] = useState(false); // Start false, set true ONLY during fetch
    const [isInitialLoading, setIsInitialLoading] = useState(true); // Separate state for initial full-screen loader
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1); // Current page *to fetch*
    const [hasMore, setHasMore] = useState(true);
    const loaderRef = useRef<HTMLDivElement>(null);
    // Ref to track if an initial fetch attempt has been made
    const initialFetchAttempted = useRef(false);

    // --- Function to Fetch Explore Posts ---
    const fetchExplorePosts = useCallback(async (pageNum: number) => {
        // Prevent fetching if already loading OR if we know there's no more data
        if (isLoading || !hasMore) {
            console.log(`[ExplorePage:fetch] Skipping: isLoading=${isLoading}, hasMore=${hasMore}`);
            return;
        }

        console.log(`[ExplorePage:fetch] Attempting Fetch page ${pageNum}`);
        setIsLoading(true); // Set loading true *only* when starting fetch
        if (pageNum === 1) {
            setError(null); // Clear error only for first page attempt
            setIsInitialLoading(true); // Show initial loader for page 1
        }

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const limit = 12;
            const apiEndpoint = `${backendUrl}/api/post/explore?page=${pageNum}&limit=${limit}`;
            console.log(`[ExplorePage:fetch] URL: ${apiEndpoint}`);

            const response = await fetch(apiEndpoint, { credentials: 'include', cache: 'no-store' });
            console.log(`[ExplorePage:fetch] Status: ${response.status}`);

            if (!response.ok) {
                let errorMsg = `Failed to fetch explore feed (${response.status})`;
                try { // Try to get more specific error from backend
                    const errData = await response.json();
                    errorMsg = errData.message || errorMsg;
                } catch (_) { /* Ignore parsing error */ }
                throw new Error(errorMsg);
            }

            const data: FetchExploreResponse = await response.json();
            console.log(`[ExplorePage:fetch] Data (Page ${pageNum}):`, data);

            if (!data.success || !Array.isArray(data.posts)) { // Check if posts is an array
                throw new Error(data.message || 'Backend indicated failure or invalid data.');
            }

            // Append posts correctly
            setPosts(prev => pageNum === 1 ? data.posts : [...prev, ...data.posts]);

            // Determine 'hasMore' based on backend pagination OR fallback
            const moreAvailable = data.pagination
                ? data.pagination.page < data.pagination.totalPages
                : data.posts.length === limit;
            setHasMore(moreAvailable);
            console.log(`[ExplorePage:fetch] Success. Posts received: ${data.posts.length}, HasMore: ${moreAvailable}`);

        } catch (err: any) {
            console.error("[ExplorePage:fetch] CATCH:", err);
            setError(err.message || "Could not load explore feed.");
            setHasMore(false); // Stop pagination on error
        } finally {
            console.log(`[ExplorePage:fetch] FINALLY page ${pageNum}. Setting loading states false.`);
            setIsLoading(false); // Always set loading false in finally
            if (pageNum === 1) {
                setIsInitialLoading(false); // Turn off initial loader after first fetch attempt
            }
            initialFetchAttempted.current = true; // Mark initial attempt done
        }
    }, [isLoading, hasMore]); // Dependencies: Only re-create if loading/hasMore state changes

    // --- Initial Fetch Effect ---
    useEffect(() => {
        console.log("[ExplorePage: Mount Effect] Triggering initial fetch.");
        // Reset state (important if component remounts)
        setPosts([]);
        setPage(1);
        setHasMore(true);
        setError(null);
        setIsLoading(false); // Ensure not loading before first fetch
        setIsInitialLoading(true); // Ensure initial loader shows
        initialFetchAttempted.current = false; // Reset flag
        // Call fetch directly
        fetchExplorePosts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // --- Intersection Observer for Infinite Scroll ---
    useEffect(() => {
        // Do not setup observer if initial load is happening, or if loading more, or no more data
        if (isInitialLoading || isLoading || !hasMore || !loaderRef.current) {
            console.log("[Observer Effect] Skipping setup:", { isInitialLoading, isLoading, hasMore, loaderExists: !!loaderRef.current });
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    console.log("[Observer] Loader intersecting! Requesting page:", page + 1);
                    // Use functional update for page state
                    setPage((prevPage) => prevPage + 1);
                }
            },
            { rootMargin: '0px 0px 400px 0px', threshold: 0.1 }
        );

        const currentLoaderRef = loaderRef.current;
        console.log("[Observer Effect] Observing loader.");
        observer.observe(currentLoaderRef);

        return () => {
            console.log("[Observer Effect] Cleaning up observer.");
            if (currentLoaderRef) observer.unobserve(currentLoaderRef);
        };
    // Rerun setup only when these key states change
    }, [isLoading, hasMore, isInitialLoading, page]); // Added page to dependencies


    // --- Effect to Fetch Data When Page Increments ---
    useEffect(() => {
        // Fetch only for pages > 1, and ensure initial fetch has happened
        if (page > 1 && hasMore && initialFetchAttempted.current) {
            console.log(`[Page Change Effect] Page is now ${page}. Calling fetchExplorePosts.`);
            fetchExplorePosts(page);
        }
    // Depend on page and fetchExplorePosts callback identity
    }, [page, hasMore, fetchExplorePosts]);


    // --- Render Logic ---
    console.log("[Render] State:", { isInitialLoading, isLoading, error, postsCount: posts.length, page, hasMore });

    return (
        <div className="max-w-7xl mx-auto py-4 px-2">
            <h1 className="text-2xl font-bold mb-6 px-2">Explore</h1>

            {/* Initial Loading Spinner */}
            {isInitialLoading && (
                 <div className="flex justify-center mt-20"><Loader2 className="h-12 w-12 animate-spin text-[#ff0050]" /></div>
            )}

            {/* Initial Error Display */}
            {!isInitialLoading && error && posts.length === 0 && (
                 <p className="text-center text-red-600 mt-10">{error}</p>
            )}

            {/* Empty State (after initial load, no posts, no error) */}
             {!isInitialLoading && posts.length === 0 && !error && (
                <p className="text-center text-neutral-500 mt-20">Nothing to explore right now. Check back later!</p>
             )}

            {/* Post Grid - Render even if loading subsequent pages */}
             {(posts.length > 0 || isLoading) && ( // Keep grid structure visible while loading more
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} /* currentUser={currentUser} */ />
                    ))}
                 </div>
             )}

             {/* Infinite Scroll Trigger, Loading Indicator, End Message */}
            <div ref={loaderRef} className="h-20 flex items-center justify-center text-center" aria-live="polite">
                {/* Show loader only when loading MORE pages (not initial) */}
                {isLoading && !isInitialLoading && <Loader2 className="h-8 w-8 animate-spin text-[#ff0050]" />}
                {/* Show pagination error */}
                {!isLoading && error && posts.length > 0 && <p className="text-red-600">Error loading more posts.</p>}
                {/* Show end message */}
                {!isLoading && !hasMore && posts.length > 0 && <p className="text-neutral-500">You've seen it all!</p>}
            </div>
        </div>
    );
}

export default ExplorePage;