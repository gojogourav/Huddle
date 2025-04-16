// components/ScrollablePreferencesForm.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
// Import useForm and useWatch
import { useForm, useWatch } from 'react-hook-form';
import { Loader2, Save, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react';

// Assuming these are shadcn/ui components, adjust paths if needed
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";

// Auth and Options (adjust paths if needed)
import { useAuth } from '@/hooks/useAuth';
import {
    paceOptions, budgetOptions, interestOptions, accommodationOptions, UserPreferences
} from '@/lib/preferencesOptions';

// --- Zod Schema ---
// Use Solution 2: Remove .default([]) from arrays in schema
const preferencesFormSchema = z.object({
    pace: z.enum(['relaxed', 'moderate', 'fast-paced']).optional().nullable(),
    budget: z.enum(['budget-friendly', 'mid-range', 'luxury']).optional().nullable(),
    interests: z.array(z.string()).optional(), // REMOVED .default([])
    accommodation: z.array(z.string()).optional(), // REMOVED .default([])
});
// This type will now correctly infer string[] | undefined for arrays
type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;


// --- Step Input Components ---

interface StepInputProps {
    control: any; // Control object from useForm
    isSaving: boolean;
}

// --- Pace Input ---
function PaceInput({ control, isSaving }: StepInputProps) {
    return (
        <FormField control={control} name="pace" render={({ field }) => (
            <FormItem className="space-y-3">
                <FormLabel className="font-semibold text-base">Preferred Travel Pace</FormLabel>
                <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="grid grid-cols-1 gap-3" disabled={isSaving}>
                        {paceOptions.map(option => (
                            <FormItem key={option.value} className="flex items-center space-x-3 space-y-0 border p-4 rounded-md hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors has-[[data-state=checked]]:border-cyan-500 has-[[data-state=checked]]:bg-cyan-50/50 dark:has-[[data-state=checked]]:bg-cyan-900/20">
                                {/* No nested FormControl */}
                                <RadioGroupItem value={option.value} id={`pace-${option.value}`} />
                                <FormLabel htmlFor={`pace-${option.value}`} className="font-normal cursor-pointer w-full text-sm leading-tight">{option.label}</FormLabel>
                            </FormItem>
                        ))}
                    </RadioGroup>
                </FormControl>
                <FormMessage />
            </FormItem>
        )} />
    );
}

// --- Budget Input ---
function BudgetInput({ control, isSaving }: StepInputProps) {
     return (
        <FormField control={control} name="budget" render={({ field }) => (
            <FormItem className="space-y-3">
                 <FormLabel className="font-semibold text-base">Typical Budget Level</FormLabel>
                 <FormControl>
                     <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="grid grid-cols-1 gap-3" disabled={isSaving}>
                         {budgetOptions.map(option => (
                             <FormItem key={option.value} className="flex items-center space-x-3 space-y-0 border p-4 rounded-md hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors has-[[data-state=checked]]:border-cyan-500 has-[[data-state=checked]]:bg-cyan-50/50 dark:has-[[data-state=checked]]:bg-cyan-900/20">
                                {/* No nested FormControl */}
                                <RadioGroupItem value={option.value} id={`budget-${option.value}`} />
                                <FormLabel htmlFor={`budget-${option.value}`} className="font-normal cursor-pointer w-full text-sm leading-tight">{option.label}</FormLabel>
                             </FormItem>
                         ))}
                     </RadioGroup>
                 </FormControl>
                <FormMessage />
            </FormItem>
        )} />
    );
}


// --- Interests Input ---
function InterestsInput({ control, isSaving }: StepInputProps) {
    return (
        <FormField
            control={control}
            name="interests"
            render={({ field }) => ( // field represents the 'interests' array state
                <FormItem>
                    <FormLabel className="font-semibold text-base mb-3 block">Interests (Select all that apply)</FormLabel>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {interestOptions.map((item) => (
                            // Each option is an item, managed within the field array logic
                            <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0 border p-3 rounded-md hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors cursor-pointer has-[[data-state=checked]]:border-cyan-500 has-[[data-state=checked]]:bg-cyan-50/50 dark:has-[[data-state=checked]]:bg-cyan-900/20">
                                <FormControl>
                                    <Checkbox
                                        disabled={isSaving}
                                        // Use nullish coalescing for safety
                                        checked={(field.value ?? []).includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            const currentValues = field.value ?? []; // Ensure array
                                            return checked
                                                ? field.onChange([...currentValues, item.id]) // Add
                                                : field.onChange(currentValues.filter((value: string) => value !== item.id)); // Remove
                                        }}
                                        id={`interest-${item.id}`}
                                    />
                                </FormControl>
                                <FormLabel htmlFor={`interest-${item.id}`} className="text-sm font-normal cursor-pointer w-full leading-tight">{item.label}</FormLabel>
                            </FormItem>
                        ))}
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

// --- Accommodation Input ---
function AccommodationInput({ control, isSaving }: StepInputProps) {
     return (
        <FormField
            control={control}
            name="accommodation"
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-semibold text-base mb-3 block">Preferred Accommodation</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {accommodationOptions.map((item) => (
                             <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0 border p-3 rounded-md hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors cursor-pointer has-[[data-state=checked]]:border-cyan-500 has-[[data-state=checked]]:bg-cyan-50/50 dark:has-[[data-state=checked]]:bg-cyan-900/20">
                                <FormControl>
                                    <Checkbox
                                        disabled={isSaving}
                                        checked={(field.value ?? []).includes(item.id)} // Use ?? []
                                        onCheckedChange={(checked) => {
                                             const currentValues = field.value ?? []; // Use ?? []
                                            return checked
                                                ? field.onChange([...currentValues, item.id])
                                                : field.onChange(currentValues.filter((value: string) => value !== item.id));
                                        }}
                                        id={`accom-${item.id}`}
                                    />
                                </FormControl>
                                <FormLabel htmlFor={`accom-${item.id}`} className="text-sm font-normal cursor-pointer w-full leading-tight">{item.label}</FormLabel>
                            </FormItem>
                        ))}
                    </div>
                    <FormMessage />
                </FormItem>
             )}
        />
    );
}


// --- Summary Display ---
function SummaryDisplay({ control }: StepInputProps) { // Takes control prop
    // Use useWatch hook with the passed control object
    const watchedValues = useWatch({ control }) as PreferencesFormValues;

    const getLabel = (options: {value: string; label: string}[], value: string | null | undefined) => options.find(opt => opt.value === value)?.label || <em className="text-gray-500 dark:text-gray-400">Not Selected</em>;
    const getLabels = (options: {id: string; label: string}[], values: string[] | undefined) => {
        if (!values || values.length === 0) return <em className="text-gray-500 dark:text-gray-400">None Selected</em>;
        return values.map(val => options.find(opt => opt.id === val)?.label).filter(Boolean).join(', ');
    }

    return (
        <div className="space-y-3 text-sm p-4 border rounded-md bg-gray-50/50 dark:bg-gray-800/30">
             <h4 className="font-semibold text-base mb-3 text-gray-800 dark:text-gray-200">Review Your Choices:</h4>
             <p><strong className="font-medium text-gray-700 dark:text-gray-300 w-24 inline-block">Pace:</strong> {getLabel(paceOptions, watchedValues.pace)}</p>
             <p><strong className="font-medium text-gray-700 dark:text-gray-300 w-24 inline-block">Budget:</strong> {getLabel(budgetOptions, watchedValues.budget)}</p>
             <p><strong className="font-medium text-gray-700 dark:text-gray-300 w-24 inline-block">Interests:</strong> {getLabels(interestOptions, watchedValues.interests)}</p>
             <p><strong className="font-medium text-gray-700 dark:text-gray-300 w-24 inline-block">Accommodation:</strong> {getLabels(accommodationOptions, watchedValues.accommodation)}</p>
        </div>
    );
}

// Define steps configuration *after* component functions are defined
const preferenceSteps = [
    { id: 'pace', label: 'Preferred Travel Pace', Component: PaceInput },
    { id: 'budget', label: 'Typical Budget Level', Component: BudgetInput },
    { id: 'interests', label: 'Interests', Component: InterestsInput },
    { id: 'accommodation', label: 'Preferred Accommodation', Component: AccommodationInput },
    { id: 'summary', label: 'Confirm Preferences', Component: SummaryDisplay },
];
const TOTAL_STEPS = preferenceSteps.length;


// --- Main Form Component ---
interface PreferencesFormProps {
    initialPreferences?: UserPreferences | null;
    onSaveSuccess?: (prefs: UserPreferences) => void;
}

export function ScrollablePreferencesForm({ initialPreferences, onSaveSuccess }: PreferencesFormProps) {
    const router = useRouter();
    const { currentUser, isLoading: authLoading, refetchUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    // *** FIX: Initialize useRef with the correct type for an array of refs ***
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
     // Ensure the array has the correct number of elements initially
     useEffect(() => {
        stepRefs.current = stepRefs.current.slice(0, TOTAL_STEPS);
     }, []);


    // Get the full form object from useForm
    const form = useForm<PreferencesFormValues>({
        resolver: zodResolver(preferencesFormSchema),
        // Explicitly provide default arrays here for the initial state
        defaultValues: {
            pace: initialPreferences?.pace ?? null,
            budget: initialPreferences?.budget ?? null,
            interests: initialPreferences?.interests ?? [],
            accommodation: initialPreferences?.accommodation ?? [],
        },
        mode: 'onChange',
    });
    // Destructure methods needed
    const { control, handleSubmit, reset, trigger } = form;

    // Effect to reset form when initial data changes
    useEffect(() => {
        reset({
            pace: initialPreferences?.pace ?? null,
            budget: initialPreferences?.budget ?? null,
            interests: initialPreferences?.interests ?? [], // Ensure array
            accommodation: initialPreferences?.accommodation ?? [], // Ensure array
        });
    }, [initialPreferences, reset]);

    // --- Scrolling Function ---
    const scrollToStep = (index: number) => {
        console.log(`Scrolling to step ${index}, ref:`, stepRefs.current[index]);
        stepRefs.current[index]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center', // Changed to 'center' for better visibility
        });
        setCurrentStepIndex(index); // Update highlighted/focused step
    };

    // --- Navigation Handlers ---
    const handleNextStep = async () => {
        const currentFieldId = preferenceSteps[currentStepIndex].id;
        if (currentFieldId !== 'summary') {
            // Only trigger validation for fields belonging to the current step schema if needed
            // For simplicity, we can just try to proceed
            const isValid = await trigger(currentFieldId as keyof PreferencesFormValues); // Validate before proceeding
            if (!isValid) {
                console.log(`Validation failed for step: ${currentFieldId}`);
                // Focus the element for better UX?
                 stepRefs.current[currentStepIndex]?.focus(); // Might need tabindex="-1" on the div
                return;
            };
        }
        const nextIndex = Math.min(currentStepIndex + 1, TOTAL_STEPS - 1);
        scrollToStep(nextIndex);
    };

    const handlePrevStep = () => {
        const prevIndex = Math.max(currentStepIndex - 1, 0);
        scrollToStep(prevIndex);
    };

    // --- Form Submission ---
    async function onSubmit(values: PreferencesFormValues) {
        if (!currentUser) { setError("Authentication error."); return; }
        setIsSaving(true); setError(null); setSuccessMessage(null);
        try {
            const submissionData: UserPreferences = {
                pace: values.pace || null,
                budget: values.budget || null,
                interests: values.interests ?? [], // Ensure array on submit
                accommodation: values.accommodation ?? [], // Ensure array on submit
            };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/user/profile/preferences`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(submissionData),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to save.');

            setSuccessMessage("Preferences saved successfully!");
            await refetchUser(); // Update auth context
            if (onSaveSuccess) onSaveSuccess(submissionData);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) { setError(err.message || "An error occurred."); }
        finally { setIsSaving(false); }
    }

    if (authLoading) { return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>; }

    const progressValue = ((currentStepIndex + 1) / TOTAL_STEPS) * 100;

    return (
        <div className="w-full max-w-lg mx-auto">
            <Card className="shadow-xl border-gray-200 dark:border-gray-700">
                <CardHeader className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm z-10 border-b">
                    <Progress value={progressValue} className="w-full h-2 mb-3" />
                    <CardTitle className="text-xl font-semibold text-center">Your Travel Preferences</CardTitle>
                    <CardDescription className="text-center text-sm text-gray-500 dark:text-gray-400 pt-1">
                        Step {currentStepIndex + 1} of {TOTAL_STEPS}: {preferenceSteps[currentStepIndex].label}
                    </CardDescription>
                </CardHeader>

                 <Form {...form}>
                     <form onSubmit={handleSubmit(onSubmit)}>
                         {/* Scrollable content area */}
                         {/* Adjust max-h based on your layout */}
                         <CardContent className="space-y-10 p-4 md:p-6 max-h-[calc(100vh-300px)] overflow-y-auto" id="preference-scroll-area">
                            {preferenceSteps.map(({ id, label, Component }, index) => (
                                // Section for each step
                                <div
                                    key={id}
                                    // *** FIX: Correctly assign ref to the array element ***
                                    ref={el => { stepRefs.current[index] = el; }}
                                    id={`step-${id}`} // Add ID for potential direct linking/focusing
                                    className="py-4 scroll-mt-24 border-b last:border-b-0 dark:border-gray-700 outline-none" // Added scroll margin top and outline-none
                                    tabIndex={-1} // Make div focusable for scrolling
                                >
                                    {/* Label moved to header, render component directly */}
                                    <Component control={control} isSaving={isSaving} />
                                    {/* Display field-specific errors if needed (FormMessage is inside component now) */}
                                </div>
                            ))}
                         </CardContent>

                         {/* Sticky Footer */}
                         <CardFooter className="flex justify-between border-t pt-4 pb-4 sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-10">
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStepIndex === 0 || isSaving}>
                                <ArrowUp className="mr-2 h-4 w-4" /> Previous
                            </Button>
                            {currentStepIndex < TOTAL_STEPS - 1 ? (
                                <Button type="button" onClick={handleNextStep} disabled={isSaving}>
                                    Next <ArrowDown className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button type="submit" className="bg-[#ff0050] hover:bg-black text-white" disabled={isSaving}>
                                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/> Save Preferences</>}
                                </Button>
                            )}
                         </CardFooter>
                     </form>
                 </Form>

                 {/* Global Error/Success Below Footer */}
                 {(error || successMessage) && (
                    <div className={`p-3 text-center text-sm font-medium border-t ${error ? 'text-red-600 bg-red-50 dark:bg-red-900/30' : 'text-green-600 bg-green-50 dark:bg-green-900/30'}`}>
                         {error || successMessage}
                         {successMessage && <CheckCircle className="inline-block ml-2 h-4 w-4" />}
                    </div>
                 )}
            </Card>
        </div>
    );
}

export default ScrollablePreferencesForm; // Ensure default export matches filename if using page router convention