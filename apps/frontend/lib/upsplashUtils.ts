// src/lib/unsplashUtils.ts (or update googlePlacesUtils.ts)

// Define the structure of the Unsplash API photo object (simplified)
interface UnsplashPhotoUrls {
    raw: string;
    full: string;
    regular: string; // Good default size
    small: string;
    thumb: string;
}

interface UnsplashUser {
    name: string;
    username: string;
    links: {
        html: string; // Link to user's Unsplash profile
    };
}

interface UnsplashPhoto {
    id: string;
    description: string | null; // Often null, use alt_description
    alt_description: string | null;
    urls: UnsplashPhotoUrls;
    links: {
        html: string; // Link to the photo page on Unsplash
    };
    user: UnsplashUser; // Photographer info for attribution
}

// Define structure for the Unsplash Search API response
interface UnsplashSearchResponse {
    total: number;
    total_pages: number;
    results: UnsplashPhoto[];
}

/**
 * Fetches relevant photo URLs from Unsplash based on search terms.
 * IMPORTANT: Handles client-side API key exposure - use a backend proxy in production.
 */
async function fetchUnsplashPhotos(
    query: string,
    maxPhotos: number = 4,
    orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape' // Default orientation
): Promise<UnsplashPhoto[]> { // Return full photo objects for attribution/links
    console.log(`[fetchUnsplashPhotos] Fetching for query: "${query}", Orientation: ${orientation}`);
    const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
        console.warn("NEXT_PUBLIC_UNSPLASH_ACCESS_KEY not set. Cannot fetch Unsplash photos.");
        return [];
    }

    // Construct the Unsplash API URL
    const perPage = Math.min(maxPhotos, 30); // Unsplash max per page is 30
    const apiUrl = new URL('https://api.unsplash.com/search/photos');
    apiUrl.searchParams.append('query', query);
    apiUrl.searchParams.append('per_page', perPage.toString());
    apiUrl.searchParams.append('orientation', orientation);
    // You can add other params like 'content_filter=high', 'color' etc.

    try {
        const response = await fetch(apiUrl.toString(), {
            headers: {
                'Authorization': `Client-ID ${accessKey}`,
                'Accept-Version': 'v1' // Recommended by Unsplash docs
            },
            cache: 'no-store' // Don't cache search results excessively client-side
        });

        if (!response.ok) {
             // Try to get error details from Unsplash response
            let errorMsg = `Unsplash API error (${response.status})`;
             try {
                 const errorData = await response.json();
                 errorMsg = errorData.errors ? errorData.errors.join(', ') : errorMsg;
             } catch (_) {}
            throw new Error(errorMsg);
        }

        const data: UnsplashSearchResponse = await response.json();

        console.log(`[fetchUnsplashPhotos] Found ${data.total} total photos for "${query}". Returning first ${data.results?.length ?? 0}.`);
        return data.results || []; // Return the array of photo objects

    } catch (error) {
        console.error("Error fetching Unsplash photos:", error);
        return []; // Return empty array on error
    }
}

export { fetchUnsplashPhotos }; // Export the function
export type { UnsplashPhoto }; // Export the type if needed elsewhere