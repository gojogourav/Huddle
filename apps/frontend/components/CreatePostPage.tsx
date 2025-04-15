// app/create/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button'; // Adjust path
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // Adjust path
import { Input } from '@/components/ui/input'; // Adjust path
import { Textarea } from '@/components/ui/textarea'; // Adjust path
import { ImageKitUpload } from '@/components/ImageUpload'; // Adjust path
import { useAuth } from '@/hooks/useAuth'; // Adjust path

// Schema reflects inputs, imageUrl will be validated before submit
const postSchema = z.object({
    text: z.string().max(500, "Caption cannot exceed 500 characters.").optional(),
    location: z.string().max(100, "Location too long").optional(),
    imageUrl: z.string().min(1, "An image is required."), // Required for submission logic
    userTagInput: z.string().optional(), // Input for comma-separated usernames
});

type PostFormValues = z.infer<typeof postSchema>;

function CreatePostPage() {
    const router = useRouter();
    const { currentUser, isLoading: authLoading } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false); // Renamed isLoading to isSubmitting for clarity
    const [error, setError] = useState<string | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

    const form = useForm<PostFormValues>({
        resolver: zodResolver(postSchema),
        defaultValues: {
            text: '',
            location: '',
            imageUrl: '', // Start empty, will be set by uploader
            userTagInput: '',
        },
        mode: 'onChange', // Validate on change for better UX
    });

    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.replace('/login?message=Please log in to create a post.');
        }
    }, [currentUser, authLoading, router]);

    const handleUploadSuccess = (result: { url: string; fileId: string }) => {
        setUploadedImageUrl(result.url);
        form.setValue('imageUrl', result.url, { shouldValidate: true }); // Set required field value
        setError(null); 
    };

    const handleUploadError = (uploadError: Error) => {
        console.error("Upload Error:", uploadError);
        // Set form error specific to image upload
        form.setError("imageUrl", { type: "manual", message: "Image upload failed. Please try again." });
        setUploadedImageUrl(null); // Clear image on error
    };

    async function onSubmit(values: PostFormValues) {
        // Double check image URL exists (though schema should catch it)
        if (!uploadedImageUrl) {
            form.setError("imageUrl", { type: "manual", message: "Please upload an image before posting." });
            return;
        }
        if (!currentUser) {
            setError("Authentication error. Please log in again.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        // --- User Tag Processing (Placeholder - Requires Backend Lookup) ---
        let userTagIds: string[] = [];
        if (values.userTagInput) {
            const usernames = values.userTagInput.split(',')
                .map(u => u.trim())
                .filter(Boolean); // Remove empty strings

            if (usernames.length > 0) {
                console.warn("TODO: Implement backend call to fetch user IDs for usernames:", usernames);

            }
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
                const response = await fetch(`${backendUrl}/api/user/lookup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ usernames }),
                });
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    console.error("Username lookup failed:", errData.message || response.statusText);
                    return { ids: [], notFound: usernames };
                }
                const data = await response.json();
                if (!data.success) {
                     console.error("Username lookup unsuccessful:", data.message);
                     return { ids: [], notFound: data.notFound || usernames };
                }
                return { ids: data.ids || [], notFound: data.notFound || [] };
    
            } catch (lookupErr) {
                console.error("Error during username lookup fetch:", lookupErr);
                return { ids: [], notFound: usernames }; // Assume all not found on fetch error
            }
    
        }



        try {
            
            const requestBody = {
                text: values.text || "", 
                location: values.location || null, 
                image: uploadedImageUrl, 
                userTag: userTagIds,
            };

            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/post`, { // Endpoint matches PostPosts likely mount point
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Send auth cookie
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
                throw new Error(errorData.message || `Failed to create post (${response.status})`);
            }

            const newPostData = await response.json();
            console.log("Post created:", newPostData);

            router.push('/');

        } catch (err: any) {
            console.error("Post creation error:", err);
            setError(err.message || "An unexpected error occurred while creating the post.");
            setIsSubmitting(false); // Stop loading on error
        }
    }

     if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-[#ff0050]" /></div>;
     }

    return (
        <div className='py-4 px-4 max-w-2xl mx-auto'>
             {/* Header */}
            <div className='flex items-center mb-6'>
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft strokeWidth={2.5} className='h-6 w-6' />
                </Button>
                <h1 className="text-xl font-semibold ml-4">Create New Post</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Image Upload Area */}
                     <FormItem>
                        <FormLabel>Image <span className="text-red-600">*</span></FormLabel>
                        <FormControl>
                             <ImageKitUpload
                                onUploadSuccess={handleUploadSuccess}
                                onUploadError={handleUploadError}
                                folder="/posts" // Or a user-specific folder?
                            />
                        </FormControl>
                         <FormMessage>{form.formState.errors.imageUrl?.message}</FormMessage>
                    </FormItem>

                    <FormField
                        control={form.control}
                        name="text"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Caption</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Write a caption..."
                                        className="resize-none min-h-[100px]" // Ensure decent height
                                        {...field}
                                        disabled={isSubmitting}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                     <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Location (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Add location" {...field} disabled={isSubmitting} value={field.value || ''}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Tag Users */}
                    <FormField
                        control={form.control}
                        name="userTagInput"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tag Users (Optional)</FormLabel>
                                <FormControl>
                                     {/* TODO: Replace with a proper tagging component */}
                                    <Input placeholder="Enter usernames, separated by commas" {...field} disabled={isSubmitting} value={field.value || ''}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {error && <p className="text-sm text-center font-medium text-red-600">{error}</p>}

                    <Button
                        type="submit"
                        className="w-full py-3 bg-[#ff0050] hover:bg-black text-white rounded-md transition-colors flex items-center justify-center"
                        disabled={isSubmitting || !uploadedImageUrl} // Disable if loading or no image uploaded
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Posting...
                            </>
                        ) : (
                            'Share Post'
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    );
}

export default CreatePostPage;