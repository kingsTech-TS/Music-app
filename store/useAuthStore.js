import { create } from 'zustand';
import { api, clearTokens, hasSession, loadTokens, setSessionExpiredHandler, setTokens } from '../lib/api';
import { storage } from '../lib/storage';
import { usePlayerStore } from './usePlayerStore';

const ONBOARDED_KEY = 'rave.onboarded';

// Pull per-user state (theme, liked songs) into the player store after the session is ready.
const syncUserState = (user) => {
  const player = usePlayerStore.getState();
  if (user?.preferences?.theme) player.setTheme(user.preferences.theme);
  player.loadLikedIds();
};

/**
 * Accounts:
 *  - First launch creates an anonymous account (POST /auth/guest) behind the scenes, so signing up is optional.
 *  - register/login (email) and signInWithSpotify keep the guest's data (upgrade or merge on the server).
 *  - If the backend is unreachable the app still works with songs on the device.
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  hydrated: false, // storage checked → safe to route
  onboarded: false, // stored on the device so it works offline
  sessionError: null,

  hydrate: async () => {
    setSessionExpiredHandler(() => {
      set({ user: null });
      get().ensureSession();
    });
    const onboarded = (await storage.get(ONBOARDED_KEY)) === '1';
    await loadTokens();
    set({ onboarded, hydrated: true });
    get().ensureSession();
  },

  // Make sure we have an account: restore the saved one or create a guest. Safe to call repeatedly.
  ensureSession: async () => {
    if (get()._pending) return get()._pending;
    const run = (async () => {
      try {
        let user = null;
        if (hasSession()) {
          try {
            user = await api.auth.me();
          } catch (e) {
            if (e.status !== 401) throw e; // saved session is no longer valid → fall through to a new guest
          }
        }
        if (!user) {
          const data = await api.auth.guest();
          await setTokens(data.access_token, data.refresh_token);
          user = data.user;
        }
        set({ user, sessionError: null });
        syncUserState(user);
        return user;
      } catch (e) {
        // Offline / backend down: local songs still work; screens can retry.
        set({ sessionError: e.message });
        return null;
      } finally {
        set({ _pending: null });
      }
    })();
    set({ _pending: run });
    return run;
  },
  _pending: null,

  completeOnboarding: async () => {
    set({ onboarded: true });
    await storage.set(ONBOARDED_KEY, '1');
    if (get().user && !get().user.onboarded) api.users.markOnboarded().catch(() => {});
  },

  // Email sign-up: upgrades this device's guest account, keeping its likes/playlists.
  register: async (name, email, password) => {
    if (!get().user) await get().ensureSession();
    const data = await api.auth.register(name.trim(), email.trim(), password);
    await setTokens(data.access_token, data.refresh_token);
    set({ user: data.user });
    syncUserState(data.user);
    return data.user;
  },

  // Email login: this device's guest data is merged into the account.
  login: async (email, password) => {
    if (!get().user) await get().ensureSession();
    const data = await api.auth.login(email.trim(), password);
    await setTokens(data.access_token, data.refresh_token);
    set({ user: data.user });
    syncUserState(data.user);
    return data.user;
  },

  // Sign out of the account; the device continues with a fresh guest account.
  logout: async () => {
    const player = usePlayerStore.getState();
    if (player.mode === 'spotify' && player.isPlaying) api.spotify.pause().catch(() => {});
    return get().resetAccount();
  },

  // Called with the authorization code from Spotify's login page.
  signInWithSpotify: async (code, codeVerifier, redirectUri) => {
    if (!get().user) await get().ensureSession(); // so a guest's likes/playlists get carried over
    const data = await api.auth.spotify(code, codeVerifier, redirectUri);
    await setTokens(data.access_token, data.refresh_token);
    set({ user: data.user });
    syncUserState(data.user);
    return data;
  },

  disconnectSpotify: async () => {
    const user = await api.spotify.disconnect();
    set({ user });
    return user;
  },

  // Start over with a fresh anonymous account on this device.
  resetAccount: async () => {
    await clearTokens();
    usePlayerStore.getState().resetUserState();
    set({ user: null });
    return get().ensureSession();
  },

  updatePreferences: async (prefs) => {
    const user = get().user;
    if (!user) return;
    set({ user: { ...user, preferences: { ...user.preferences, ...prefs } } }); // optimistic
    try {
      const saved = await api.users.updatePreferences(prefs);
      set({ user: { ...get().user, preferences: saved } });
    } catch (e) {
      set({ user });
      throw e;
    }
  },

  setUser: (user) => set({ user }),
}));
