
import PreferencesClient from './PreferencesClient';

export default function PreferencesPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Travel Preferences</h1>
      <PreferencesClient />
    </div>
  );
}