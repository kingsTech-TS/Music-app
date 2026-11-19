import { AppState, Linking } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { storage } from './storage';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Spotify authorization (Authorization Code + PKCE) that survives the app being restarted.
 *
 * 1. Before opening Spotify, the attempt ({ state, codeVerifier, redirectUri }) is saved to secure storage.
 * 2. Spotify redirects back with ?code&state. Two things may happen:
 *    - the app is still running → the Linking listener below receives the URL;
 *    - Expo Go / Android restarted the app → expo-router opens /spotify-auth with the params,
 *      and that screen calls completeSpotifyLogin().
 * 3. completeSpotifyLogin() only accepts a `state` that matches the saved attempt (stale or replayed redirects
 *    are ignored — that was the old "Cached state and returned state do not match" error) and runs once per state.
 */

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

const PENDING_KEY = 'rave.spotifyPendingLogin';
const PENDING_MAX_AGE_MS = 15 * 60 * 1000;
// After returning to the app without a matching redirect, treat the login as cancelled after this long.
const CANCEL_GRACE_MS = 4000;

let inFlight = null;
const completions = new Map(); // state -> Promise (so the listener and the route can't both sign in)

export function parseParams(url) {
  const out = {};
  const parts = [url.split('?')[1], url.split('#')[1]].filter(Boolean);
  for (const part of parts) {
    for (const pair of part.split('#')[0].split('&')) {
      const [k, v = ''] = pair.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }
  }
  return out;
}

async function readPending() {
  try {
    const raw = await storage.get(PENDING_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    if (Date.now() - pending.createdAt > PENDING_MAX_AGE_MS) {
      await storage.remove(PENDING_KEY);
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

/**
 * Finish a Spotify login from the redirect params. Safe to call from several places for the same redirect.
 * Resolves:
 *   { ok: true }                     signed in
 *   { ok: false, ignored: true }     not ours / stale / already handled
 *   { ok: false, error }             Spotify or backend refused
 */
export function completeSpotifyLogin({ code, state, error, error_description }) {
  if (!state) return Promise.resolve({ ok: false, ignored: true });
  if (completions.has(state)) return completions.get(state);

  const run = (async () => {
    const pending = await readPending();
    if (!pending || pending.state !== state) return { ok: false, ignored: true };
    await storage.remove(PENDING_KEY); // single use
    if (error) {
      return error === 'access_denied'
        ? { ok: false, cancelled: true }
        : { ok: false, error: error_description || error };
    }
    if (!code) return { ok: false, ignored: true };
    try {
      await useAuthStore.getState().signInWithSpotify(code, pending.codeVerifier, pending.redirectUri);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  })();
  completions.set(state, run);
  return run;
}

/**
 * Opens Spotify's login page and resolves when the login finished (in this app session):
 *   { type: 'success' } | { type: 'cancel' } | { type: 'error', error }
 * If the app gets restarted meanwhile, this promise is lost but /spotify-auth completes the login instead.
 */
export function authorizeSpotify({ clientId, scopes, redirectUri }) {
  if (!inFlight) {
    inFlight = run({ clientId, scopes, redirectUri }).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function run({ clientId, scopes, redirectUri }) {
  const request = new AuthSession.AuthRequest({
    clientId,
    scopes,
    redirectUri,
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
  });
  const authUrl = await request.makeAuthUrlAsync(discovery);

  await storage.set(
    PENDING_KEY,
    JSON.stringify({ state: request.state, codeVerifier: request.codeVerifier, redirectUri, createdAt: Date.now() })
  );

  return new Promise((resolve) => {
    let finished = false;
    let cancelTimer = null;
    let handling = false;

    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(cancelTimer);
      linkSub.remove();
      appSub.remove();
      try {
        WebBrowser.dismissBrowser(); // iOS; unsupported on Android
      } catch {}
      resolve(result);
    };

    const linkSub = Linking.addEventListener('url', async ({ url }) => {
      if (!url || !url.startsWith(redirectUri)) return;
      const params = parseParams(url);
      if (params.state !== request.state) return; // stale redirect from an earlier login — ignore it
      handling = true;
      clearTimeout(cancelTimer);
      const result = await completeSpotifyLogin(params);
      if (result.ok) finish({ type: 'success' });
      else if (result.cancelled) finish({ type: 'cancel' });
      else if (result.error) finish({ type: 'error', error: result.error });
      else finish({ type: 'cancel' });
    });

    // Android can't tell us when the browser tab is closed, so if the user comes back to the app and
    // no matching redirect arrives shortly after, treat it as cancelled.
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearTimeout(cancelTimer);
        cancelTimer = setTimeout(() => !handling && finish({ type: 'cancel' }), CANCEL_GRACE_MS);
      } else {
        clearTimeout(cancelTimer);
      }
    });

    WebBrowser.openBrowserAsync(authUrl)
      .then((r) => {
        // iOS resolves when the in-app browser is closed by the user.
        if (r.type === 'cancel' || r.type === 'dismiss') {
          setTimeout(() => !handling && finish({ type: 'cancel' }), 800);
        }
      })
      .catch((e) => finish({ type: 'error', error: e.message }));
  });
}
