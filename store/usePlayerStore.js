import { create } from 'zustand';

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


// Safe Capability mock for Expo Go
const Capability = {
  Play: 1,
  Pause: 2,
  SkipToNext: 3,
  SkipToPrevious: 4,
  Stop: 5,
};



const themes = {
  mume: { 
    primary: '#181a20', 
    accent: '#ff8c00', 
    text: '#ffffff', 
    secondaryText: '#9e9e9e', 
    surface: '#1f222a' 
  },
  dark: { primary: '#121212', accent: '#1DB954', text: '#fff', secondaryText: '#b3b3b3', surface: '#282828' },
  sunset: { primary: '#2D1B33', accent: '#FF4500', text: '#FFD700', secondaryText: '#FFA07A', surface: '#3D2B43' },
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
  theme: themes.mume,


  setPlayerReady: (isReady) => set({ isPlayerReady: isReady }),
  setLocalTracks: (tracks) => set({ localTracks: tracks }),
  setSearchResults: (tracks) => set({ searchResults: tracks }),
  setTheme: (themeName) => set({ theme: themes[themeName] || themes.dark }),



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

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
}));

