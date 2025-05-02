// app/page.tsx (or your designated home page route)
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Settings, Info, AlertCircle, Compass, MapPinned } from 'lucide-react';
import { useRef } from 'react';
import { useAuth } from '@/hooks/useAuth'; 
import PlanDisplay from '@/components/PlnDisplay';
import { UserPreferences } from '@/lib/preferencesOptions'; 
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // For preference prompt
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // For location input form
import * as z from 'zod'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
// import InfiniteBanner from '@/components/homepage/InfiniteBanner';


interface ScheduleItem { time_slot: string; activity_title: string; description: string; local_insight: string; estimated_duration_minutes: number; budget_indicator: string; transport_suggestion?: string; }
interface GeneratedOneDayPlan { plan_title: string; location: string; date_applicable: string; plan_summary: string; schedule: ScheduleItem[]; }

const locationSchema = z.object({
    location: z.string().min(3, "Please enter a valid city/area").max(100),
});
type LocationFormValues = z.infer<typeof locationSchema>;


function HomePage() {
    const { currentUser, isLoading: authLoading, refetchUser } = useAuth();
    const [activePlan, setActivePlan] = useState<GeneratedOneDayPlan | null>(null);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [showGenerateForm, setShowGenerateForm] = useState(false); 
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [isInitialCheckLoading, setIsInitialCheckLoading] = useState(true);
    const [hasPreferences, setHasPreferences] = useState(false); 
    const featuresRef = useRef<HTMLDivElement|null> (null);

    const locationForm = useForm<LocationFormValues>({
        resolver: zodResolver(locationSchema),
        defaultValues: { location: '' },
    });

    useEffect(() => {
        setIsInitialCheckLoading(true);
        console.log("[HomePage] Auth Loading:", authLoading, "CurrentUser:", !!currentUser);

        if (!authLoading && currentUser) {
             const userWithDetails = currentUser as typeof currentUser & { preferences?: UserPreferences | null; activeTourPlan?: { id: string; planData: any | null } | null }; // Type assertion

            const prefs = userWithDetails.preferences;
            const plan = userWithDetails.activeTourPlan;

             console.log("[HomePage] User loaded. Prefs:", prefs, "Active Plan:", plan);


            if (plan?.planData) {
                console.log("[HomePage] Active plan found in AuthContext.");
                 try {
                    const parsedPlan = typeof plan.planData === 'string' ? JSON.parse(plan.planData) : plan.planData;
                     if (parsedPlan && parsedPlan.schedule) {
                         setActivePlan(parsedPlan as GeneratedOneDayPlan);
                         setActivePlanId(plan.id);
                         setShowGenerateForm(false);
                     } else {
                         console.warn("Active plan data found but structure is invalid.");
                         setActivePlan(null); 
                         setActivePlanId(null);
                         setShowGenerateForm(true);
                     }

                 } catch (e) {
                     console.error("Failed to parse active plan data:", e);
                     setActivePlan(null); 
                     setActivePlanId(null);
                     setShowGenerateForm(true); 
                 }

            } else {
                 console.log("[HomePage] No active plan found in AuthContext.");
                 setActivePlan(null);
                 setActivePlanId(null);
                 setShowGenerateForm(true);
            }

            if (prefs && Array.isArray(prefs.interests) && prefs.interests.length > 0) {
                 setHasPreferences(true);
                 console.log("[HomePage] User has preferences set.");
            } else {
                 setHasPreferences(false);
                 console.log("[HomePage] User preferences are missing or incomplete.");
            }
            setIsInitialCheckLoading(false);

        } else if (!authLoading && !currentUser) {
            console.log("[HomePage] User not logged in.");
            setActivePlan(null);
            setActivePlanId(null);
            setShowGenerateForm(false);
            setHasPreferences(false);
            setIsInitialCheckLoading(false);
        }
         else {
            console.log("[HomePage] Waiting for auth check...");
         }

    }, [currentUser, authLoading]); 

    const handleGeneratePlan = async (values: LocationFormValues) => {
        if (!currentUser || !hasPreferences) {
            setGenerateError("Cannot generate plan. Ensure you are logged in and have set preferences.");
            return;
        }
        setIsGenerating(true); setGenerateError(null);

        try {
            const requestBody = { location: values.location }; 
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/tour-plan/generate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(requestBody),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to generate plan.');

            console.log("Generated Plan Directly:", data);
            setActivePlan(data.plan); 
            setActivePlanId(data.planId);
            setShowGenerateForm(false); 

        } catch (err: any) {
            console.error("Direct Plan Generation Error:", err);
            setGenerateError(err.message || "An unexpected error occurred.");
            setActivePlan(null); 
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePreferencesSaved = (savedPrefs: UserPreferences) => {
        console.log("[HomePage] Preferences saved callback received.");
        if (savedPrefs.interests && savedPrefs.interests.length > 0) {
             setHasPreferences(true);
             setShowGenerateForm(true);
        }
    };


    if (isInitialCheckLoading || authLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-[#ff0050]" /></div>;
    }

    if (!currentUser) {
         return (
          <div className="min-h-screen flex flex-col  bg-gradient-to-br from-cyan-50 via-white to-blue-100 scroll-smooth dark:from-slate-900 dark:via-gray-900 dark:to-black">

          <main className="flex-grow flex flex-col">
              <section className="relative flex flex-col  items-center justify-center text-center min-h-[60vh] md:min-h-[75vh] px-4 pt-24 pb-16 overflow-hidden">
                  <div className="relative z-10 max-w-3xl">
                      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4 text-gray-900 dark:text-gray-50">
                          Plan Your Perfect <span className="text-[#0b6dff]">Day Trip</span>, Effortlessly.
                      </h1>
                      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
                          Stop searching, start exploring. Huddle uses AI and your preferences to craft unique, local-infused itineraries in minutes.
                      </p>
                      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                          <Button size="lg" asChild className="bg-[#0b6dff] hover:bg-black text-white px-8 py-3 text-lg w-full sm:w-auto">
                              <Link href="/register">Get Started Free</Link>
                          </Button>
                          <Button variant="outline" size="lg" asChild className="px-8 py-3 text-lg w-full sm:w-auto border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                              <Link href="#features" onClick={(e)=> 
                             { 
                               e.preventDefault();
                              featuresRef.current?.scrollIntoView({
                                "behavior":"smooth",
                              })}}>Learn More</Link>
                          </Button>
                      </div>
                  </div>
              </section>

              <section id="features"  ref={featuresRef} className="scroll-mt-28 scroll-smooth py-16 md:py-24 bg-white dark:bg-gray-900/50">
                  <div className="container mx-auto px-4 max-w-5xl">
                      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800 dark:text-gray-100">How Huddle Works</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                          <div className="flex flex-col items-center text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50">
                              <div className="p-3 rounded-full bg-[#ff0050]/10 mb-4">
                                   <Settings className="h-8 w-8 text-[#0b6dff]" />
                              </div>
                              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">1. Set Preferences</h3>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">
                                  Tell us your travel style – pace, budget, interests, and preferred accommodation. Quick & easy multiple choice.
                              </p>
                          </div>
                          <div className="flex flex-col items-center text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50">
                               <div className="p-3 rounded-full bg-cyan-500/10 mb-4">
                                   <Sparkles className="h-8 w-8 text-cyan-500" />
                               </div>
                              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">2. Generate Plan</h3>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">
                                  Enter your destination city or area. Our AI crafts a unique, detailed one-day itinerary just for you in seconds.
                              </p>
                          </div>
                           <div className="flex flex-col items-center text-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50">
                              <div className="p-3 rounded-full bg-green-500/10 mb-4">
                                  <Compass className="h-8 w-8 text-green-500" />
                              </div>
                              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">3. Explore!</h3>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">
                                  Follow your personalized timeline, discover local gems, enjoy authentic experiences, and make the most of your day.
                              </p>
                          </div>
                      </div>
                  </div>
              </section>

              <section className="py-16 md:py-24 bg-gradient-to-br from-cyan-50 via-white to-pink-100 dark:from-slate-900 dark:via-gray-900 dark:to-black">
                   <div className="container mx-auto px-4 max-w-3xl text-center">
                        <blockquote className="text-xl italic text-gray-700 dark:text-gray-300 mb-4">
                            "Huddle planned my Bangalore day trip perfectly! Discovered amazing street food I wouldn't have found otherwise. So much better than generic guides."
                        </blockquote>
                        <p className="font-semibold text-gray-600 dark:text-gray-400">- Happy Traveler</p>
                   </div>
                   <div>
                    {/* <InfiniteBanner clock={undefined} children={undefined}/> */}
                   </div>
              </section>

               <section className="py-16 md:py-20 bg-white dark:bg-gray-900/50">
                  <div className="container mx-auto px-4 max-w-3xl text-center">
                      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">Ready to Explore?</h2>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                          Sign up today and generate your first personalized travel plan for free!
                      </p>
                       <Button size="lg" asChild className="bg-[#0b6dff] hover:bg-black text-white px-10 py-3 text-lg">
                          <Link href="/register">Create Your Plan</Link>
                       </Button>
                  </div>
               </section>
          </main>

          <footer className="py-6 px-4 md:px-8 text-center text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-800 bg-gray-50 dark:bg-slate-900">
              © {new Date().getFullYear()} Huddle App. All rights reserved. | <Link href="/privacy" className="hover:underline">Privacy Policy</Link> | <Link href="/terms" className="hover:underline">Terms of Service</Link>
          </footer>
      </div>
        );
    }
const router = useRouter()
    return (
        <div className="container overflow-hidden   rounded-xl  mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="max-w-7xl mx-auto">
              {activePlan ? (
                <div className="">
                  <div className="flex flex-col   md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">Your Active Plan</h1>
                      <p className="text-gray-500 mt-1">{activePlan.location} • {activePlan.date_applicable}</p>
                    </div>
                    <Button 
                      onClick={() => router.push('/plan/generate')}
                      className="bg-[#0b6dff] hover:bg-black cursor-pointer"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      New Plan
                    </Button>
                  </div>
                  <PlanDisplay plan={activePlan} planId={activePlanId ?? undefined} />
                </div>
              ) : (
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
                              className="w-full h-12 text-lg bg-gradient-to-r from-[#0b6dff] to-cyan-600 hover:from-[#e00040] hover:to-cyan-700 text-white rounded-lg"
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