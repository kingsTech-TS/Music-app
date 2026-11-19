import { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

const POLL_MS = 3000; // ask Spotify for the real state (a round trip takes ~1-2s, so don't overlap)

/**
 * Progress for songs playing through Spotify Connect, in seconds: { position, duration }.
 * `active` → keep the value ticking locally; `poll` → also ask Spotify for the real state every few seconds.
 */
export function useSpotifyProgress(active, poll = true, tickMs = 250) {
  const { spotifyProgress, isPlaying, syncSpotify } = usePlayerStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active || !poll) return;
    syncSpotify();
    const t = setInterval(syncSpotify, POLL_MS);
    return () => clearInterval(t);
  }, [active, poll]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(t);
  }, [active, tickMs]);

  if (!active || !spotifyProgress) return { position: 0, duration: 0 };
  const elapsed = isPlaying ? now - spotifyProgress.at : 0;
  const durationMs = spotifyProgress.durationMs || 0;
  const positionMs = Math.min(spotifyProgress.progressMs + Math.max(elapsed, 0), durationMs || Infinity);
  return { position: positionMs / 1000, duration: durationMs / 1000 };
}
