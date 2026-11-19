import { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

WebBrowser.maybeCompleteAuthSession();

// Expo Go 58 reports executionEnvironment "bare", so check for the ExpoGo native module instead.
const IS_EXPO_GO = isRunningInExpoGo();

// Expo Go's own deep-link address for this project, e.g. exp://192.168.1.138:8081/--/spotify-auth.
// Built by hand because makeRedirectUri also sees "bare" and returns rave://, which Expo Go can't open.
function expoGoRedirectUri(path) {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? `exp://${hostUri}/--/${path}` : AuthSession.makeRedirectUri({ path });
}

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

/**
 * Spotify sign-in (Authorization Code + PKCE).
 * Client id, redirect URI and scopes come from the backend (GET /spotify/config), so nothing is hardcoded here.
 * The code is exchanged on the server — the client secret never ships in the app.
 *
 * Returns { ready, enabled, connecting, error, connect }.
 */
export function useSpotifyLogin() {
  const signInWithSpotify = useAuthStore((s) => s.signInWithSpotify);
  const [config, setConfig] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.spotify
      .config()
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, []);

  // Expo Go can't receive rave:// links (the scheme only exists in a dev/production build), so there
  // Spotify must send the user back to Expo Go's own exp://<ip>:<port>/--/spotify-auth address instead.
  // That address must also be added to the Spotify app's Redirect URIs, and accepted by the backend.
  const redirectUri = IS_EXPO_GO
    ? expoGoRedirectUri('spotify-auth')
    : config?.redirect_uri || AuthSession.makeRedirectUri({ scheme: 'rave', path: 'spotify-auth' });

  useEffect(() => {
    if (__DEV__) console.log('[spotify] redirect URI:', redirectUri);
  }, [redirectUri]);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config?.client_id || '',
      scopes: config?.scopes || [],
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      setConnecting(true);
      setError('');
      signInWithSpotify(response.params.code, request?.codeVerifier, redirectUri)
        .catch((e) => setError(e.message))
        .finally(() => setConnecting(false));
    } else if (response.type === 'error') {
      setError(response.params?.error_description || response.error?.message || 'Spotify sign-in failed');
      setConnecting(false);
    } else {
      setConnecting(false); // dismissed / cancelled
    }
  }, [response]);

  const connect = async () => {
    setError('');
    if (!config?.enabled) {
      setError('Spotify is not configured on the server.');
      return;
    }
    setConnecting(true);
    try {
      await promptAsync();
    } catch (e) {
      setError(e.message);
      setConnecting(false);
    }
  };

  return {
    ready: !!request && !!config,
    enabled: !!config?.enabled,
    connecting,
    error,
    connect,
  };
}
