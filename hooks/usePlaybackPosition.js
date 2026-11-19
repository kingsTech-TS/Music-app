import { usePlayerStore } from '../store/usePlayerStore';
import { useSpotifyProgress } from './useSpotifyProgress';

// react-native-track-player's progress hook, or a stub when the native module is missing (Expo Go).
const useNativeProgress = (() => {
  try {
    const TP = require('react-native-track-player');
    if (TP.default?.setupPlayer && TP.useProgress) return (interval) => TP.useProgress(interval);
  } catch {}
  return () => ({ position: 0, duration: 0 });
})();

/**
 * Position/duration (seconds) of the current song, whichever engine is playing it:
 * - a restored song that isn't loaded yet → its saved resume point
 * - Spotify → Spotify progress (`pollSpotify` makes this screen ask Spotify every few seconds)
 * - native → react-native-track-player
 */
export function usePlaybackPosition(pollSpotify = true, interval = 250) {
  const { mode, loaded, resumeAt, currentTrack } = usePlayerStore();
  const native = useNativeProgress(interval);
  const spotify = useSpotifyProgress(loaded && mode === 'spotify' && !!currentTrack, pollSpotify, interval);

  if (!currentTrack) return { position: 0, duration: 0 };
  if (!loaded) return { position: resumeAt || 0, duration: currentTrack.duration || 0 };
  if (mode === 'spotify') return spotify;
  return { position: native.position, duration: native.duration || currentTrack.duration || 0 };
}
