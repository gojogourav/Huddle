// app/create/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, ArrowLeft } from 'lucide-react';

// Adjust import paths based on your actual structure
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageKitUpload } from '@/components/ImageUpload'; // Corrected path assumption
import { useAuth } from '@/hooks/useAuth';

// Schema remains the same
const postSchema = z.object({
    text: z.string().max(500, "Caption cannot exceed 500 characters.").optional(),
    location: z.string().max(100, "Location too long").optional(),
    imageUrl: z.string().min(1, "An image is required."), // Validated before submit logic
    userTagInput: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

// --- Component Definition ---
function CreatePostPage() {
    const router = useRouter();
    const { currentUser, isLoading: authLoading } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

    const form = useForm<PostFormValues>({
        resolver: zodResolver(postSchema),
        defaultValues: {
            text: '',
            location: '',
            imageUrl: '', // Will be set by uploader
            userTagInput: '',
        },
        mode: 'onChange',
    });

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.replace('/login?message=Please log in to create a post.');
        }
    }, [currentUser, authLoading, router]);

    // --- Upload Handlers ---
    const handleUploadSuccess = (result: { url: string; fileId: string }) => {
        setUploadedImageUrl(result.url);
        form.setValue('imageUrl', result.url, { shouldValidate: true });
        form.clearErrors('imageUrl');
        setError(null);
    };

    const handleUploadError = (uploadError: Error) => {
        console.error("Upload Error:", uploadError);
        form.setError("imageUrl", { type: "manual", message: "Image upload failed. Please try again." });
        setUploadedImageUrl(null);
    };

    // --- Username to ID Lookup ---
    const lookupUserIds = async (usernames: string[]): Promise<{ ids: string[], notFound: string[] }> => {
        if (usernames.length === 0) return { ids: [], notFound: [] };
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
            return { ids: [], notFound: usernames };
        }
    };

    // --- Form Submission ---
    async function onSubmit(values: PostFormValues) {
        if (!uploadedImageUrl) {
            form.setError("imageUrl", { type: "manual", message: "Please upload an image." });
            return;
        }
        if (!currentUser) {
            setError("Authentication error. Please log in again.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        let userTagIds: string[] = [];
        let notFoundUsernames: string[] = [];

        if (values.userTagInput) {
            const usernamesToLookup = values.userTagInput.split(',').map(u => u.trim()).filter(Boolean);
            if (usernamesToLookup.length > 0) {
                 const lookupResult = await lookupUserIds(usernamesToLookup);
                 userTagIds = lookupResult.ids;
                 notFoundUsernames = lookupResult.notFound;
                 if (notFoundUsernames.length > 0) {
                    console.warn(`Could not find users for tags: ${notFoundUsernames.join(', ')}`);
                 }
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
            const response = await fetch(`${backendUrl}/api/post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
                throw new Error(errorData.message || `Failed to create post (${response.status})`);
            }

            const newPostData = await response.json();
            console.log("Post created:", newPostData);
            router.push('/'); // Redirect home after successful post

        } catch (err: any) {
            console.error("Post creation error:", err);
            let finalError = err.message || "An unexpected error occurred.";
            if (notFoundUsernames.length > 0) {
                finalError += ` (Could not find tags: ${notFoundUsernames.join(', ')})`;
            }
            setError(finalError);
            setIsSubmitting(false);
        }
    }

    // --- Render Logic ---
    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-[#ff0050]" /></div>;
    }
    // Redirect if !currentUser is handled by useEffect

    return (
        <div className='py-4 px-4 max-w-2xl mx-auto'>
            {/* Header */}
            <div className='flex items-center mb-6'>
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft strokeWidth={2.5} className='h-6 w-6' />
                </Button>
                <h1 className="text-xl font-semibold ml-4">Create New Post</h1>
            </div>

            {/* Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Image Upload */}
                    <FormItem>
                        <FormLabel>Image <span className="text-red-600">*</span></FormLabel>
                        <FormControl>
                            {/* Assuming ImageKitUpload lives in components */}
                            <ImageKitUpload
                                onUploadSuccess={handleUploadSuccess}
                                onUploadError={handleUploadError}
                                folder="/posts" // Customize folder if needed
                            />
                        </FormControl>
                        <FormMessage>{form.formState.errors.imageUrl?.message}</FormMessage>
                    </FormItem>

                    {/* Caption */}
                    <FormField control={form.control} name="text" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Caption</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Write a caption..." className="resize-none min-h-[100px]" {...field} disabled={isSubmitting} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {/* Location */}
                    <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Location (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Add location" {...field} disabled={isSubmitting} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {/* Tag Users */}
                    <FormField control={form.control} name="userTagInput" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tag Users (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter usernames, separated by commas" {...field} disabled={isSubmitting} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {/* Error Display */}
                    {error && <p className="text-sm text-center font-medium text-red-600">{error}</p>}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full py-3 bg-[#ff0050] hover:bg-black text-white rounded-md transition-colors flex items-center justify-center"
                        disabled={isSubmitting || !uploadedImageUrl}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting...</>
                        ) : (
                            'Share Post'
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    );
}

// Default export for Next.js page convention
export default CreatePostPage;