import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { usePlayerStore } from '../store/usePlayerStore';

// Landing route for the Spotify redirect (rave://spotify-auth). The auth session already
// captured the code; this screen only closes the browser and returns to where the user was.
WebBrowser.maybeCompleteAuthSession();

export default function SpotifyAuthRedirect() {
  const router = useRouter();
  const theme = usePlayerStore((s) => s.theme);

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/settings');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.accent} />
    </View>
  );
}
