'use client'; 

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Import for potential redirects

interface User {
    id: string;
    username: string;
    email: string;
    name?: string | null;
    profilePic?: string | null;
}

interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    refetchUser: () => Promise<void>;
    logout: () => Promise<void>; }

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true); 
    const router = useRouter();

    const checkAuthStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const backendUrl =  'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/user/profile`, {
                 method: 'GET', 
                 credentials: 'include'
            });
            const data = response.body
            console.log("THIS IS RESPONSE - ",data);
            

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setCurrentUser(data.data);
                } else {
                    console.warn("Auth check response not successful:", data?.message);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
                 if (response.status !== 401) {
                    console.warn(response);
                    
                     console.warn(`Auth check failed with status: ${response.status}`);
                 }
            }
        } catch (error) {
            console.error("Auth check fetch failed:", error);
            setCurrentUser(null); 
        } finally {
            setIsLoading(false); 
        }
    }, []); 

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]); 
    const logout = useCallback(async () => {
        setIsLoading(true); 
        try {
            const backendUrl =  'http://localhost:5000';
            const response = await fetch(`${backendUrl}/api/auth/logout`, {
                 method: 'POST',
                 credentials: 'include' 
            });
            if (!response.ok) {
                console.warn(`Backend logout failed with status: ${response.status}`);
            }
        } catch (error) {
            console.error("Logout API call failed:", error);
        } finally {
            setCurrentUser(null); 
            setIsLoading(false); 
            router.push('/login');
        }
    }, [router]); 

     const refetchUser = useCallback(async () => {
         await checkAuthStatus();
     }, [checkAuthStatus]);

    const value: AuthContextType = {
        currentUser,
        isLoading,
        refetchUser,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};