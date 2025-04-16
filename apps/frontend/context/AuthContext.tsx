// src/context/AuthContext.tsx
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Define the shape of your user object and context
// ***** ADD activeTourPlanid and potentially activeTourPlan *****
interface User {
    id: string;
    username: string;
    email: string;
    name?: string | null;
    profilePic?: string | null;
    preferences?: UserPreferences | null; // Assuming UserPreferences type is defined/imported
    activeTourPlanid?: string | null;     // <-- ADD THIS FIELD (optional string or null)
    // Optionally include activeTourPlan data directly if fetched by checkAuthStatus
    // activeTourPlan?: { id: string; planData: any | null; /* other fields */ } | null;
}

// Define UserPreferences here if not imported
interface UserPreferences {
    pace?: 'relaxed' | 'moderate' | 'fast-paced' | null;
    budget?: 'budget-friendly' | 'mid-range' | 'luxury' | null;
    interests?: string[];
    accommodation?: string[];
}


interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    refetchUser: () => Promise<void>; // Function to manually re-check auth status
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const checkAuthStatus = useCallback(async () => {
        console.log("[AuthContext] checkAuthStatus called");
        setIsLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            // Ensure GET /api/user/profile selects preferences and activeTourPlanid
            const response = await fetch(`${backendUrl}/api/user/profile`, {
                 method: 'GET', credentials: 'include', cache: 'no-store'
            });
            console.log("[AuthContext] Profile fetch status:", response.status);

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    // *** Data received should now include activeTourPlanid ***
                    console.log("[AuthContext] User data fetched:", data.data);
                    setCurrentUser(data.data as User); // Cast to the updated User type
                } else {
                    setCurrentUser(null);
                }
            } else {
                 setCurrentUser(null);
            }
        } catch (error) {
            console.error("[AuthContext] Auth check fetch failed:", error);
            setCurrentUser(null);
        } finally {
            setIsLoading(false);
             console.log("[AuthContext] checkAuthStatus finished. isLoading:", false, "currentUser:", !!currentUser);
        }
    }, []); // Empty dependency array - runs on mount

    // --- Run auth check on initial mount ---
    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const logout = useCallback(async () => { /* ... as before ... */ }, [router]);

     // Use refetchUser (which is checkAuthStatus)
     const refetchUser = checkAuthStatus;

    const value: AuthContextType = { currentUser, isLoading, refetchUser, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom Hook to Use the Context ---
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};