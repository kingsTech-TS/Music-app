import { create } from 'zustand';
import { api, isRemoteTrack } from '../lib/api';
import { getLocalPermission, requestLocalPermission, scanLocalSongs } from '../lib/localMusic';

// Helper to get TrackPlayer safely
const getTrackPlayer = () => {
  try {
    const TrackPlayer = require('react-native-track-player').default;
    return TrackPlayer.setupPlayer ? TrackPlayer : null;
  } catch (e) {
    return null;
  }
};

const TrackPlayer = getTrackPlayer();
const isNative = !!TrackPlayer;


// Single source of truth for themes (Settings renders its list from this).
export const themes = {
  hive: {
    label: 'Hive Lime',
    primary: '#1b1f12',
    accent: '#c6f432',
    accentDark: '#7a9a12',
    text: '#ffffff',
    secondaryText: '#a3a88f',
    surface: '#2a3019',
    surfaceLight: '#363d22',
    onAccent: '#151a08',
  },
  mume: {
    label: 'Mume Orange',
    primary: '#181a20',
    accent: '#ff8c00', 
    text: '#ffffff', 
    secondaryText: '#9e9e9e', 
    surface: '#1f222a' 
  },
  dark: { label: 'Spotify Dark', primary: '#121212', accent: '#1DB954', text: '#fff', secondaryText: '#b3b3b3', surface: '#282828' },
  sunset: { label: 'Sunset Glow', primary: '#2D1B33', accent: '#FF4500', text: '#FFD700', secondaryText: '#FFA07A', surface: '#3D2B43' },
};



export const usePlayerStore = create((set, get) => ({
  isPlayerReady: false,
  queue: [],
  localTracks: [],
  searchResults: [],
  currentTrack: null,
  isPlaying: false,
  repeatMode: 'off', 
  shuffle: false,
  theme: themes.hive,
  themeName: 'hive',
  likedIds: {}, // { [trackId]: true } for backend tracks
  actionTrack: null, // track whose "more" sheet is open


  setPlayerReady: (isReady) => set({ isPlayerReady: isReady }),
  setLocalTracks: (tracks) => set({ localTracks: tracks }),
  setSearchResults: (tracks) => set({ searchResults: tracks }),
  setTheme: (themeName) =>
    set(themes[themeName] ? { theme: themes[themeName], themeName } : { theme: themes.dark, themeName: 'dark' }),

  // ---- backend-synced state ----
  loadLikedIds: async () => {
    try {
      const ids = await api.library.likedIds();
      set({ likedIds: Object.fromEntries(ids.map((id) => [id, true])) });
    } catch (e) {
      console.log('Could not load likes:', e.message);
    }
  },
  toggleLike: async (track) => {
    if (!isRemoteTrack(track)) return; // device files aren't in the backend
    const id = track.id;
    const wasLiked = !!get().likedIds[id];
    const next = { ...get().likedIds };
    if (wasLiked) delete next[id];
    else next[id] = true;
    set({ likedIds: next }); // optimistic
    try {
      if (wasLiked) await api.library.unlike(id);
      else await api.library.like(id);
    } catch (e) {
      const revert = { ...get().likedIds };
      if (wasLiked) revert[id] = true;
      else delete revert[id];
      set({ likedIds: revert });
      throw e;
    }
  },
  actionContext: null,
  openTrackActions: (track, context = null) => set({ actionTrack: track, actionContext: context }),
  closeTrackActions: () => set({ actionTrack: null, actionContext: null }),
  resetUserState: () =>
    set({ likedIds: {}, actionTrack: null, actionContext: null, theme: themes.hive, themeName: 'hive' }),



  setQueue: async (queue) => {
    if (isNative) {
      await TrackPlayer.reset();
      await TrackPlayer.add(queue);
    }
    set({ queue });
  },
  addTrack: async (track) => {
    const { queue } = get();
    if (isNative) {
      await TrackPlayer.add([track]);
    }
    set({ queue: [...queue, track] });
  },
  reorderQueue: async (newQueue) => {
    set({ queue: newQueue });
  },
  playTrack: async (track) => {
    const { queue } = get();
    const exists = queue.find(t => t.id === track.id);
    
    if (isNative) {
      if (!exists) {
        await TrackPlayer.add([track]);
        set({ queue: [...queue, track] });
      }
      const index = (exists ? queue : [...queue, track]).findIndex(t => t.id === track.id);
      if (index !== -1) {
        await TrackPlayer.skip(index);
      } else {
        await TrackPlayer.reset();
        await TrackPlayer.add([track]);
      }
      await TrackPlayer.play();
    } else {
      console.warn("TrackPlayer is not available in Expo Go. Skipping native playback.");
      if (!exists) {
        set({ queue: [...queue, track] });
      }
    }
    
    set({ currentTrack: track, isPlaying: true });

    // Feeds "recently played" + popularity on the backend. Fire-and-forget.
    if (isRemoteTrack(track)) api.library.recordPlay(track.id).catch(() => {});
  },

  // Replace the queue with a list (album / playlist) and start at `startIndex`.
  playList: async (tracks, startIndex = 0) => {
    const playable = tracks.filter((t) => t.url);
    if (!playable.length) return;
    const start = tracks[startIndex]?.url ? tracks[startIndex] : playable[0];
    await get().setQueue(playable);
    await get().playTrack(start);
  },

  togglePlayback: async () => {
    const { isPlaying } = get();
    if (isNative) {
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    }
    set({ isPlaying: !isPlaying });
  },
  skipToNext: async () => {
    if (isNative) await TrackPlayer.skipToNext();
  },
  skipToPrevious: async () => {
    if (isNative) await TrackPlayer.skipToPrevious();
  },

  // ---- songs on this device ----
  localPermission: 'undetermined', // 'granted' | 'denied' | 'undetermined' | 'unavailable'
  localScanning: false,
  // Scan if permission is already granted (no prompt). Safe to call on every app start.
  initLocalMusic: async () => {
    const status = await getLocalPermission();
    set({ localPermission: status });
    if (status === 'granted') await get().scanLocalMusic();
  },
  // Ask for permission (shows the system prompt), then scan.
  requestLocalMusic: async () => {
    const status = await requestLocalPermission();
    set({ localPermission: status });
    if (status === 'granted') await get().scanLocalMusic();
    return status;
  },
  scanLocalMusic: async () => {
    if (get().localScanning) return;
    set({ localScanning: true });
    try {
      set({ localTracks: await scanLocalSongs() });
    } catch (e) {
      console.log('Local music scan failed:', e.message);
    } finally {
      set({ localScanning: false });
    }
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
}));

