import { create } from 'zustand';
import { Linking } from 'react-native';
import { api, isRemoteTrack, isSpotifyTrack } from '../lib/api';
import { getLocalPermission, requestLocalPermission, scanLocalSongs } from '../lib/localMusic';
import { storage } from '../lib/storage';

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


// ---- Spotify playback helpers ----
const NEEDS_SPOTIFY_APP = ['NO_PHONE_DEVICE', 'NO_ACTIVE_DEVICE'];
const SPOTIFY_RETRY_MS = 5000; // give the Spotify app time to start and register this phone
const STALL_MIN_GAP_MS = 1500; // two syncs this far apart with an unchanged position = stalled
const DRIFT_TOLERANCE_MS = 700; // re-align the progress bar with Spotify only when it's off by more than this

// Open a spotify:track/playlist URI in the Spotify app. False if the app isn't installed.
async function openInSpotifyApp(uri) {
  try {
    await Linking.openURL(uri);
    return true;
  } catch {
    return false;
  }
}

// True if the phone's Spotify app is already playing `uri` (e.g. because we just opened it there).
async function phoneAlreadyPlaying(uri) {
  try {
    const s = await api.spotify.state();
    return !!(s?.is_playing && s.track?.spotify_uri === uri && s.device?.type?.toLowerCase() === 'smartphone');
  } catch {
    return false;
  }
}

// ---- repeat / shuffle / resume helpers ----
const SPOTIFY_REPEAT = { off: 'off', queue: 'context', track: 'track' };
const FROM_SPOTIFY_REPEAT = { off: 'off', context: 'queue', track: 'track' };
const REPEAT_LABEL = { off: 'Repeat off', queue: 'Repeating queue', track: 'Repeating this song' };
const LAST_PLAYBACK_KEY = 'rave.lastPlayback';
const FINISHED_MARGIN_S = 10; // stopped this close to the end = finished, start over next time

// Fisher–Yates shuffle (returns a new array).
function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
    set((s) => ({
      likedIds: {},
      actionTrack: null,
      actionContext: null,
      theme: themes.hive,
      themeName: 'hive',
      // Spotify playback belongs to the signed-out account.
      ...(s.mode === 'spotify'
        ? { mode: 'native', currentTrack: null, isPlaying: false, queue: [], spotifyProgress: null }
        : {}),
    })),



  // ---- small status messages (rendered by <Toast/>) ----
  toast: null,
  showToast: (text) => set({ toast: { text, id: Date.now() } }),

  // ================= Playback =================
  // Two engines behind one API:
  //   'native'  → react-native-track-player (uploads, external URLs, files on the phone)
  //   'spotify' → Spotify Connect (the Spotify app plays; we send commands)
  mode: 'native',
  queueIndex: -1, // index of currentTrack in `queue` (native)
  originalQueue: null, // queue order before shuffling (native), to restore when shuffle is turned off
  loaded: false, // false when currentTrack was restored from last session and isn't in a player yet
  resumeAt: 0, // seconds to start currentTrack from when `loaded` is false
  spotifyProgress: null, // Last known Spotify position: { progressMs, durationMs, at }

  // Hook up native player events once (song changes by itself, lock-screen controls, queue end).
  initNativeEvents: () => {
    if (!isNative || get()._nativeEventsReady) return;
    set({ _nativeEventsReady: true });
    const { Event, State } = require('react-native-track-player');

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ index, track, lastTrack, lastPosition }) => {
      if (get().mode !== 'native') return;
      if (lastTrack && lastTrack.id !== track?.id) {
        get()._savePosition(lastTrack, lastPosition || 0, lastTrack.duration);
      }
      if (track) {
        set({ currentTrack: track, queueIndex: index ?? get().queueIndex, loaded: true });
        if (isRemoteTrack(track)) api.library.recordPlay(track.id).catch(() => {});
      }
    });
    TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
      if (get().mode !== 'native' || !get().loaded) return;
      if (state === State.Playing) set({ isPlaying: true });
      else if (state === State.Paused || state === State.Stopped || state === State.Ended) set({ isPlaying: false });
    });
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, ({ track }) => {
      if (get().mode !== 'native') return;
      set({ isPlaying: false });
      const t = get().currentTrack;
      if (t) get()._savePosition(t, 0, t.duration); // finished → next time starts from the beginning
    });
  },

  // ---------- starting playback ----------

  // Replace the queue with a list (album / playlist / search results / history) and start at `startIndex`.
  // opts.startAt: seconds into the first song (resume). opts.shuffle: shuffle the rest of the list.
  playList: async (tracks, startIndex = 0, opts = {}) => {
    if (opts.shuffle && !get().shuffle) set({ shuffle: true });
    if (isSpotifyTrack(tracks[startIndex])) {
      return get().playSpotify(tracks, startIndex, { positionMs: (opts.startAt || 0) * 1000, shuffle: opts.shuffle });
    }
    const playable = tracks.filter((t) => t.url && !isSpotifyTrack(t));
    if (!playable.length) return;
    const start = playable.includes(tracks[startIndex]) ? tracks[startIndex] : playable[0];
    const original = [...playable];
    let list = playable;
    let index = playable.indexOf(start);
    if (get().shuffle) {
      // Chosen song first, everything else shuffled after it.
      list = [start, ...shuffled(playable.filter((t) => t !== start))];
      index = 0;
    }
    await get()._loadNative(list, index, opts.startAt || 0, get().shuffle ? original : null);
  },

  // Play one song. If it's already in the native queue, jump to it; otherwise play it on its own.
  playTrack: async (track, opts = {}) => {
    if (isSpotifyTrack(track)) return get().playSpotify([track], 0, { positionMs: (opts.startAt || 0) * 1000 });
    const i = get().mode === 'native' && get().loaded ? get().queue.findIndex((t) => t.id === track.id) : -1;
    if (i !== -1) return get().playQueueIndex(i);
    return get().playList([track], 0, opts);
  },

  _loadNative: async (list, index, startAt = 0, originalQueue = null) => {
    if (get().mode === 'spotify') {
      get()._persistNow();
      api.spotify.pause().catch(() => {}); // don't play two songs at once
    }
    const track = list[index];
    if (!isNative) {
      // Expo Go has no native audio module.
      set({ currentTrack: track, queue: list, queueIndex: index, isPlaying: false, mode: 'native', loaded: false, resumeAt: startAt });
      get().showToast('Playing this song needs a development build (Expo Go can only play Spotify songs).');
      return;
    }
    if (get().mode === 'native' && get().loaded && get().currentTrack) get()._persistNow();

    set({ mode: 'native', queue: list, queueIndex: index, currentTrack: track, isPlaying: true, loaded: true, resumeAt: 0, originalQueue });
    await TrackPlayer.reset();
    await TrackPlayer.add(list);
    await TrackPlayer.skip(index, startAt > 0 ? startAt : undefined);
    await get()._applyNativeRepeat();
    await TrackPlayer.play(); // the PlaybackActiveTrackChanged event records the play
  },

  // Play Spotify songs on the user's Spotify app (Spotify Connect). Needs Spotify Premium.
  // opts: { retried, positionMs, shuffle }
  playSpotify: async (tracks, startIndex = 0, opts = {}) => {
    const { retried = false, positionMs = 0 } = opts;
    const list = tracks.filter(isSpotifyTrack);
    const start = isSpotifyTrack(tracks[startIndex]) ? tracks[startIndex] : list[0];
    if (!start) return;
    // Spotify accepts up to 100 URIs per request: send a window around the chosen song.
    const startPos = list.indexOf(start);
    const from = Math.max(0, Math.min(startPos - 10, list.length - 100));
    const windowed = list.slice(from, from + 100);

    if (get().mode === 'native' && get().loaded) {
      get()._persistNow();
      if (isNative) TrackPlayer.pause().catch(() => {});
    }
    set({
      currentTrack: start,
      isPlaying: true,
      mode: 'spotify',
      loaded: true,
      resumeAt: 0,
      queue: windowed,
      queueIndex: startPos - from,
      spotifyProgress: { progressMs: positionMs, durationMs: (start.duration || 0) * 1000, at: Date.now() },
      _lastSpotifySync: null,
      _spotifyStallWarned: false,
    });

    try {
      if (retried && (await phoneAlreadyPlaying(start.spotify_uri))) {
        // Opening the song in Spotify already started it — don't restart it from 0:00.
      } else {
        await api.spotify.play({ uris: windowed.map((t) => t.spotify_uri), offset: startPos - from, positionMs });
      }
      // Keep Spotify's shuffle/repeat in line with ours.
      if (opts.shuffle || get().shuffle) api.spotify.shuffle(true).catch(() => {});
      if (get().repeatMode !== 'off') api.spotify.repeat(SPOTIFY_REPEAT[get().repeatMode]).catch(() => {});
      api.library.recordPlay(start.id).catch(() => {});
      setTimeout(() => get().syncSpotify(), 1200);
    } catch (e) {
      await get()._handleSpotifyPlayError(e, start.spotify_uri, retried, () =>
        get().playSpotify(tracks, startIndex, { ...opts, retried: true })
      );
    }
  },

  // Shared error handling for Spotify playback.
  _handleSpotifyPlayError: async (e, uri, retried, retry) => {
    set({ isPlaying: false });
    if (NEEDS_SPOTIFY_APP.includes(e.reason) && !retried) {
      // The phone isn't a Spotify device until the Spotify app is open: open the song there, then retry.
      if (!(await openInSpotifyApp(uri))) {
        get().showToast('Install the Spotify app on this phone to play Spotify songs.');
        return;
      }
      get().showToast('Opening Spotify… playback will continue on this phone.');
      setTimeout(() => retry().catch(() => {}), SPOTIFY_RETRY_MS);
      return;
    }
    if (e.reason === 'PREMIUM_REQUIRED') openInSpotifyApp(uri);
    get().showToast(e.message);
  },

  // Play a whole Spotify playlist/album by its URI (used when Spotify won't list its songs to us).
  playSpotifyContext: async ({ uri, name, artwork }, retried = false) => {
    if (get().mode === 'native' && get().loaded) {
      get()._persistNow();
      if (isNative) TrackPlayer.pause().catch(() => {});
    }
    set({
      mode: 'spotify',
      isPlaying: true,
      loaded: true,
      resumeAt: 0,
      // Placeholder until the first sync tells us the actual song.
      currentTrack: { id: `ctx:${uri}`, title: name, artist: 'Spotify', artwork, source: 'spotify', spotify_uri: uri },
      spotifyProgress: { progressMs: 0, durationMs: 0, at: Date.now() },
      _lastSpotifySync: null,
      _spotifyStallWarned: false,
    });
    try {
      await api.spotify.play({ contextUri: uri });
      setTimeout(() => get().syncSpotify(), 1200);
    } catch (e) {
      await get()._handleSpotifyPlayError(e, uri, retried, () =>
        get().playSpotifyContext({ uri, name, artwork }, true)
      );
    }
  },

  // Pull what Spotify is actually playing (track changes, pause from the Spotify app, progress,
  // repeat/shuffle). Stall detection: Spotify can report "playing" on a device that isn't producing
  // sound (e.g. a background Web Player tab) — its position then stays at the same value.
  _lastSpotifySync: null,
  _spotifyStallWarned: false,
  _spotifySyncInFlight: null,
  syncSpotify: () => {
    if (get().mode !== 'spotify' || !get().loaded) return Promise.resolve();
    // Now Playing and the mini player both poll: share one request instead of racing two.
    if (get()._spotifySyncInFlight) return get()._spotifySyncInFlight;
    const run = (async () => {
      try {
        const t0 = Date.now();
        const s = await api.spotify.state();
        const now = Date.now();
        if (get().mode !== 'spotify') return;

        // `progress_ms` is as of when the server replied; the reply then spent ~half the network time in transit.
        const transit = Math.max(0, (now - t0 - (s.server_ms || 0)) / 2);
        const reportedNow = Math.min(
          s.progress_ms + (s.is_playing ? transit : 0),
          s.duration_ms || Infinity
        );

        const prev = get()._lastSpotifySync;
        const trackId = s.track?.id || null;
        const sameTrack = !!prev && prev.trackId === trackId;
        // A real playing song advances roughly as fast as the clock; a stuck device barely moves.
        const stalled =
          s.is_playing &&
          sameTrack &&
          now - prev.at >= STALL_MIN_GAP_MS &&
          s.progress_ms - prev.progressMs < (now - prev.at) * 0.4;

        if (stalled && !get()._spotifyStallWarned) {
          const where = s.device?.name ? ` on "${s.device.name}"` : '';
          get().showToast(`Spotify says it's playing${where}, but it isn't moving. Open Spotify on this phone and try again.`);
        }

        // The song changed in Spotify (ended / skipped there): remember where the previous one stopped.
        const before = get().currentTrack;
        if (s.track && before && before.id !== s.track.id && !String(before.id).startsWith('ctx:')) {
          const p = get().spotifyProgress;
          const lastPos = p ? (p.progressMs + (get().isPlaying ? now - p.at : 0)) / 1000 : 0;
          get()._savePosition(before, lastPos, before.duration);
        }

        // Keep the local clock unless it's really off — re-snapping on every poll makes the bar jitter.
        const cur = get().spotifyProgress;
        const wasPlaying = get().isPlaying;
        const displayed = cur ? cur.progressMs + (wasPlaying ? now - cur.at : 0) : null;
        const playing = s.is_playing && !stalled;
        const keepClock =
          cur && sameTrack && playing && wasPlaying && Math.abs(displayed - reportedNow) < DRIFT_TOLERANCE_MS;

        set({
          isPlaying: playing, // don't animate progress that isn't really happening
          ...(s.track ? { currentTrack: s.track } : {}),
          repeatMode: FROM_SPOTIFY_REPEAT[s.repeat_state] || 'off',
          shuffle: !!s.shuffle_state,
          spotifyProgress: keepClock
            ? { ...cur, durationMs: s.duration_ms }
            : { progressMs: reportedNow, durationMs: s.duration_ms, at: now },
          _lastSpotifySync: { trackId, progressMs: s.progress_ms, at: now },
          _spotifyStallWarned: stalled,
        });
      } catch {
      } finally {
        set({ _spotifySyncInFlight: null });
      }
    })();
    set({ _spotifySyncInFlight: run });
    return run;
  },

  // ---------- controls ----------

  togglePlayback: async () => {
    const { isPlaying, mode, loaded, currentTrack } = get();
    if (!currentTrack) return;

    // Restored from last session: start it from where it stopped.
    if (!loaded) return get().resumeCurrent();

    if (mode === 'spotify') {
      // Freeze (pause) or restart (resume) the local clock at the current position so the bar doesn't jump.
      const cur = get().spotifyProgress;
      const now = Date.now();
      const position = cur ? cur.progressMs + (isPlaying ? now - cur.at : 0) : 0;
      set({ isPlaying: !isPlaying, spotifyProgress: cur ? { ...cur, progressMs: position, at: now } : cur });
      if (isPlaying) get()._persistNow();
      try {
        if (isPlaying) await api.spotify.pause();
        else await api.spotify.resume();
        get().syncSpotify();
      } catch (e) {
        set({ isPlaying });
        get().showToast(e.message);
      }
      return;
    }
    if (isNative) {
      if (isPlaying) {
        await TrackPlayer.pause();
        get()._persistNow();
      } else {
        await TrackPlayer.play();
      }
    }
    set({ isPlaying: !isPlaying });
  },

  // Start the restored song from its saved position (and keep the restored queue if there is one).
  resumeCurrent: async () => {
    const { currentTrack, resumeAt, queue, queueIndex } = get();
    if (!currentTrack) return;
    if (isSpotifyTrack(currentTrack)) {
      return get().playSpotify([currentTrack], 0, { positionMs: (resumeAt || 0) * 1000 });
    }
    const hasQueue = queue.length && queue[queueIndex]?.id === currentTrack.id;
    return get().playList(hasQueue ? queue : [currentTrack], hasQueue ? queueIndex : 0, { startAt: resumeAt || 0 });
  },

  skipToNext: async () => {
    if (!get().loaded) return;
    if (get().mode === 'spotify') {
      try {
        await api.spotify.next();
        setTimeout(() => get().syncSpotify(), 700);
      } catch (e) {
        get().showToast(e.message);
      }
      return;
    }
    if (isNative) await TrackPlayer.skipToNext().catch(() => get().showToast('This is the last song in the queue'));
  },
  skipToPrevious: async () => {
    if (!get().loaded) return;
    if (get().mode === 'spotify') {
      try {
        await api.spotify.previous();
        setTimeout(() => get().syncSpotify(), 700);
      } catch (e) {
        get().showToast(e.message);
      }
      return;
    }
    if (isNative) {
      // Like most players: restart the song if we're more than a few seconds in, otherwise go back.
      const { position } = await TrackPlayer.getProgress();
      if (position > 3 || get().queueIndex <= 0) await TrackPlayer.seekTo(0);
      else await TrackPlayer.skipToPrevious();
    }
  },
  seekTo: async (seconds) => {
    if (!get().loaded) {
      set({ resumeAt: seconds });
      return;
    }
    if (get().mode === 'spotify') {
      const prev = get().spotifyProgress;
      set({ spotifyProgress: { ...prev, progressMs: seconds * 1000, at: Date.now() } });
      api.spotify.seek(seconds * 1000).catch((e) => get().showToast(e.message));
      return;
    }
    if (isNative) await TrackPlayer.seekTo(seconds);
  },

  // ---------- repeat & shuffle ----------
  repeatMode: 'off', // 'off' | 'queue' | 'track'
  shuffle: false,

  // off → repeat queue → repeat song → off
  cycleRepeat: async () => {
    const next = { off: 'queue', queue: 'track', track: 'off' }[get().repeatMode] || 'off';
    const prev = get().repeatMode;
    set({ repeatMode: next });
    get().showToast(REPEAT_LABEL[next]);
    try {
      if (get().mode === 'spotify' && get().loaded) await api.spotify.repeat(SPOTIFY_REPEAT[next]);
      else await get()._applyNativeRepeat();
    } catch (e) {
      set({ repeatMode: prev });
      get().showToast(e.message);
    }
  },

  _applyNativeRepeat: async () => {
    if (!isNative) return;
    const { RepeatMode } = require('react-native-track-player');
    const map = { off: RepeatMode.Off, queue: RepeatMode.Queue, track: RepeatMode.Track };
    await TrackPlayer.setRepeatMode(map[get().repeatMode] ?? RepeatMode.Off);
  },

  toggleShuffle: async () => {
    const on = !get().shuffle;
    set({ shuffle: on });
    get().showToast(on ? 'Shuffle on' : 'Shuffle off');

    if (get().mode === 'spotify' && get().loaded) {
      try {
        await api.spotify.shuffle(on);
      } catch (e) {
        set({ shuffle: !on });
        get().showToast(e.message);
      }
      return;
    }

    // Native: reorder only what's coming up next; the current song keeps playing.
    const { queue, queueIndex, originalQueue, loaded } = get();
    if (!loaded || queueIndex < 0) return;
    const upcoming = queue.slice(queueIndex + 1);
    let reordered;
    if (on) {
      reordered = shuffled(upcoming);
      set({ originalQueue: originalQueue || [...queue] });
    } else {
      // Restore the original order for the songs that haven't played yet.
      const order = new Map((originalQueue || queue).map((t, i) => [t.id, i]));
      reordered = [...upcoming].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      set({ originalQueue: null });
    }
    await get()._replaceUpcoming(reordered);
  },

  // ---------- queue ----------

  _replaceUpcoming: async (upcoming) => {
    const { queue, queueIndex } = get();
    const newQueue = [...queue.slice(0, queueIndex + 1), ...upcoming];
    set({ queue: newQueue });
    if (!isNative || !get().loaded) return;
    const toRemove = queue.map((_, i) => i).filter((i) => i > queueIndex);
    if (toRemove.length) await TrackPlayer.remove(toRemove);
    if (upcoming.length) await TrackPlayer.add(upcoming);
  },

  // Jump to a song in the native queue.
  playQueueIndex: async (index) => {
    const track = get().queue[index];
    if (!track) return;
    if (get().mode === 'spotify') return get().playSpotify(get().queue, index);
    if (!isNative || !get().loaded) return get().playList(get().queue, index);
    if (get().currentTrack) get()._persistNow();
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
    set({ queueIndex: index, currentTrack: track, isPlaying: true });
  },

  removeFromQueue: async (index) => {
    const { queue, queueIndex } = get();
    if (index === queueIndex || !queue[index]) return;
    if (isNative && get().loaded && get().mode === 'native') await TrackPlayer.remove(index);
    set({
      queue: queue.filter((_, i) => i !== index),
      queueIndex: index < queueIndex ? queueIndex - 1 : queueIndex,
      originalQueue: get().originalQueue?.filter((t) => t.id !== queue[index].id) || null,
    });
  },

  // Add to the end of the queue (`next: true` → play right after the current song).
  addToQueue: async (track, { next = false } = {}) => {
    const { mode, loaded, queue, queueIndex, currentTrack } = get();
    const label = next ? 'Playing next' : 'Added to queue';

    if (isSpotifyTrack(track)) {
      if (mode === 'spotify' && loaded) {
        try {
          await api.spotify.addToQueue(track.spotify_uri); // Spotify plays its queue before the rest of the list
          get().showToast(label);
        } catch (e) {
          get().showToast(e.message);
        }
      } else if (!currentTrack || !loaded) {
        await get().playSpotify([track], 0);
      } else {
        get().showToast("Spotify songs can be queued while a Spotify song is playing.");
      }
      return;
    }

    if (!track.url) return;
    if (!currentTrack || !loaded || mode !== 'native') {
      if (mode === 'spotify' && loaded) {
        get().showToast("Your own songs can be queued while one of them is playing.");
        return;
      }
      await get().playList([track], 0);
      return;
    }
    const at = next ? queueIndex + 1 : queue.length;
    const newQueue = [...queue.slice(0, at), track, ...queue.slice(at)];
    set({ queue: newQueue, originalQueue: get().originalQueue ? [...get().originalQueue, track] : null });
    if (isNative) await TrackPlayer.add([track], next ? at : undefined);
    get().showToast(label);
  },
  // Backwards-compatible name used by older screens.
  addTrack: async (track) => get().addToQueue(track),

  // Spotify's queue comes from Spotify itself.
  fetchSpotifyQueue: async () => api.spotify.queue(),

  // ---------- resume where you stopped ----------

  // Current position in seconds, from whichever engine is playing.
  getPosition: async () => {
    const { mode, loaded, resumeAt, currentTrack, spotifyProgress, isPlaying } = get();
    if (!currentTrack) return { position: 0, duration: 0 };
    if (!loaded) return { position: resumeAt || 0, duration: currentTrack.duration || 0 };
    if (mode === 'spotify') {
      if (!spotifyProgress) return { position: 0, duration: currentTrack.duration || 0 };
      const ms = spotifyProgress.progressMs + (isPlaying ? Date.now() - spotifyProgress.at : 0);
      return { position: ms / 1000, duration: (spotifyProgress.durationMs || 0) / 1000 || currentTrack.duration || 0 };
    }
    if (!isNative) return { position: 0, duration: currentTrack.duration || 0 };
    const p = await TrackPlayer.getProgress();
    return { position: p.position, duration: p.duration || currentTrack.duration || 0 };
  },

  // Remember where `track` stopped: on the phone (last song, works offline + device files)
  // and on the server (history), for songs that live there.
  _savePosition: (track, position, duration) => {
    if (!track || String(track.id).startsWith('ctx:')) return;
    const pos = Math.max(0, position || 0);
    if (get().currentTrack?.id === track.id) {
      const { queue, queueIndex } = get();
      // Keep the queue (without huge lists) so the session can be restored as it was.
      const savedQueue = queue.length <= 200 ? queue : [track];
      storage
        .set(
          LAST_PLAYBACK_KEY,
          JSON.stringify({ track, position: pos, duration, queue: savedQueue, queueIndex: savedQueue === queue ? queueIndex : 0, savedAt: Date.now() })
        )
        .catch?.(() => {});
    }
    if (isRemoteTrack(track)) api.library.savePosition(track.id, pos, duration || track.duration).catch(() => {});
  },

  // Save the current song's position now (pause, song change, app going to background, periodic).
  _persistNow: async () => {
    const { currentTrack, loaded } = get();
    if (!currentTrack || !loaded) return;
    try {
      const { position, duration } = await get().getPosition();
      get()._savePosition(currentTrack, position, duration);
    } catch {}
  },
  persistPlayback: async () => get()._persistNow(),

  // On app start: bring back the last song, paused where it stopped. Press play to continue.
  restoreLastPlayback: async () => {
    if (get().currentTrack) return;
    try {
      const raw = await storage.get(LAST_PLAYBACK_KEY);
      if (!raw) return;
      const last = JSON.parse(raw);
      if (!last?.track || get().currentTrack) return;
      const finished = last.duration && last.position >= last.duration - FINISHED_MARGIN_S;
      const position = finished ? 0 : last.position || 0;
      const queue = Array.isArray(last.queue) && last.queue.length ? last.queue : [last.track];
      set({
        currentTrack: last.track,
        queue,
        queueIndex: Math.max(0, queue.findIndex((t) => t.id === last.track.id)),
        isPlaying: false,
        loaded: false,
        resumeAt: position,
        mode: isSpotifyTrack(last.track) ? 'spotify' : 'native',
        spotifyProgress: { progressMs: position * 1000, durationMs: (last.duration || 0) * 1000, at: Date.now() },
      });
    } catch {}
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
}));

