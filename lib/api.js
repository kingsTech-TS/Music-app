import { storage } from './storage';

export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

if (!BASE_URL) {
  console.warn('EXPO_PUBLIC_API_URL is not set. Add it to .env and restart Expo with `npx expo start -c`.');
}

const ACCESS_KEY = 'rave.accessToken';
const REFRESH_KEY = 'rave.refreshToken';

let accessToken = null;
let refreshToken = null;
let refreshing = null; // shared promise so parallel 401s only refresh once
let onSessionExpired = () => {};

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : 'Request failed');
    this.status = status;
    this.detail = detail;
  }
}

// ---------- token handling ----------

export async function loadTokens() {
  accessToken = await storage.get(ACCESS_KEY);
  refreshToken = await storage.get(REFRESH_KEY);
  return !!refreshToken;
}

export async function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  await storage.set(ACCESS_KEY, access);
  await storage.set(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await storage.remove(ACCESS_KEY);
  await storage.remove(REFRESH_KEY);
}

export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

async function refreshAccessToken() {
  if (!refreshToken) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return false; // refresh token rejected → session is over
        const data = await res.json();
        await setTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        return 'offline'; // network problem: keep the session, just fail this request
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

// ---------- core request ----------

function buildUrl(path, query) {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return params ? `${url}?${params}` : url;
}

export async function request(path, { method = 'GET', body, query, auth = true, retry = true } = {}) {
  const headers = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(0, `Can't reach the server at ${BASE_URL}. Is the backend running?`);
  }

  if (res.status === 401 && auth && retry && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed === 'offline') throw new ApiError(0, `Can't reach the server at ${BASE_URL}.`);
    if (refreshed) {
      return request(path, { method, body, query, auth, retry: false });
    }
    await clearTokens();
    onSessionExpired();
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    let detail = data?.detail ?? res.statusText;
    if (Array.isArray(detail)) detail = detail.map((d) => d.msg).join('\n'); // FastAPI validation errors
    throw new ApiError(res.status, detail);
  }
  return data;
}

// ---------- endpoints ----------

export const api = {
  auth: {
    // Anonymous account for this install — no sign-up.
    guest: () => request('/auth/guest', { method: 'POST', auth: false }),
    // Sign in with Spotify. Sends the current (guest) token so this device's data is kept.
    spotify: (code, codeVerifier, redirectUri) =>
      request('/auth/spotify', {
        method: 'POST',
        body: { code, code_verifier: codeVerifier, redirect_uri: redirectUri },
      }),
    me: () => request('/auth/me'),
  },

  users: {
    update: (fields) => request('/users/me', { method: 'PATCH', body: fields }),
    markOnboarded: () => request('/users/me/onboarded', { method: 'POST' }),
    updatePreferences: (prefs) => request('/users/me/preferences', { method: 'PATCH', body: prefs }),
    uploadAvatar: (file) => {
      const form = new FormData();
      form.append('file', file); // { uri, name, type }
      return request('/users/me/avatar', { method: 'POST', body: form });
    },
  },

  home: (category, tzOffset = -new Date().getTimezoneOffset()) =>
    request('/home', { query: { category: category === 'All' ? undefined : category, tz_offset: tzOffset } }),

  tracks: {
    list: (query) => request('/tracks', { query }),
    popular: (category) => request('/tracks/popular', { query: { category } }),
    get: (id) => request(`/tracks/${id}`),
    // audio / artwork: { uri, name, type } objects (e.g. from expo-document-picker)
    upload: ({ title, artist, album, category, audio, artwork, isPublic = true }) => {
      const form = new FormData();
      form.append('title', title);
      form.append('artist', artist);
      if (album) form.append('album', album);
      if (category) form.append('category', category);
      form.append('is_public', String(isPublic));
      form.append('audio', audio);
      if (artwork) form.append('artwork', artwork);
      return request('/tracks/upload', { method: 'POST', body: form });
    },
    remove: (id) => request(`/tracks/${id}`, { method: 'DELETE' }),
  },

  library: {
    likes: (page = 1) => request('/library/likes', { query: { page, limit: 100 } }),
    likedIds: () => request('/library/likes/ids'),
    like: (id) => request(`/library/likes/${id}`, { method: 'PUT' }),
    unlike: (id) => request(`/library/likes/${id}`, { method: 'DELETE' }),
    recordPlay: (id) => request(`/library/history/${id}`, { method: 'POST' }),
    history: () => request('/library/history'),
  },

  playlists: {
    mine: () => request('/playlists'),
    get: (id) => request(`/playlists/${id}`),
    create: (name, description, trackIds = []) =>
      request('/playlists', { method: 'POST', body: { name, description, track_ids: trackIds } }),
    update: (id, fields) => request(`/playlists/${id}`, { method: 'PATCH', body: fields }),
    remove: (id) => request(`/playlists/${id}`, { method: 'DELETE' }),
    addTracks: (id, trackIds) => request(`/playlists/${id}/tracks`, { method: 'POST', body: { track_ids: trackIds } }),
    removeTrack: (id, trackId) => request(`/playlists/${id}/tracks/${trackId}`, { method: 'DELETE' }),
    reorder: (id, trackIds) => request(`/playlists/${id}/tracks/order`, { method: 'PUT', body: { track_ids: trackIds } }),
  },

  collections: {
    list: () => request('/collections'),
    get: (id) => request(`/collections/${id}`),
  },

  search: {
    query: (q, save = false) => request('/search', { query: { q, save } }),
    recent: () => request('/search/recent'),
    addRecent: (query) => request('/search/recent', { method: 'POST', body: { query } }),
    clearRecent: () => request('/search/recent', { method: 'DELETE' }),
    removeRecent: (query) => request(`/search/recent/${encodeURIComponent(query)}`, { method: 'DELETE' }),
  },

  spotify: {
    // client id, redirect URI and scopes for the auth flow (served by the backend, not hardcoded here)
    config: () => request('/spotify/config', { auth: false }),
    // Fresh access token for the Spotify SDK (refreshed server-side)
    token: () => request('/spotify/token'),
    disconnect: () => request('/spotify/connect', { method: 'DELETE' }),
    saveTrack: (track) => request('/spotify/tracks', { method: 'POST', body: track }),
  },
};

export const hasSession = () => !!refreshToken;

// Tracks that live in the backend (vs. files on the device) have a `source` field.
export const isRemoteTrack = (track) => !!track?.source && !track?.isLocal;
