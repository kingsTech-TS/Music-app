import { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { api } from '../lib/api';
import { authorizeSpotify } from '../lib/spotifyAuth';

WebBrowser.maybeCompleteAuthSession();

// Expo Go 58 reports executionEnvironment "bare", so check for the ExpoGo native module instead.
const IS_EXPO_GO = isRunningInExpoGo();

// Expo Go's own deep-link address for this project, e.g. exp://192.168.1.138:8081/--/spotify-auth.
// Built by hand because makeRedirectUri also sees "bare" and returns rave://, which Expo Go can't open.
function expoGoRedirectUri(path) {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? `exp://${hostUri}/--/${path}` : AuthSession.makeRedirectUri({ path });
}

// Shared across every screen using the hook, so it's fetched once.
let configPromise = null;
const loadConfig = () => {
  if (!configPromise) configPromise = api.spotify.config().catch((e) => {
    configPromise = null;
    throw e;
  });
  return configPromise;
};

/**
 * Spotify sign-in (Authorization Code + PKCE).
 * Client id, redirect URI and scopes come from the backend (GET /spotify/config), so nothing is hardcoded here.
 * The code is exchanged on the server — the client secret never ships in the app.
 *
 * Returns { ready, enabled, connecting, error, connect }. `connect()` resolves true on success.
 */
export function useSpotifyLogin() {
  const [config, setConfig] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfig()
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

  const connect = async () => {
    setError('');
    if (!config?.enabled) {
      setError('Spotify is not configured on the server.');
      return false;
    }
    setConnecting(true);
    try {
      // Signs in too (via completeSpotifyLogin) once Spotify redirects back.
      const result = await authorizeSpotify({ clientId: config.client_id, scopes: config.scopes, redirectUri });
      if (result.type === 'success') return true;
      if (result.type === 'error') setError(result.error || 'Spotify sign-in failed');
      return false;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setConnecting(false);
    }
  };

  return {
    ready: !!config,
    enabled: !!config?.enabled,
    connecting,
    error,
    connect,
  };
}
