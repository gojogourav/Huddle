// app/plan/generate/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, Sparkles, Info, CheckCircle, List, Trash2, Star, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

// UI Components (Adjust paths if necessary)
import { Button } from '@/components/ui/button';
// Import ALL form components from shadcn/ui
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Hooks, Types, Utils (Adjust paths if necessary)
import { useAuth } from '@/hooks/useAuth'; // Assuming this hook provides { currentUser, isLoading, refetchUser }
import { UserPreferences } from '@/lib/preferencesOptions'; // Assuming this type exists { pace?, budget?, interests?, accommodation? }

// --- Types ---
interface SavedPlanInfo {
    id: string;
    title: string;
    location: string;
    createdAt: string; // ISO String
    isActive: boolean;
}
interface FetchMyPlansResponse {
    success: boolean;
    plans: SavedPlanInfo[];
    message?: string;
}
// Schema for the location input form ONLY
const generateLocationSchema = z.object({
    location: z.string().trim().min(3, "Please enter a valid city/area (min 3 chars)").max(100, "Location is too long (max 100 chars)"),
});
type GenerateLocationFormValues = z.infer<typeof generateLocationSchema>;

// Type for the expected response when generating a plan
interface GeneratedPlanResponseData {
    plan?: { location?: string }; // Backend might return generated plan details
    planId: string;
    success: boolean;
    message?: string;
}

// --- Page Component ---
function GeneratePlanPage() {
    const router = useRouter();
    const { currentUser, isLoading: authLoading, refetchUser } = useAuth();

    // State for Plan Generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

    // State for User Preferences
    const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
    const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
    const [prefsError, setPrefsError] = useState<string | null>(null);
    const hasRequiredPreferences = !!userPreferences?.interests && userPreferences.interests.length > 0;

    // State for List of Saved Plans
    const [savedPlans, setSavedPlans] = useState<SavedPlanInfo[]>([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const [plansError, setPlansError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // Tracks ID being acted upon
    const [actionErrorState, setActionErrorState] = useState<string | null>(null);

    // --- Form Hook for Location Input ---
    // Initialize the form using useForm
    const form = useForm<GenerateLocationFormValues>({
        resolver: zodResolver(generateLocationSchema),
        defaultValues: { location: '' },
        mode: 'onChange', // Validate as user types for better feedback
    });
    const { control, handleSubmit, reset } = form; // Destructure needed methods

    // --- Fetch Preferences ---
    const loadPreferences = useCallback(async () => {
        if (authLoading || !currentUser) {
            if (!authLoading && !currentUser) router.replace('/login?message=Login required');
            setIsLoadingPrefs(false); return;
        }
        setIsLoadingPrefs(true); setPrefsError(null); setUserPreferences(null);
        const prefsFromContext = (currentUser as any)?.preferences; // Check context first
        if (prefsFromContext?.interests?.length > 0) { // Check interests specifically
            setUserPreferences(prefsFromContext as UserPreferences);
            setIsLoadingPrefs(false); return;
        }
        // Fallback fetch if not in context or incomplete
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/user/profile`, { credentials: 'include', cache: 'no-store' });
            if (!response.ok) throw new Error(`Fetch profile failed (${response.status})`);
            const data = await response.json();
            // Check structure carefully before setting state
            if (data.success && data.data?.preferences && typeof data.data.preferences === 'object') {
                 setUserPreferences(data.data.preferences);
            } else { setUserPreferences(null); }
        } catch (err: any) { setPrefsError("Could not load preferences."); setUserPreferences(null); }
        finally { setIsLoadingPrefs(false); }
    }, [currentUser, authLoading, router]); // Dependencies

    useEffect(() => { loadPreferences(); }, [loadPreferences]);

    // --- Fetch Saved Plans ---
    const fetchSavedPlans = useCallback(async () => {
        if (!currentUser) return;
        setIsLoadingPlans(true); setPlansError(null);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/tour-plan/my-plans`, { credentials: 'include', cache: 'no-store' });
            if (!response.ok) throw new Error(`Fetch saved plans failed (${response.status})`);
            const data: FetchMyPlansResponse = await response.json();
            if (!data.success || !Array.isArray(data.plans)) throw new Error(data.message || "Invalid plans data.");
            setSavedPlans(data.plans);
        } catch (err: any) { setPlansError(err.message || "Failed."); setSavedPlans([]); }
        finally { setIsLoadingPlans(false); }
    }, [currentUser]);

    useEffect(() => { fetchSavedPlans(); }, [fetchSavedPlans]);

    // --- Plan Generation Submission Handler ---
    const onSubmitGeneration = async (values: GenerateLocationFormValues) => {
        if (!currentUser || isLoadingPrefs || !hasRequiredPreferences) {
            setGenerateError("Cannot generate: Preferences missing or loading."); return;
        }
        setIsGenerating(true); setGenerateError(null); setGenerateSuccess(null); setActionErrorState(null);
        try {
            const requestBody = { location: values.location }; // Only send location
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/tour-plan/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(requestBody) });
            const data: GeneratedPlanResponseData = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || `Failed (${response.status})`);

            const generatedLocation = data.plan?.location || values.location;
            setGenerateSuccess(`Generated plan for ${generatedLocation}! It's now active.`);
            reset({ location: '' }); // Clear location input using form's reset
            await refetchUser();      // Update context (active plan ID likely changed)
            await fetchSavedPlans();  // Refresh the list
            setTimeout(() => setGenerateSuccess(null), 5000); // Clear success message
        } catch (err: any) { setGenerateError(err.message || "Error generating plan."); }
        finally { setIsGenerating(false); }
    }

    // --- Set Active Plan Handler ---
    const handleSetActivePlan = async (planId: string) => {
        if (actionLoading || isGenerating) return; // Prevent overlap
        setActionLoading(planId); setActionErrorState(null); setGenerateSuccess(null);
        try {
            // Ensure Backend Endpoint exists: PUT /api/tour-plan/set-active/:planId
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/tour-plan/set-active/${planId}`, { method: 'PUT', credentials: 'include' });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Failed.");
            await refetchUser();      // Update context
            await fetchSavedPlans();  // Refresh list UI
            setGenerateSuccess(`Plan set as active!`); // Use general success message area
            setTimeout(() => setGenerateSuccess(null), 4000);
        } catch (err: any) { setActionErrorState(err.message || "Could not set active."); }
        finally { setActionLoading(null); }
    }

    // --- Delete Plan Handler ---
    const handleDeletePlan = async (planId: string) => {
        if (actionLoading || isGenerating) return;
        setActionLoading(planId); setActionErrorState(null); setGenerateSuccess(null);
        try {
            // Ensure Backend Endpoint exists: DELETE /api/tour-plan/:planId
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/tour-plan/${planId}`, { method: 'DELETE', credentials: 'include' });
            if (!response.ok && response.status !== 204) { const d = await response.json().catch(() => ({})); throw new Error(d.message || `Failed (${response.status})`); }
            await fetchSavedPlans(); // Refresh list
            if (currentUser?.activeTourPlanid === planId) await refetchUser(); // Update context if active deleted
        } catch (err: any) { setActionErrorState(err.message || "Could not delete."); }
        finally { setActionLoading(null); }
    }

    // --- Render Logic ---
    // Initial Loading Checks
    if (authLoading) { return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-[#ff0050]" /></div>; }
    if (!currentUser) { return null; } // Redirect handled in effect
    if (isLoadingPrefs) { return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-[#ff0050]" /></div>; }

    // Prompt to set preferences if missing
    if (!hasRequiredPreferences) {
        return (
            <div className="container mx-auto py-10 px-4 max-w-lg text-center">
                 <Alert variant="default" className="bg-yellow-50 border-yellow-400 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-100">
                     <Info className="h-4 w-4 !stroke-yellow-700" />
                    <AlertTitle className="font-semibold">Set Your Preferences!</AlertTitle>
                    <AlertDescription>
                         {prefsError || "To generate personalized plans, please set your travel interests first."}
                         <br />
                         <Button variant="link" className="text-yellow-800 dark:text-yellow-200 h-auto p-0 mt-2 underline" asChild>
                              <Link href="/settings/preferences">Go to Preferences</Link>
                         </Button>
                    </AlertDescription>
                 </Alert>
            </div>
        );
    }

    // Main Generation UI + Plan List
    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-12">
             <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4 self-start">
                 <ArrowLeft className="mr-2 h-4 w-4" /> Back
             </Button>

            {/* Generation Card */}
            <Card className="shadow-lg border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">Generate a New Day Plan</CardTitle>
                    <CardDescription className="text-center text-gray-500 dark:text-gray-400 pt-1">
                        Enter your destination. We'll use your saved preferences.
                    </CardDescription>
                    {/* Display summary of preferences */}
                    {userPreferences && (
                        <div className="text-xs text-center text-gray-500 dark:text-gray-400 pt-3 border-t mt-3">
                             Using: Pace: {userPreferences.pace || 'Any'}, Budget: {userPreferences.budget || 'Any'}, Interests: {userPreferences.interests?.slice(0, 3).join(', ')}{userPreferences.interests && userPreferences.interests.length > 3 ? '...' : ''}.
                             <Button variant="link" className="p-0 h-auto ml-2 text-cyan-600 dark:text-cyan-400 text-[11px] underline hover:text-cyan-800" asChild>
                                <Link href="/settings/preferences">Edit</Link>
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {/* Pass the form object to the Form provider */}
                    <Form {...form}>
                        {/* The actual HTML form element */}
                        <form onSubmit={handleSubmit(onSubmitGeneration)} className="space-y-4">
                            {/* Location Input Field */}
                            <FormField
                                control={control} // Use control from the main form instance
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Destination City/Area</FormLabel>
                                        {/* FormControl wraps the single Input child */}
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Bangalore, Kyoto, Manhattan"
                                                {...field} // Spread field props (onChange, onBlur, value, ref)
                                                disabled={isGenerating}
                                            />
                                        </FormControl>
                                        <FormMessage /> {/* Displays validation errors */}
                                    </FormItem>
                                )}
                            />
                            {/* Generation Specific Error */}
                            {generateError && <p className="text-sm font-medium text-red-600 text-center pt-1">{generateError}</p>}
                            {/* Generation Success Message */}
                            {generateSuccess && !isGenerating && (
                                <Alert variant="default" className="bg-green-50 border-green-300 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-100">
                                    <CheckCircle className="h-4 w-4 !stroke-green-700" />
                                    <AlertTitle className="font-semibold">Success!</AlertTitle>
                                    <AlertDescription>
                                        {generateSuccess}
                                        <Button variant="link" className="p-0 h-auto ml-2 text-green-800 dark:text-green-200 underline" asChild>
                                            <Link href="/">View Active Plan</Link>
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            )}
                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full py-3 bg-[#ff0050] hover:bg-black text-white rounded-md transition-colors flex items-center justify-center"
                                disabled={isGenerating || isLoadingPrefs}
                            >
                                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Plan</>}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* List of Saved Plans */}
            <div className="mt-12">
                <h2 className="text-xl font-semibold mb-4 flex items-center"><List className="mr-2 h-5 w-5 text-gray-600 dark:text-gray-400"/> Your Saved Plans</h2>
                 {isLoadingPlans && (<div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-[#ff0050]" /></div>)}
                 {plansError && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error Loading Plans</AlertTitle><AlertDescription>{plansError}</AlertDescription></Alert>)}
                 {actionErrorState && (<Alert variant="destructive" className="mt-2"><AlertCircle className="h-4 w-4" /><AlertTitle>Action Error</AlertTitle><AlertDescription>{actionErrorState}</AlertDescription></Alert>)}

                 {!isLoadingPlans && !plansError && savedPlans.length === 0 && ( <p className="text-center text-neutral-500">You haven't generated any plans yet.</p> )}

                 {!isLoadingPlans && !plansError && savedPlans.length > 0 && (
                     <ul className="space-y-3">
                         {savedPlans.map(plan => (
                             <li key={plan.id} className={`flex items-center justify-between p-3 border rounded-md shadow-sm transition-colors ${plan.isActive ? 'bg-cyan-50/50 border-cyan-300 dark:bg-cyan-900/20 dark:border-cyan-700' : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'}`}>
                                 {/* Plan Info */}
                                 <div className="flex-1 min-w-0 mr-2">
                                     <p className={`font-medium text-sm truncate ${plan.isActive ? 'text-cyan-800 dark:text-cyan-100' : 'text-gray-800 dark:text-gray-100'}`} title={plan.title}>{plan.title}</p>
                                     <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={plan.location}>
                                        {plan.location} - Created {format(new Date(plan.createdAt), "MMM d, yyyy")}
                                     </p>
                                 </div>
                                 {/* Action Buttons */}
                                 <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                                      {plan.isActive ? (
                                           <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full dark:bg-green-900/50 dark:text-green-300 inline-flex items-center flex-shrink-0"> <Star className="mr-1 h-3 w-3 fill-current"/> Active </span>
                                      ) : (
                                          <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => handleSetActivePlan(plan.id)} disabled={actionLoading === plan.id} aria-label={`Set ${plan.title} as active`}>
                                               {actionLoading === plan.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <Star className="mr-1 h-3 w-3"/>} Set Active
                                           </Button>
                                      )}
                                      {/* Delete Confirmation */}
                                      <AlertDialog>
                                         <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500" disabled={actionLoading === plan.id} aria-label={`Delete plan ${plan.title}`}>
                                                 {actionLoading === plan.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                             </Button>
                                         </AlertDialogTrigger>
                                         <AlertDialogContent>
                                             <AlertDialogHeader><AlertDialogTitle>Delete Plan?</AlertDialogTitle><AlertDialogDescription>Permanently delete "{plan.title}"?</AlertDialogDescription></AlertDialogHeader>
                                             <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePlan(plan.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                                         </AlertDialogContent>
                                     </AlertDialog>
                                 </div>
                             </li>
                         ))}
                     </ul>
                )}
            </div>
        </div>
    );
}

export default GeneratePlanPage;