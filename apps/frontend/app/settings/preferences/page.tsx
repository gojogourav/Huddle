// app/page.tsx (or your designated home page route)
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Settings, Info } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth'; // Adjust path
import { ScrollablePreferencesForm } from '@/components/PreferencesForm'; // Adjust path
import PlanDisplay from '@/components/PlnDisplay';
import { UserPreferences } from '@/lib/preferencesOptions'; // Adjust path
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // For preference prompt
import { Input } from '@/components/ui/input'; // For location input if generating directly
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // For location input form
import * as z from 'zod'; // For location input validation
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// --- Types (Import or define) ---
interface ScheduleItem { time_slot: string; activity_title: string; description: string; local_insight: string; estimated_duration_minutes: number; budget_indicator: string; transport_suggestion?: string; }
interface GeneratedOneDayPlan { plan_title: string; location: string; date_applicable: string; plan_summary: string; schedule: ScheduleItem[]; }

// --- Schema for simple location input ---
const locationSchema = z.object({
    location: z.string().min(3, "Please enter a valid city/area").max(100),
});
type LocationFormValues = z.infer<typeof locationSchema>;


function HomePage() {
    // --- State ---
    const { currentUser, isLoading: authLoading, refetchUser } = useAuth();
    // Store the active plan (could be from context or fetched)
    const [activePlan, setActivePlan] = useState<GeneratedOneDayPlan | null>(null);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    // State for managing plan generation directly on this page
    const [showGenerateForm, setShowGenerateForm] = useState(false); // Toggle for generation UI
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    // State to track if initial check for active plan/prefs is done
    const [isInitialCheckLoading, setIsInitialCheckLoading] = useState(true);
    const [hasPreferences, setHasPreferences] = useState(false); // Track if user has minimum prefs set


    // --- Form for Location Input (used if generating directly) ---
    const locationForm = useForm<LocationFormValues>({
        resolver: zodResolver(locationSchema),
        defaultValues: { location: '' },
    });

    // --- Effect to Check for Active Plan and Preferences on Load ---
    useEffect(() => {
        setIsInitialCheckLoading(true);
        console.log("[HomePage] Auth Loading:", authLoading, "CurrentUser:", !!currentUser);

        if (!authLoading && currentUser) {
            // Option 1: Check currentUser from AuthContext (if it includes activeTourPlan and preferences)
             const userWithDetails = currentUser as typeof currentUser & { preferences?: UserPreferences | null; activeTourPlan?: { id: string; planData: any | null } | null }; // Type assertion

            const prefs = userWithDetails.preferences;
            const plan = userWithDetails.activeTourPlan;

             console.log("[HomePage] User loaded. Prefs:", prefs, "Active Plan:", plan);


            if (plan?.planData) {
                console.log("[HomePage] Active plan found in AuthContext.");
                 try {
                    // Attempt to parse planData. Ensure backend stores valid JSON.
                    // The 'planData' might be stored as a string or already parsed depending on Prisma/backend.
                    const parsedPlan = typeof plan.planData === 'string' ? JSON.parse(plan.planData) : plan.planData;
                     // TODO: Add more robust validation of parsedPlan structure here
                     if (parsedPlan && parsedPlan.schedule) {
                         setActivePlan(parsedPlan as GeneratedOneDayPlan);
                         setActivePlanId(plan.id);
                         setShowGenerateForm(false); // Hide generator if active plan exists
                     } else {
                         console.warn("Active plan data found but structure is invalid.");
                         setActivePlan(null); // Treat invalid plan as no active plan
                         setActivePlanId(null);
                         setShowGenerateForm(true); // Show generator if plan is invalid
                     }

                 } catch (e) {
                     console.error("Failed to parse active plan data:", e);
                     setActivePlan(null); // Treat parse error as no active plan
                     setActivePlanId(null);
                     setShowGenerateForm(true); // Show generator if plan is invalid
                 }

            } else {
                 console.log("[HomePage] No active plan found in AuthContext.");
                 setActivePlan(null);
                 setActivePlanId(null);
                 setShowGenerateForm(true); // Show generator if no active plan
            }

            // Check if user has minimum required preferences (e.g., interests)
            if (prefs && Array.isArray(prefs.interests) && prefs.interests.length > 0) {
                 setHasPreferences(true);
                 console.log("[HomePage] User has preferences set.");
            } else {
                 setHasPreferences(false);
                 console.log("[HomePage] User preferences are missing or incomplete.");
            }
            setIsInitialCheckLoading(false);

        } else if (!authLoading && !currentUser) {
            // User is not logged in
            console.log("[HomePage] User not logged in.");
            setActivePlan(null);
            setActivePlanId(null);
            setShowGenerateForm(false); // Don't show generator if logged out
            setHasPreferences(false);
            setIsInitialCheckLoading(false);
        }
         // If authLoading is still true, wait for the next render cycle
         else {
            console.log("[HomePage] Waiting for auth check...");
         }

    }, [currentUser, authLoading]); // Rerun when auth state changes

    // --- Handler for Generating a Plan Directly ---
    const handleGeneratePlan = async (values: LocationFormValues) => {
        if (!currentUser || !hasPreferences) {
            setGenerateError("Cannot generate plan. Ensure you are logged in and have set preferences.");
            return;
        }
        setIsGenerating(true); setGenerateError(null);

        try {
            const requestBody = { location: values.location }; // Backend uses saved prefs
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/tour-plan/generate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(requestBody),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to generate plan.');

            console.log("Generated Plan Directly:", data);
            setActivePlan(data.plan); // Display the new plan
            setActivePlanId(data.planId);
            setShowGenerateForm(false); // Hide form after generation
            // Optional: Trigger refetchUser if backend sets the new plan as active
            // await refetchUser();

        } catch (err: any) {
            console.error("Direct Plan Generation Error:", err);
            setGenerateError(err.message || "An unexpected error occurred.");
            setActivePlan(null); // Clear any previous plan on error
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Handler for when Preferences are Saved (from PreferencesForm) ---
    const handlePreferencesSaved = (savedPrefs: UserPreferences) => {
        console.log("[HomePage] Preferences saved callback received.");
        // Assume refetchUser already updated currentUser in context
        // Re-evaluate if preferences are now sufficient
        if (savedPrefs.interests && savedPrefs.interests.length > 0) {
             setHasPreferences(true);
             // Keep generate form visible, user might want to generate immediately
             setShowGenerateForm(true);
             // Clear any previous 'set preferences' error
        }
        // Potentially clear active plan if prefs changed significantly? Optional.
        // setActivePlan(null);
        // setActivePlanId(null);
    };


    // --- Render Logic ---
    if (isInitialCheckLoading || authLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-[#ff0050]" /></div>;
    }

    // Logged Out State
    if (!currentUser) {
         return (
             <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
                 <h1 className="text-4xl font-bold mb-4 text-cyan-700">Welcome to Your Tour Planner!</h1>
                 <p className="text-lg text-gray-600 mb-8">Log in or sign up to create personalized travel itineraries.</p>
                 <div className="flex gap-4">
                     <Button asChild size="lg" className="bg-[#ff0050] hover:bg-black text-white"><Link href="/login">Login</Link></Button>
                     <Button asChild size="lg" variant="outline"><Link href="/register">Register</Link></Button>
                 </div>
             </div>
        );
    }

    // Logged In State
    return (
        <div className="container mx-auto py-6 px-4">

            {/* Display Active Plan if it exists */}
            {activePlan ? (
                <>
                    <div className="text-center mb-4">
                         <h1 className="text-3xl font-bold">Your Active Plan</h1>
                         {/* Button to allow generating a new one */}
                         <Button variant="outline" size="sm" onClick={() => { setActivePlan(null); setActivePlanId(null); setShowGenerateForm(true); }} className="mt-2">
                            Generate New Plan Instead
                         </Button>
                    </div>
                    <PlanDisplay plan={activePlan} planId={activePlanId ?? undefined} />
                </>
            ) : (
                // No Active Plan: Show Preference prompt or Generation Form
                <>
                    {hasPreferences ? (
                        // User has preferences, show generation form
                         <Card className="w-full max-w-lg mx-auto shadow-lg border-gray-200">
                             <CardHeader>
                                 <CardTitle className="text-2xl font-semibold text-center">Generate a New Day Plan</CardTitle>
                                 <CardDescription className="text-center text-gray-500 pt-1">
                                     Enter your destination. We'll use your saved <Link href="/settings/preferences" className="text-cyan-600 underline hover:text-cyan-800">preferences</Link> to create a plan.
                                 </CardDescription>
                             </CardHeader>
                             <CardContent>
                                <Form {...locationForm}>
                                     <form onSubmit={locationForm.handleSubmit(handleGeneratePlan)} className="space-y-4">
                                         <FormField control={locationForm.control} name="location" render={({ field }) => (
                                             <FormItem>
                                                 <FormLabel>Destination City/Area</FormLabel>
                                                 <FormControl>
                                                     <Input placeholder="e.g., London, Tokyo, Grand Canyon" {...field} disabled={isGenerating} />
                                                 </FormControl>
                                                 <FormMessage />
                                             </FormItem>
                                         )} />
                                          {generateError && <p className="text-sm font-medium text-red-600 text-center">{generateError}</p>}
                                         <Button type="submit" className="w-full bg-[#ff0050] hover:bg-black text-white" disabled={isGenerating}>
                                             {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Plan</>}
                                         </Button>
                                     </form>
                                </Form>
                            </CardContent>
                         </Card>
                    ) : (
                        // User has NO preferences set, render the PreferencesForm
                         <div className="max-w-lg mx-auto">
                            <Alert variant="default" className="mb-6 bg-blue-50 border-blue-300 text-blue-800">
                                 <Info className="h-4 w-4 !stroke-blue-700" />
                                <AlertTitle className="font-semibold">Set Your Preferences</AlertTitle>
                                <AlertDescription>
                                     Tell us your travel style to generate personalized plans! Once saved, you can generate a plan.
                                </AlertDescription>
                             </Alert>
                            <ScrollablePreferencesForm onSaveSuccess={handlePreferencesSaved} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default HomePage;