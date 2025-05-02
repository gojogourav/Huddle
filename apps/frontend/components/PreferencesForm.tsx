// components/ScrollablePreferencesForm.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Loader2, Save, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Import ScrollArea

import { useAuth } from '@/hooks/useAuth';
import {
    paceOptions, budgetOptions, interestOptions, accommodationOptions, UserPreferences
} from '@/lib/preferencesOptions';

const preferencesFormSchema = z.object({
    pace: z.enum(['relaxed', 'moderate', 'fast-paced']).optional().nullable(),
    budget: z.enum(['budget-friendly', 'mid-range', 'luxury']).optional().nullable(),
    interests: z.array(z.string()).optional(),
    accommodation: z.array(z.string()).optional(),
});
type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;


interface StepInputProps { control: any; isSaving: boolean; }

function PaceInput({ control, isSaving }: StepInputProps) {
    return (
        <FormField control={control} name="pace" render={({ field }) => (
            <FormItem className="space-y-4"> {/* More vertical space */}
                <FormLabel className="font-semibold text-lg text-gray-800 dark:text-gray-200">Preferred Travel Pace</FormLabel>
                <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="grid grid-cols-1 gap-4" disabled={isSaving}>
                        {paceOptions.map(option => (
                            <FormItem key={option.value} className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg shadow-sm hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors has-[[data-state=checked]]:border-cyan-600 has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-cyan-500/50 has-[[data-state=checked]]:bg-cyan-50/50 dark:has-[[data-state=checked]]:bg-cyan-900/30 dark:border-gray-700">
                                <RadioGroupItem value={option.value} id={`pace-${option.value}`} />
                                <FormLabel htmlFor={`pace-${option.value}`} className="font-normal cursor-pointer w-full text-base leading-tight text-gray-700 dark:text-gray-300">{option.label}</FormLabel>
                            </FormItem>
                        ))}
                    </RadioGroup>
                </FormControl>
                <FormMessage />
            </FormItem>
        )} />
    );
}

function BudgetInput({ control, isSaving }: StepInputProps) {
     return (
        <FormField control={control} name="budget" render={({ field }) => (
            <FormItem className="space-y-4">
                 <FormLabel className="font-semibold text-lg text-gray-800 dark:text-gray-200">Typical Budget Level</FormLabel>
                 <FormControl>
                     <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="grid grid-cols-1 gap-4" disabled={isSaving}>
                         {budgetOptions.map(option => (
                             <FormItem key={option.value} className="flex items-center space-x-3 space-y-0 border p-4 rounded-lg shadow-sm hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors has-[[data-state=checked]]:border-cyan-600 has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-cyan-500/50 has-[[data-state=checked]]:bg-cyan-50/50 dark:has-[[data-state=checked]]:bg-cyan-900/30 dark:border-gray-700">
                                <RadioGroupItem value={option.value} id={`budget-${option.value}`} />
                                <FormLabel htmlFor={`budget-${option.value}`} className="font-normal cursor-pointer w-full text-base leading-tight text-gray-700 dark:text-gray-300">{option.label}</FormLabel>
                             </FormItem>
                         ))}
                     </RadioGroup>
                 </FormControl>
                <FormMessage />
            </FormItem>
        )} />
    );
}

function InterestsInput({ control, isSaving }: StepInputProps) {
    return (
        <FormField control={control} name="interests" render={({ field }) => (
            <FormItem>
                <FormLabel className="font-semibold text-lg mb-4 block text-gray-800 dark:text-gray-200">Interests (Select all that apply)</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2"> {/* More columns on desktop */}
                    {interestOptions.map((item) => (
                        <FormItem key={item.id} className="flex flex-row items-center space-x-3 space-y-0 border p-4 rounded-lg shadow-sm hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors cursor-pointer has-[[data-state=checked]]:border-cyan-600 has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-cyan-500/50 has-[[data-state=checked]]:bg-cyan-50/50 dark:has-[[data-state=checked]]:bg-cyan-900/30 dark:border-gray-700">
                            <FormControl>
                                <Checkbox
                                    disabled={isSaving}
                                    checked={(field.value ?? []).includes(item.id)}
                                    onCheckedChange={(checked) => { const c = field.value??[]; return checked ? field.onChange([...c, item.id]) : field.onChange(c.filter((v: string) => v !== item.id)); }}
                                    id={`interest-${item.id}`}
                                />
                            </FormControl>
                            <FormLabel htmlFor={`interest-${item.id}`} className="text-base font-normal cursor-pointer w-full leading-tight text-gray-700 dark:text-gray-300">{item.label}</FormLabel>
                        </FormItem>
                    ))}
                </div>
                <FormMessage />
            </FormItem>
        )} />
    );
}

function AccommodationInput({ control, isSaving }: StepInputProps) {
     return (
        <FormField control={control} name="accommodation" render={({ field }) => (
            <FormItem>
                 <FormLabel className="font-semibold text-lg mb-4 block text-gray-800 dark:text-gray-200">Preferred Accommodation</FormLabel>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"> {/* Adjusted grid */}
                     {accommodationOptions.map((item) => (
                        <FormItem key={item.id} className="flex flex-row items-center space-x-3 space-y-0 border p-4 rounded-lg shadow-sm hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors cursor-pointer has-[[data-state=checked]]:border-cyan-600 has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-cyan-500/50 has-[[data-state=checked]]:bg-cyan-50/50 dark:has-[[data-state=checked]]:bg-cyan-900/30 dark:border-gray-700">
                            <FormControl>
                                <Checkbox
                                    disabled={isSaving}
                                    checked={(field.value ?? []).includes(item.id)}
                                    onCheckedChange={(checked) => { const c = field.value??[]; return checked ? field.onChange([...c, item.id]) : field.onChange(c.filter((v: string) => v !== item.id)); }}
                                    id={`accom-${item.id}`}
                                />
                            </FormControl>
                            <FormLabel htmlFor={`accom-${item.id}`} className="text-base font-normal cursor-pointer w-full leading-tight text-gray-700 dark:text-gray-300">{item.label}</FormLabel>
                        </FormItem>
                     ))}
                 </div>
                 <FormMessage />
             </FormItem>
          )}
        />
    );
}

function SummaryDisplay({ control }: StepInputProps) {
    const watchedValues = useWatch({ control }) as PreferencesFormValues;
    const getLabel = (options: {value: string; label: string}[], value: string | null | undefined) => options.find(opt => opt.value === value)?.label.replace(/\s\(.*\)/, '') || <em className="text-gray-500 dark:text-gray-400">Not Selected</em>; // Remove parenthetical descriptions
    const getLabels = (options: {id: string; label: string}[], values: string[] | undefined) => {
        if (!values || values.length === 0) return <em className="text-gray-500 dark:text-gray-400">None Selected</em>;
        return values.map(val => options.find(opt => opt.id === val)?.label).filter(Boolean).join(', ');
    }
    return (
        <div className="space-y-4 text-base p-6 border rounded-lg bg-gray-50/50 dark:bg-gray-800/50 dark:border-gray-700">
             <h4 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">Review Your Choices:</h4>
             <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-center">
                 <strong className="font-medium text-gray-700 dark:text-gray-300 text-right">Pace:</strong>                <span>{getLabel(paceOptions, watchedValues.pace)}</span>
                 <strong className="font-medium text-gray-700 dark:text-gray-300 text-right">Budget:</strong>             <span>{getLabel(budgetOptions, watchedValues.budget)}</span>
                 <strong className="font-medium text-gray-700 dark:text-gray-300 text-right align-top pt-1">Interests:</strong>          <span className="leading-relaxed">{getLabels(interestOptions, watchedValues.interests)}</span>
                 <strong className="font-medium text-gray-700 dark:text-gray-300 text-right align-top pt-1">Accommodation:</strong> <span className="leading-relaxed">{getLabels(accommodationOptions, watchedValues.accommodation)}</span>
             </div>
        </div>
    );
}

// Define steps configuration
const preferenceSteps = [
    { id: 'pace', label: 'Travel Pace', Component: PaceInput },
    { id: 'budget', label: 'Budget Level', Component: BudgetInput },
    { id: 'interests', label: 'Interests', Component: InterestsInput },
    { id: 'accommodation', label: 'Accommodation', Component: AccommodationInput },
    { id: 'summary', label: 'Confirm Preferences', Component: SummaryDisplay },
];
const TOTAL_STEPS = preferenceSteps.length;


// --- Main Form Component ---
interface PreferencesFormProps {
    initialPreferences?: UserPreferences | null;
    onSaveSuccess?: (prefs: UserPreferences) => void;
}

export function ScrollablePreferencesForm({ initialPreferences, onSaveSuccess }: PreferencesFormProps) {
    const { currentUser, isLoading: authLoading, refetchUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0); // Still useful for progress/focus
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

     useEffect(() => { stepRefs.current = stepRefs.current.slice(0, TOTAL_STEPS); }, []);

    const form = useForm<PreferencesFormValues>({
        resolver: zodResolver(preferencesFormSchema),
        defaultValues: {
            pace: initialPreferences?.pace ?? null,
            budget: initialPreferences?.budget ?? null,
            interests: initialPreferences?.interests ?? [],
            accommodation: initialPreferences?.accommodation ?? [],
        },
        mode: 'onChange',
    });
    const { control, handleSubmit, reset, trigger } = form;

    useEffect(() => {
        reset({
            pace: initialPreferences?.pace ?? null,
            budget: initialPreferences?.budget ?? null,
            interests: initialPreferences?.interests ?? [],
            accommodation: initialPreferences?.accommodation ?? [],
        });
    }, [initialPreferences, reset]);

    const scrollToStep = (index: number) => {
        stepRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // Use nearest
        setCurrentStepIndex(index); // Still useful to track "current" section
    };

    const handleGoToStep = (index: number) => {
        if (index >= 0 && index < TOTAL_STEPS) {
             scrollToStep(index);
        }
    };

    async function onSubmit(values: PreferencesFormValues) {
        if (!currentUser) { setError("Authentication error."); return; }
        setIsSaving(true); setError(null); setSuccessMessage(null);
        try {
            const submissionData: UserPreferences = {
                pace: values.pace || null, budget: values.budget || null,
                interests: values.interests ?? [], accommodation: values.accommodation ?? [],
            };
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/user/profile/preferences`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(submissionData),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to save.');
            setSuccessMessage("Preferences saved successfully!");
            await refetchUser();
            if (onSaveSuccess) onSaveSuccess(submissionData);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) { setError(err.message || "An error occurred."); }
        finally { setIsSaving(false); }
    }

    if (authLoading) { return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>; }

    return (
        <div className="w-full max-w-3xl mx-auto"> 
            <Card className="shadow-xl border-gray-200 dark:border-gray-700 overflow-hidden"> 
                <CardHeader className="border-b dark:border-gray-700 p-6">
                    <CardTitle className="text-2xl font-semibold text-center text-gray-900 dark:text-gray-100">Your Travel Preferences</CardTitle>
                    <CardDescription className="text-center text-base text-gray-500 dark:text-gray-400 pt-1">
                        Help us tailor plans to your style. Scroll down to save.
                    </CardDescription>
                </CardHeader>

                 <Form {...form}>
                     <form onSubmit={handleSubmit(onSubmit)}>
                         <ScrollArea className="h-[calc(100vh-320px)]"> 
                            <CardContent className="space-y-12 p-6 md:p-8">
                                {preferenceSteps.map(({ id, label, Component }, index) => (
                                    <div
                                        key={id}
                                        ref={el => { stepRefs.current[index] = el; }}
                                        id={`step-${id}`}
                                        className="py-6 first:pt-0 last:pb-0 scroll-mt-6" // Scroll margin
                                    >
                                        <Component control={control} isSaving={isSaving} />
                                    </div>
                                ))}
                            </CardContent>
                            <ScrollBar orientation="vertical" />
                         </ScrollArea>

                         <CardFooter className="flex flex-col items-center border-t pt-6 pb-6 dark:border-gray-700">
                            {(error || successMessage) && (
                                <div className={`mb-4 w-full p-3 rounded-md text-center text-sm font-medium ${error ? 'text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/30' : 'text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900/30'}`}>
                                    {error || successMessage}
                                    {successMessage && <CheckCircle className="inline-block ml-2 h-4 w-4" />}
                                </div>
                            )}
                             <Button type="submit" className="w-full md:w-auto px-8 py-3 text-base bg-[#0b6dff] hover:bg-black text-white" disabled={isSaving}>
                                {isSaving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Saving...</> : <><Save className="mr-2 h-5 w-5"/> Save Preferences</>}
                             </Button>
                         </CardFooter>
                     </form>
                 </Form>
            </Card>
        </div>
    );
}

export default ScrollablePreferencesForm;