// app/plan/generate/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, Sparkles, Info } from 'lucide-react';
import Link from 'next/link'; // For linking to preferences

// Assuming these are shadcn/ui components, adjust paths if needed
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For showing info

// Assuming PlanDisplay component exists and expects these props
import PlanDisplay from '@/components/PlnDisplay'; // Adjust path if needed
import { useAuth } from '@/hooks/useAuth'; // Adjust path if needed
import { UserPreferences } from '@/lib/preferencesOptions'; // Adjust path if needed

// --- Types for PlanDisplay ---
// Define these types explicitly here or import them from a shared file
interface ScheduleItem {
    time_slot: string;
    activity_title: string;
    description: string;
    local_insight: string;
    estimated_duration_minutes: number;
    budget_indicator: string;
    transport_suggestion?: string;
}
interface GeneratedOneDayPlan {
    plan_title: string;
    location: string;
    date_applicable: string;
    plan_summary: string;
    schedule: ScheduleItem[];
}

// --- Zod Schema for THIS form (only location needed) ---
const generateLocationSchema = z.object({
    location: z.string()
                .trim() // Trim whitespace
                .min(3, "Location must be at least 3 characters.")
                .max(100, "Location is too long (max 100 characters)"),
});
type GenerateLocationFormValues = z.infer<typeof generateLocationSchema>;


// --- Page Component ---
function GeneratePlanPage() {
    const router = useRouter();
    // Get user and loading status, also ability to refetch user data
    const { currentUser, isLoading: authLoading, refetchUser } = useAuth();

    // State for plan generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null); // Renamed error state
    const [generatedPlan, setGeneratedPlan] = useState<GeneratedOneDayPlan | null>(null);
    const [generatedPlanId, setGeneratedPlanId] = useState<string | undefined>(undefined);

    // State for preferences
    const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
    const [isLoadingPrefs, setIsLoadingPrefs] = useState(true); // Loading state for preferences
    const [prefsError, setPrefsError] = useState<string | null>(null); // Error state for preferences fetch

    // Derived state: checks if essential preferences (interests) are present
    const hasRequiredPreferences = !!userPreferences?.interests && userPreferences.interests.length > 0;

    // --- Form for location input only ---
    const form = useForm<GenerateLocationFormValues>({
        resolver: zodResolver(generateLocationSchema),
        defaultValues: { location: '' },
        mode: 'onChange', // Validate as user types
    });

    // --- Effect to Load User Preferences ---
    const loadPreferences = useCallback(async () => {
        // Only run if auth is loaded and user exists
        if (authLoading || !currentUser) {
            // If auth loaded but no user, redirect (or handle logged out state)
            if (!authLoading && !currentUser) {
                router.replace('/login?message=Please log in to generate a plan.');
            }
            return; // Exit if auth loading or no user
        }

        console.log("[loadPreferences] Auth loaded, User exists. Fetching preferences...");
        setIsLoadingPrefs(true);
        setPrefsError(null); // Clear previous preference errors
        setUserPreferences(null); // Clear previous prefs

        // Check context first (more efficient if AuthProvider fetches prefs)
        const prefsFromContext = (currentUser as any)?.preferences;
        if (prefsFromContext && typeof prefsFromContext === 'object' && Array.isArray(prefsFromContext.interests)) { // Basic check
            console.log("[loadPreferences] Using preferences found in AuthContext:", prefsFromContext);
            setUserPreferences(prefsFromContext as UserPreferences);
            setIsLoadingPrefs(false);
            return; // Exit early
        }

        // Fallback: Fetch profile specifically for preferences
        console.log("[loadPreferences] Preferences not in context, fetching profile...");
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            // Ensure this endpoint returns the 'preferences' field
            const response = await fetch(`${backendUrl}/api/user/profile`, { credentials: 'include', cache: 'no-store' });
            console.log("[loadPreferences] Profile fetch status:", response.status);
            if (!response.ok) throw new Error(`Failed to fetch profile (${response.status})`);
            const data = await response.json();
            console.log("[loadPreferences] Profile fetch data:", data);

            if (data.success && data.data?.preferences && typeof data.data.preferences === 'object') {
                setUserPreferences(data.data.preferences);
                console.log("[loadPreferences] Fetched preferences:", data.data.preferences);
            } else {
                setUserPreferences(null); // No preferences set in DB
                console.log("[loadPreferences] No preferences object found in fetched profile data.");
            }
        } catch (fetchErr: any) {
            console.error("[loadPreferences] Error fetching profile/prefs:", fetchErr);
            setPrefsError("Could not load your saved preferences."); // Set specific error for prefs
            setUserPreferences(null);
        } finally {
            console.log("[loadPreferences] Finished loading preferences.");
            setIsLoadingPrefs(false);
        }
    // Add router to dependency array as it's used
    }, [currentUser, authLoading, router]);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]); // Run loadPreferences when dependencies change


    // --- Form Submission Handler for Plan Generation ---
    async function onSubmit(values: GenerateLocationFormValues) {
        // Guard clauses
        if (!currentUser) { setGenerateError("Authentication error."); return; }
        if (isLoadingPrefs) { setGenerateError("Preferences check still in progress."); return; }
        if (!hasRequiredPreferences) {
            setGenerateError("Please set your travel interests before generating."); return;
        }

        setIsGenerating(true); setGenerateError(null); setGeneratedPlan(null); setGeneratedPlanId(undefined);

        try {
            // Backend only needs location; it uses saved preferences via auth cookie
            const requestBody = { location: values.location };
            console.log("[GeneratePlanPage] Submitting to generate plan:", requestBody);

            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/tour-plan/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(requestBody),
            });
            console.log("[GeneratePlanPage] Generate Response Status:", response.status);

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || `Failed to generate plan (${response.status})`);
            }

            console.log("[GeneratePlanPage] Generated Plan Data:", data);
            setGeneratedPlan(data.plan);
            setGeneratedPlanId(data.planId);
             // Clear location input after successful generation
             form.reset({ location: '' });

        } catch (err: any) {
            console.error("[GeneratePlanPage] Plan Generation Error:", err);
            setGenerateError(err.message || "An error occurred during plan generation.");
            setGeneratedPlan(null); // Clear plan on error
        } finally {
            setIsGenerating(false);
        }
    }

    // --- Callback for when PreferencesForm (if rendered directly) saves successfully ---
     const handlePreferencesSaved = () => {
         console.log("[HomePage] Preferences saved callback. Refetching preferences.");
         // Trigger a refetch of preferences after they are saved on another page/component
         // This assumes the user navigated back or the state needs updating
         loadPreferences(); // Reload preferences for this page
         // Potentially clear any generated plan as prefs changed?
         // setGeneratedPlan(null);
         // setGeneratedPlanId(undefined);
    };

    // --- Render Logic ---

    // Show main loading spinner ONLY while checking auth initially
    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-[#ff0050]" /></div>;
    }

    // If auth check is done but user is not logged in (redirect should have happened, but safety check)
    if (!currentUser) {
         return <div className="min-h-screen flex items-center justify-center"><p>Please log in.</p></div>;
    }

    // Show preference loading state if still loading *after* auth is done
    if (isLoadingPrefs) {
         return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-[#ff0050]" /></div>;
    }

    // Show prompt to set preferences if they are missing AFTER loading finishes
    if (!hasRequiredPreferences) {
        return (
            <div className="container mx-auto py-10 px-4 max-w-lg text-center">
                 <Alert variant="default" className="bg-yellow-50 border-yellow-400 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-100">
                     <Info className="h-4 w-4 !stroke-yellow-700" />
                    <AlertTitle className="font-semibold">Set Your Preferences!</AlertTitle>
                    <AlertDescription>
                         {/* Show specific error if pref loading failed */}
                         {prefsError || "To generate personalized plans, please set your travel interests first."}
                         <br />
                         <Button variant="link" className="text-yellow-800 dark:text-yellow-200 h-auto p-0 mt-2 underline" asChild>
                              {/* Make sure this route exists */}
                              <Link href="/settings/preferences">Go to Preferences</Link>
                         </Button>
                    </AlertDescription>
                 </Alert>
                 {/* You could render <PreferencesForm onSaveSuccess={handlePreferencesSaved} /> here instead of linking */}
            </div>
        );
    }

    // --- Main UI: Generation Form + Plan Display ---
    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-10"> {/* Add space between card and plan */}
            {/* Generation Card */}
            <Card className="shadow-lg border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">Generate Your Next Adventure</CardTitle>
                    <CardDescription className="text-center text-gray-500 dark:text-gray-400 pt-1">
                        Enter a location, and we'll use your saved preferences.
                    </CardDescription>
                    {/* Display summary of preferences being used */}
                    {userPreferences && (
                        <div className="text-xs text-center text-gray-400 dark:text-gray-500 pt-3 border-t mt-3">
                             Using:
                             Pace: {userPreferences.pace || 'Any'},
                             Budget: {userPreferences.budget || 'Any'},
                             Interests: {userPreferences.interests?.slice(0, 3).join(', ')}{userPreferences.interests && userPreferences.interests.length > 3 ? '...' : ''}.
                             <Link href="/settings/preferences" className="ml-2 underline text-cyan-600 dark:text-cyan-400 text-[11px] hover:text-cyan-800">Edit</Link>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="location" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Destination City/Area</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Bangalore, Kyoto, Manhattan" {...field} disabled={isGenerating} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Display generation errors */}
                            {generateError && <p className="text-sm font-medium text-red-600 text-center pt-2">{generateError}</p>}

                            <Button
                                type="submit"
                                className="w-full py-3 bg-[#ff0050] hover:bg-black text-white rounded-md transition-colors flex items-center justify-center"
                                disabled={isGenerating || isLoadingPrefs} // Also disable if somehow prefs are still loading
                            >
                                {isGenerating ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="mr-2 h-4 w-4" /> Generate Plan</>
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Display Generated Plan */}
            {/* Conditionally render PlanDisplay only when a plan is generated */}
            {generatedPlan && (
                 <div className="mt-10">
                    <PlanDisplay plan={generatedPlan} planId={generatedPlanId} />
                 </div>
            )}

             {/* Optional: Show a message while generating below the form */}
             {isGenerating && !generatedPlan && (
                  <div className="mt-10 flex flex-col items-center text-center text-gray-500">
                     <Loader2 className="h-8 w-8 animate-spin text-[#ff0050] mb-3"/>
                     <p>Generating your personalized plan...</p>
                     <p className="text-xs mt-1">(This might take a moment)</p>
                  </div>
             )}

        </div>
    );
}

export default GeneratePlanPage;