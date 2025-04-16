// src/lib/preferencesOptions.ts (or similar)

export const paceOptions = [
    { value: 'relaxed', label: 'Relaxed (Fewer stops, more time at each)' },
    { value: 'moderate', label: 'Moderate (Good balance)' },
    { value: 'fast-paced', label: 'Fast-Paced (See as much as possible)' },
];

export const budgetOptions = [
    { value: 'budget-friendly', label: 'Budget-Friendly ($)' },
    { value: 'mid-range', label: 'Mid-Range ($$)' },
    { value: 'luxury', label: 'Luxury ($$$)' },
];

export const interestOptions = [
    { id: 'history', label: 'History & Heritage' },
    { id: 'food', label: 'Food & Culinary Experiences' },
    { id: 'nature', label: 'Nature & Parks' },
    { id: 'art', label: 'Art & Museums' },
    { id: 'nightlife', label: 'Nightlife & Entertainment' },
    { id: 'shopping', label: 'Shopping (Local & Malls)' },
    { id: 'adventure', label: 'Adventure & Outdoors' },
    { id: 'local markets', label: 'Local Markets' },
    { id: 'temples', label: 'Temples & Spirituality' },
    { id: 'architecture', label: 'Architecture' },
];

export const accommodationOptions = [
    { id: 'hotel', label: 'Hotel (Standard/Chain)' },
    { id: 'boutique hotel', label: 'Boutique Hotel' },
    { id: 'hostel', label: 'Hostel' },
    { id: 'airbnb/rental', label: 'Airbnb / Apartment Rental' },
    { id: 'luxury resort', label: 'Luxury Resort' },
];

// Define the shape of the preferences object for type safety
export interface UserPreferences {
    pace?: 'relaxed' | 'moderate' | 'fast-paced' | null;
    budget?: 'budget-friendly' | 'mid-range' | 'luxury' | null;
    interests?: string[];
    accommodation?: string[];
}