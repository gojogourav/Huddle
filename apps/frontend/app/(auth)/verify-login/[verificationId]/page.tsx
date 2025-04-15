// app/verify-login/[verificationId]/page.tsx (or your specific path)
'use client'

import React, { useState } from 'react';
import {
    InputOTP,
    InputOTPGroup,
    // InputOTPSeparator, // Separator not used in current layout
    InputOTPSlot,
} from "@/components/ui/input-otp"; // Adjust path if needed
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"; // Adjust path if needed
import { Button } from "@/components/ui/button"; // Adjust path if needed
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Import loader
import Link from 'next/link';

// Schema remains the same
const FormSchema = z.object({
    pin: z.string().min(6, {
        message: "Your one-time password must be 6 characters.",
    }),
});

// Renamed function for clarity
function VerifyLoginForm() {
    const router = useRouter();
    const params = useParams(); // Use useParams for client component
    const verificationId = params?.verificationId as string | undefined;

    // State for loading, error, and success feedback
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            pin: "",
        },
    });

    async function onSubmit(values: z.infer<typeof FormSchema>) {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (!verificationId) {
            setError("Verification ID is missing from the URL.");
            setIsLoading(false);
            return;
        }

        try {
            const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const requestBody = {
                otp: values.pin
            };

            // Target the correct login verification endpoint
            const response = await fetch(`${backendURL}/api/auth/verify-login/${verificationId}`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                // Include credentials to ensure cookies (access/refresh tokens) are set by the backend
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                setError(data.message || "Failed to verify OTP. Please try again or request a new login.");
            } else {
                setSuccessMessage(data.message || "Login successful! Redirecting...");
                // Redirect to home page after a short delay
                setTimeout(() => {
                    router.push('/'); // Or dashboard, etc.
                }, 1500); // 1.5-second delay
            }

        } catch (err) {
            console.error("Login verification error:", err);
            setError("An unexpected error occurred during verification.");
        } finally {
            // Keep loading true on success until redirect starts
             if (!successMessage) {
                setIsLoading(false);
            }
        }
    }

    return (
        <div className='min-h-screen flex items-center justify-center font-sans p-4 bg-gray-50'>
            <div className='w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-8'>
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Complete Your Login</h1>
                <p className="text-center text-neutral-500 mb-8">
                    Enter the 6-digit code sent to your email.
                </p>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="pin"
                            render={({ field }) => (
                                <FormItem className="flex flex-col items-center">
                                    {/* <FormLabel className='text-lg mb-4'>Enter Login Code</FormLabel> */}
                                    <FormControl>
                                        <InputOTP maxLength={6} {...field} disabled={isLoading || !!successMessage}>
                                            <InputOTPGroup>
                                                <InputOTPSlot index={0} />
                                                <InputOTPSlot index={1} />
                                                <InputOTPSlot index={2} />
                                                <InputOTPSlot index={3} />
                                                <InputOTPSlot index={4} />
                                                <InputOTPSlot index={5} />
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </FormControl>
                                    <FormDescription className="text-center mt-4">
                                        This code expires shortly.
                                    </FormDescription>
                                    <FormMessage className="text-center mt-2" />
                                </FormItem>
                            )}
                        />

                        {error && !successMessage && <p className="text-sm text-center font-medium text-red-600">{error}</p>}
                        {successMessage && <p className="text-sm text-center font-medium text-green-600">{successMessage}</p>}

                        <Button
                            type="submit"
                            className='w-full py-3 bg-[#ff0050] hover:bg-black text-white rounded-md transition-colors flex items-center justify-center'
                            disabled={isLoading || !!successMessage}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify & Login'
                            )}
                        </Button>

                         {/* Optional: Link back to login if they need to restart */}
                         {!successMessage && (
                             <div className="text-center mt-4">
                                 <Link href="/login">
                                     <span className="text-sm text-neutral-500 hover:text-[#ff0050]">Back to Login</span>
                                 </Link>
                             </div>
                         )}
                    </form>
                </Form>
            </div>
        </div>
    );
}

// Ensure the export matches the filename expectation (e.g., page.tsx uses default export)
export default VerifyLoginForm;