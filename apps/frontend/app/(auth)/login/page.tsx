// app/login/page.tsx (or your specific path)
"use client"

import React, { useState } from 'react';
import * as z from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Import the loader icon

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    // FormLabel, // Can remove if not using separate labels
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
    // Changed name to 'identifier' to match backend expectations more closely
    identifier: z.string().min(2, {
        message: "Username or Email must be at least 2 characters.",
    }),
    password: z.string().min(5, {
        message: "Password must be at least 5 characters.",
    }),
});

function LoginForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            identifier: "", // Changed default field name
            password: ""
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setError(null);

        try {
            const requestBody = {
                identifier: values.identifier, // Use the updated field name
                password: values.password
            };
            // Ensure NEXT_PUBLIC_ prefix for client-side env vars
            const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const response = await fetch(`${backendURL}/api/auth/login`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                setError(data.message || 'Login failed. Please check your credentials.');
            } else if (data.needsOtp && data.verificationId) {
                // Redirect to OTP verification page for login
                await router.push(`/verify-login/${data.verificationId}`); // Adjusted route
            } else {
                 // Should not happen with current backend logic, but handle defensively
                 setError("Login response was successful but missing verification details.");
            }

        } catch (err) {
            console.error('Login form submission error:', err);
            setError('An unexpected error occurred. Please try again later.');
        } finally {
            setIsLoading(false); // Ensure loading state is always turned off
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center font-sans p-4 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Huddle</h1>
                <p className="text-center text-neutral-500 mb-8 font-medium">Login to continue</p>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="identifier" // Changed name
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            placeholder="Username or Email" // Updated placeholder
                                            {...field}
                                            className="border-gray-300 focus:ring-2 focus:ring-[#ff0050]/50 focus:border-[#ff0050]"
                                            disabled={isLoading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="Password"
                                            {...field}
                                            className="border-gray-300 focus:ring-2 focus:ring-[#ff0050]/50 focus:border-[#ff0050]"
                                            disabled={isLoading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Error Message Display */}
                        {error && (
                            <p className="text-sm text-center font-medium text-red-600">
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            className="w-full py-3 bg-[#ff0050] hover:bg-black text-white rounded-md transition-colors flex items-center justify-center"
                            disabled={isLoading} // Disable button when loading
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Login'
                            )}
                        </Button>

                        <div className="text-center mt-4">
                            <span className="text-sm text-neutral-500">
                                Don't have an account?{" "}
                                <Link href="/register" className="font-medium text-[#ff0050] hover:underline">
                                    Register
                                </Link>
                            </span>
                        </div>
                    </form>
                </Form>
                {/* Removed redundant "Please login to continue" */}
            </div>
        </div>
    );
}

export default LoginForm;