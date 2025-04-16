'use client';

// Client component to handle data fetching and state
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ScrollablePreferencesForm from '@/components/PreferencesForm';
import { UserPreferences } from '@/lib/preferencesOptions';

export default function PreferencesClient() {
  const { currentUser } = useAuth();
  const [initialPreferences, setInitialPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchPreferences() {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/user/profile/preferences`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setInitialPreferences(data.preferences);
        }
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPreferences();
  }, [currentUser]);
  
  if (isLoading) return <div>Loading preferences...</div>;
  
  return (
    <ScrollablePreferencesForm 
      initialPreferences={initialPreferences}
      onSaveSuccess={(prefs: UserPreferences) => {
        console.log('Preferences saved successfully', prefs);
      }}
    />
  );
}