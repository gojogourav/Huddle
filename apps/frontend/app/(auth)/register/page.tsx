// app/register/page.tsx (or your specific path)
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
    // Added name field based on backend controller
    name: z.string().min(1, { message: "Name cannot be empty." }),
    username: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    password: z.string().min(5, {
        message: "Password must be at least 5 characters.",
    }),
    confirmPassword: z.string().min(5, {
        message: "Confirm Password must be at least 5 characters.",
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"], // Apply error to confirmPassword field
});

function RegisterForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "", // Added name default
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Remove confirmPassword before sending to backend
            const { confirmPassword, ...requestBody } = values;

            const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const response = await fetch(`${backendURL}/api/auth/register`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                setError(data.message || 'Registration failed. Please try again.');
            } else if (data.verificationId) {
                setSuccessMessage(data.message || 'Registration successful! Redirecting to verification...');
                // Redirect to registration verification page after a short delay
                 setTimeout(() => {
                    router.push(`/verify-registration/${data.verificationId}`);
                 }, 2000); // 2 second delay
            } else {
                 // Should not happen if backend logic is correct
                 setError("Registration successful, but verification details missing.");
            }

        } catch (err) {
            console.error('Registration form submission error:', err);
            setError('An unexpected error occurred. Please try again later.');
        } finally {
            // Keep loading true until redirect starts if successful
            if (!successMessage) {
                setIsLoading(false);
            }
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center font-sans p-4 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Huddle</h1>
                <p className="text-center text-neutral-500 mb-8 font-medium">Create your account</p>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"> {/* Reduced space slightly */}
                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            placeholder="Full Name"
                                            {...field}
                                            className="border-gray-300 focus:ring-2 focus:ring-[#ff0050]/50 focus:border-[#ff0050]"
                                            disabled={isLoading || !!successMessage}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            placeholder="Username"
                                            {...field}
                                            className="border-gray-300 focus:ring-2 focus:ring-[#ff0050]/50 focus:border-[#ff0050]"
                                            disabled={isLoading || !!successMessage}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            placeholder="Email"
                                            type="email" // Ensure correct input type
                                            {...field}
                                            className="border-gray-300 focus:ring-2 focus:ring-[#ff0050]/50 focus:border-[#ff0050]"
                                            disabled={isLoading || !!successMessage}
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
                                            disabled={isLoading || !!successMessage}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="Confirm Password"
                                            {...field}
                                            className="border-gray-300 focus:ring-2 focus:ring-[#ff0050]/50 focus:border-[#ff0050]"
                                            disabled={isLoading || !!successMessage}
                                        />
                                    </FormControl>
                                    <FormMessage /> {/* Displays the "Passwords do not match" error */}
                                </FormItem>
                            )}
                        />

                         {/* Error/Success Message Display */}
                        {error && !successMessage && ( // Show error only if no success message
                            <p className="text-sm text-center font-medium text-red-600 pt-2">
                                {error}
                            </p>
                        )}
                         {successMessage && (
                            <p className="text-sm text-center font-medium text-green-600 pt-2">
                                {successMessage}
                            </p>
                        )}


                        <Button
                            type="submit"
                            className="w-full mt-6 py-3 bg-[#ff0050] hover:bg-black text-white rounded-md transition-colors flex items-center justify-center"
                             // Disable if loading or successful (awaiting redirect)
                            disabled={isLoading || !!successMessage}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                'Register'
                            )}
                        </Button>

                        <div className="text-center mt-4">
                            <span className="text-sm text-neutral-500">
                                Already have an account?{" "}
                                <Link href="/login" className="font-medium text-[#ff0050] hover:underline">
                                     Login
                                </Link>
                            </span>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}

export default RegisterForm;