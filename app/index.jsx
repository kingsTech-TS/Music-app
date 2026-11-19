import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import LoadingScreen from '../components/LoadingScreen';

// Long enough for the intro animation to play once; startup work runs in parallel.
const MIN_SPLASH_MS = 1600;

// Entry point: animated loading screen → onboarding (first launch only) → app.
export default function Index() {
  const { hydrated, onboarded } = useAuthStore();
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (!hydrated || !minTimePassed) return <LoadingScreen />;

  // `onboarded` is saved on the device the first time "Turn on your music" is tapped,
  // so onboarding never shows again after the first launch (works offline too).
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
