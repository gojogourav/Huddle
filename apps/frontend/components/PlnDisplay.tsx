// src/components/PlanDisplay.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Lightbulb, Train, Loader2, DollarSign, MapPin } from 'lucide-react';
import { Timeline } from "@/components/ui/timeline"; // Adjust path if needed
import { fetchUnsplashPhotos, UnsplashPhoto } from '../lib/upsplashUtils'; // Adjust path

// --- Types ---
interface ScheduleItem {
    time_slot: string; activity_title: string; description: string;
    local_insight: string; estimated_duration_minutes: number;
    budget_indicator: string; transport_suggestion?: string;
}
interface GeneratedOneDayPlan {
    plan_title: string; location: string; date_applicable: string;
    plan_summary: string; schedule: ScheduleItem[];
}
interface PlanDisplayProps { plan: GeneratedOneDayPlan | null; planId?: string; }

// --- Helper ---
const formatDuration = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '';
    const hours = Math.floor(minutes / 60); const mins = minutes % 60;
    let durationStr = '';
    if (hours > 0) durationStr += `${hours}h `; if (mins > 0) durationStr += `${mins}m`;
    return durationStr.trim();
};

// --- Schedule Item Content Component ---
interface ScheduleItemContentProps { item: ScheduleItem; location: string; }
function ScheduleItemContent({ item, location }: ScheduleItemContentProps) {
    const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
    const [isLoadingImages, setIsLoadingImages] = useState(true);

    useEffect(() => {
        let isMounted = true; setIsLoadingImages(true); setPhotos([]);
        const query = `${item.activity_title} ${location}`;
        fetchUnsplashPhotos(query, 4, 'landscape')
            .then(fetchedPhotos => { if (isMounted) setPhotos(fetchedPhotos); })
            .catch(err => { console.error(`Unsplash Error for "${query}":`, err); })
            .finally(() => { if (isMounted) setIsLoadingImages(false); });
        return () => { isMounted = false; };
    }, [item.activity_title, location]);

    return (
        <div>
            {/* Sub-details */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                 {formatDuration(item.estimated_duration_minutes) && ( <span className="inline-flex items-center"><Clock className="w-3 h-3 mr-1" /> {formatDuration(item.estimated_duration_minutes)}</span> )}
                 <span className="inline-flex items-center"><DollarSign className="w-3 h-3 mr-1" /> {item.budget_indicator}</span>
                 {item.transport_suggestion && ( <span className="inline-flex items-center"><Train className="w-3 h-3 mr-1" /> {item.transport_suggestion}</span> )}
            </div>
            {/* Description */}
            <p className="text-neutral-700 dark:text-neutral-300 font-normal mb-4 text-sm leading-relaxed">{item.description}</p>
            {/* Local Insight */}
            {item.local_insight && (
                <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded border border-amber-200 flex items-start mb-4 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-100">
                    <Lightbulb className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <span><span className="font-semibold">Local Insight:</span> {item.local_insight}</span>
                </p>
            )}
            {/* Image Grid */}
            <div className="mb-4">
                {isLoadingImages ? ( <div className="flex justify-center items-center h-36 bg-gray-100 rounded-lg dark:bg-gray-800/50"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> )
                : photos.length > 0 ? (
                    <div className={`grid grid-cols-1 ${photos.length > 1 ? 'sm:grid-cols-2' : ''} gap-2 sm:gap-3`}>
                        {photos.slice(0, 4).map((photo) => ( <div key={photo.id} className='overflow-hidden rounded-lg aspect-video sm:aspect-[4/3] relative group shadow'> <Link href={photo.links.html} target="_blank" rel="noopener noreferrer"> <Image src={photo.urls.regular} alt={photo.alt_description || `Photo for ${item.activity_title}`} fill className="object-cover h-full w-full transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 90vw, 45vw"/> </Link> <div className="absolute bottom-1 right-1 text-[10px] leading-tight bg-black/60 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"> Photo by <Link href={`${photo.user.links.html}?utm_source=${process.env.NEXT_PUBLIC_UNSPLASH_APP_NAME || 'YourAppName'}&utm_medium=referral`} target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:underline">{photo.user.name}</Link> / <Link href={`https://unsplash.com/?utm_source=${process.env.NEXT_PUBLIC_UNSPLASH_APP_NAME || 'YourAppName'}&utm_medium=referral`} target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:underline">Unsplash</Link> </div> </div> ))}
                    </div>
                ) : ( <p className="text-xs text-center text-gray-400 italic py-4">No representative images found.</p> )}
            </div>
        </div>
    );
}

// --- Main Plan Display Component ---
export function PlanDisplay({ plan, planId }: PlanDisplayProps) {
     if (!plan) return null;
     const timelineData = plan.schedule.map((item) => ({
         title: `${item.time_slot} – ${item.activity_title}`,
         content: <ScheduleItemContent item={item} location={plan.location} />,
     }));

     return (
        <div className="w-full mt-8 mb-8 font-sans">
            <div className="text-center mb-8 px-4">
                 <h2 className="text-3xl font-bold text-cyan-800 dark:text-cyan-100">{plan.plan_title}</h2>
                 <p className="text-base text-cyan-700 dark:text-cyan-300 mt-2 flex items-center justify-center gap-1">
                     <MapPin className="w-4 h-4 flex-shrink-0" />
                     <span className="font-semibold">{plan.location}</span> - {plan.plan_summary}
                 </p>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">({plan.date_applicable})</p>
            </div>
            <Timeline data={timelineData} />
        </div>
    );
}

export default PlanDisplay;