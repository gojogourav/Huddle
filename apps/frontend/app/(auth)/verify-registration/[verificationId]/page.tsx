// app/verify-registration/[verificationId]/page.tsx (or your specific path)
'use client'

import React, { useState } from 'react';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "../../../../components/ui/input-otp"; // Adjust path if needed
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    // FormLabel, // Not currently used
    FormMessage,
} from "../../../../components/ui/form"; // Adjust path if needed
import { Button } from "../../../../components/ui/button"; // Adjust path if needed
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react'; // Import loader icon

// Schema remains the same
const FormSchema = z.object({
    pin: z.string().min(6, {
        message: "Your one-time password must be 6 characters.",
    }),
});

function VerifyRegistrationForm() {
    const router = useRouter();
    const params = useParams();
    const verificationId = params?.verificationId as string | undefined;

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

            const response = await fetch(`${backendURL}/api/auth/verify-registration/${verificationId}`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                setError(data.message || "Failed to verify OTP. Please try again.");
            } else {
                setSuccessMessage(data.message || "Verification successful! Redirecting to login...");
                setTimeout(() => {
                    router.push('/login');
                }, 2000); // 2-second delay
            }

        } catch (err) {
            console.error("Verification error:", err);
            setError("An unexpected error occurred. Please try again.");
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
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Verify Your Account</h1>
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
                                    <FormControl>
                                        {/* Disable input when loading or successful */}
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
                                        This code expires in 15 minutes.
                                    </FormDescription>
                                    <FormMessage className="text-center mt-2" />
                                </FormItem>
                            )}
                        />

                        {/* Error/Success Message Display */}
                        {error && !successMessage && <p className="text-sm text-center font-medium text-red-600">{error}</p>}
                        {successMessage && <p className="text-sm text-center font-medium text-green-600">{successMessage}</p>}

                        <Button
                            type="submit"
                            className='w-full py-3 bg-[#ff0050] hover:bg-black text-white rounded-md transition-colors flex items-center justify-center'
                            disabled={isLoading || !!successMessage} // Disable if loading or successful
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Verify Account"
                            )}
                        </Button>

                        {/* Link back to login, hidden on success */}
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

export default VerifyRegistrationForm;