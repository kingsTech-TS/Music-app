import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { FontAwesome } from '@expo/vector-icons';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { completeSpotifyLogin } from '../lib/spotifyAuth';
import { Equalizer, FadeIn } from '../components/Motion';

WebBrowser.maybeCompleteAuthSession();

/**
 * Landing route for Spotify's redirect (…/spotify-auth?code=…&state=…).
 *
 * - App still running: the login listener finishes sign-in; this screen just steps back.
 * - App was restarted by the redirect (Expo Go does this): the in-memory login is gone, so this screen
 *   finishes the sign-in itself using the attempt saved before Spotify was opened.
 */
export default function SpotifyAuthRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = usePlayerStore((s) => s.theme);
  const showToast = usePlayerStore((s) => s.showToast);
  const { hydrated, completeOnboarding } = useAuthStore();
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || started.current) return; // saved session must be loaded so guest data is carried over
    started.current = true;
    const wasRestarted = !router.canGoBack();

    // Running app: get out of the way immediately, the listener shows the result where the user was.
    if (!wasRestarted) router.back();

    completeSpotifyLogin(params).then(async (result) => {
      if (result.ok) {
        showToast('Spotify connected');
        await completeOnboarding();
      } else if (result.error) {
        showToast(result.error);
      }
      if (wasRestarted) router.replace('/(tabs)');
    });
  }, [hydrated]);

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <FadeIn style={{ alignItems: 'center' }}>
        <FontAwesome name="spotify" size={64} color="#1DB954" />
        <Equalizer color={theme.accent} bars={5} height={28} barWidth={5} gap={4} style={{ marginTop: 28 }} />
        <Text style={[styles.text, { color: theme.text }]}>Connecting to Spotify…</Text>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
  },
});
