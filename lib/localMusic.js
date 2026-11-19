import { Platform } from 'react-native';

// SDK 58 moved the classic API to `expo-media-library/legacy`; the root import throws for these calls.
let MediaLibrary = null;
try {
  MediaLibrary = require('expo-media-library/legacy');
} catch {
  MediaLibrary = null;
}

const AUDIO = ['audio'];
const PAGE_SIZE = 500;
// Skip ringtones, notification sounds and short voice notes.
const MIN_DURATION_SECONDS = 30;

export const localMusicSupported = !!MediaLibrary && Platform.OS !== 'web';

const stripExtension = (name = '') => name.replace(/\.[^/.]+$/, '');

// "Artist - Title.mp3" is the most common naming for downloaded music.
function parseFilename(filename) {
  const base = stripExtension(filename).replace(/_/g, ' ').trim();
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { artist: null, title: base };
}

// Returns 'granted' | 'denied' | 'undetermined' | 'unavailable'
export async function getLocalPermission() {
  if (!localMusicSupported) return 'unavailable';
  try {
    const res = await MediaLibrary.getPermissionsAsync(false, AUDIO);
    return res.granted ? 'granted' : res.canAskAgain === false ? 'denied' : 'undetermined';
  } catch {
    return 'unavailable';
  }
}

export async function requestLocalPermission() {
  if (!localMusicSupported) return 'unavailable';
  try {
    const res = await MediaLibrary.requestPermissionsAsync(false, AUDIO);
    return res.granted ? 'granted' : res.canAskAgain === false ? 'denied' : 'undetermined';
  } catch {
    return 'unavailable';
  }
}

// Read every audio file on the device, newest first, in the shape TrackPlayer expects.
export async function scanLocalSongs() {
  if (!localMusicSupported) return [];

  // Folder names (e.g. "Download", "WhatsApp Audio", an artist folder) give useful context.
  const folders = {};
  try {
    const albums = await MediaLibrary.getAlbumsAsync();
    albums.forEach((a) => (folders[a.id] = a.title));
  } catch {}

  const assets = [];
  let after;
  let hasNextPage = true;
  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: PAGE_SIZE,
      after,
      sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
    });
    assets.push(...page.assets);
    after = page.endCursor;
    hasNextPage = page.hasNextPage && !!after;
  }

  return assets
    .filter((a) => !a.duration || a.duration >= MIN_DURATION_SECONDS)
    .map((a) => {
      const { artist, title } = parseFilename(a.filename);
      const folder = folders[a.albumId] || null;
      return {
        id: `local:${a.id}`,
        url: a.uri,
        title,
        artist: artist || folder || 'Unknown artist',
        album: folder,
        artwork: undefined,
        duration: a.duration || undefined,
        isLocal: true,
      };
    });
}
