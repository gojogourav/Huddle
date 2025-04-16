// app/page.tsx (or your designated home page route)
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Settings, Info, AlertCircle } from 'lucide-react';

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
import { Router } from 'next/router';
import { useRouter } from 'next/navigation';


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
const router = useRouter()
    // Logged In State
    return (
        <div className="container pt-20 mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Logged Out State */}
          {!currentUser ? (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 space-y-8">
              <div className="space-y-4">
                <Sparkles className="h-16 w-16 mx-auto text-[#ff0050]" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ff0050] to-cyan-600 bg-clip-text text-transparent">
                  Smart Travel Planner
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Create personalized, AI-powered travel itineraries tailored to your preferences.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
                <Button asChild size="lg" className="bg-[#ff0050] hover:bg-[#e00040] text-white sm:w-48 w-full">
                  <Link href="/login">Get Started</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="sm:w-48 w-full">
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Logged In State */
            <div className="max-w-7xl mx-auto">
              {/* Active Plan Section */}
              {activePlan ? (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">Your Active Plan</h1>
                      <p className="text-gray-500 mt-1">{activePlan.location} • {activePlan.date_applicable}</p>
                    </div>
                    <Button 
                      onClick={() => router.push('/plan/generate')}
                      className="bg-[#ff0050] hover:bg-[#e00040]"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      New Plan
                    </Button>
                  </div>
                  <PlanDisplay plan={activePlan} planId={activePlanId ?? undefined} />
                </div>
              ) : (
                /* Generation Section */
                <div className="flex flex-col items-center">
                  {hasPreferences ? (
                    <Card className="w-full max-w-2xl shadow-xl rounded-2xl border border-gray-100">
                      <CardHeader className="space-y-3">
                        <div className="flex justify-center">
                          <Sparkles className="h-12 w-12 text-[#ff0050]" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-center text-gray-900">
                          Craft Your Perfect Day
                        </CardTitle>
                        <CardDescription className="text-center text-gray-500 text-lg">
                          Start by entering your destination below
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Form {...locationForm}>
                          <form onSubmit={locationForm.handleSubmit(handleGeneratePlan)} className="space-y-6">
                            <FormField
                              control={locationForm.control}
                              name="location"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-700 text-sm font-medium">
                                    Destination
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Where would you like to explore? (e.g., Paris, Bali, New York City)"
                                      {...field}
                                      disabled={isGenerating}
                                      className="h-12 text-lg rounded-lg"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {generateError && (
                              <Alert variant="destructive" className="bg-red-50 border-red-200">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-600">
                                  {generateError}
                                </AlertDescription>
                              </Alert>
                            )}
                            <Button
                              type="submit"
                              className="w-full h-12 text-lg bg-gradient-to-r from-[#ff0050] to-cyan-600 hover:from-[#e00040] hover:to-cyan-700 text-white rounded-lg"
                              disabled={isGenerating}
                            >
                              {isGenerating ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              ) : (
                                <Sparkles className="mr-2 h-5 w-5" />
                              )}
                              {isGenerating ? "Creating Magic..." : "Generate Smart Plan"}
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  ) : (
                    /* Preferences Section */
                    <div className="w-full max-w-2xl space-y-8">
                      <Alert className="bg-blue-50 border-blue-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <AlertTitle className="text-blue-800 font-semibold text-lg">
                              Personalize Your Experience
                            </AlertTitle>
                            <AlertDescription className="text-blue-700">
                              Tell us your preferences to unlock personalized travel plans
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                      
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    


export default HomePage;