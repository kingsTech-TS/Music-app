import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { PressableScale } from '../components/Motion';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/usePlayerStore';
import TrackItem from '../components/TrackItem';
import { api } from '../lib/api';

const { width } = Dimensions.get('window');

// type: 'collection' | 'album' | 'artist' (→ /collections/:id), 'playlist' (→ /playlists/:id)
// or 'spotify_playlist' (→ /spotify/playlists/:id)
export default function DetailScreen() {
  const params = useLocalSearchParams();
  const { type, id } = params;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, playList, playSpotifyContext } = usePlayerStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isSpotifyPlaylist = type === 'spotify_playlist';
  const isPlaylist = type === 'playlist' || isSpotifyPlaylist;
  const isArtist = type === 'artist' || data?.type === 'artist';

  const load = useCallback(async () => {
    setError('');
    try {
      setData(
        isSpotifyPlaylist
          ? await api.spotify.playlist(id)
          : type === 'playlist'
            ? await api.playlists.get(id)
            : await api.collections.get(id)
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    load();
  }, [load]);

  // Show what we were given immediately, then fill in from the API.
  const title = data?.title || data?.name || params.title;
  const artwork = data?.artwork || data?.cover || params.artwork || undefined;
  const subtitle = isSpotifyPlaylist
    ? data?.owner && `By ${data.owner}`
    : isPlaylist
      ? data?.description
      : data?.artist || data?.subtitle || params.artist;
  const songs = data?.tracks || [];

  const stats = isPlaylist
    ? `${isSpotifyPlaylist ? 'Spotify Playlist' : 'Playlist'} | ${songs.length} ${songs.length === 1 ? 'Song' : 'Songs'}`
    : [isArtist ? 'Artist' : data?.type === 'album' ? 'Album' : 'Collection', data?.year, `${songs.length} Songs`]
        .filter(Boolean)
        .join(' | ');

  // Followed Spotify playlists: Spotify won't list their songs to us, but can play the whole playlist.
  const restricted = isSpotifyPlaylist && !!data?.restricted;
  const playWholePlaylist = () => playSpotifyContext({ uri: data.uri, name: data.name, artwork: data.artwork });

  const handlePlay = () => (restricted ? playWholePlaylist() : playList(songs, 0));

  // Random first song, shuffle mode on for the rest (and for Spotify's own player).
  const handleShuffle = () => {
    if (restricted) return playWholePlaylist();
    if (!songs.length) return;
    playList(songs, Math.floor(Math.random() * songs.length), { shuffle: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <PressableScale style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </PressableScale>
        </View>

        <View style={styles.artContainer}>
          {artwork ? (
            <Image
              source={{ uri: artwork }}
              style={[styles.artwork, isArtist ? styles.artistImage : styles.albumImage]}
            />
          ) : (
            <View style={[styles.artwork, styles.albumImage, styles.artFallback, { backgroundColor: theme.surface }]}>
              <Ionicons name="musical-notes" size={80} color={theme.accent} />
            </View>
          )}
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {!!subtitle && <Text style={[styles.artistName, { color: theme.secondaryText }]}>{subtitle}</Text>}
          {!loading && <Text style={[styles.stats, { color: theme.secondaryText }]}>{stats}</Text>}
        </View>

        <View style={styles.actionButtons}>
          <PressableScale
            style={[styles.playButton, { backgroundColor: theme.accent }]}
            onPress={handleShuffle}
            disabled={!songs.length && !restricted}
          >
            <Ionicons name="shuffle" size={20} color={theme.onAccent || '#fff'} />
            <Text style={[styles.buttonText, { color: theme.onAccent || '#fff' }]}>Shuffle</Text>
          </PressableScale>
          <PressableScale
            style={[styles.playButton, styles.outlineButton, { borderColor: theme.accent }]}
            onPress={handlePlay}
            disabled={!songs.length && !restricted}
          >
            <Ionicons name="play" size={20} color={theme.accent} />
            <Text style={[styles.buttonText, { color: theme.accent }]}>Play</Text>
          </PressableScale>
        </View>

        <View style={styles.songList}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Songs</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
          ) : error ? (
            <PressableScale onPress={load} style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>{error}</Text>
              <Text style={{ color: theme.accent, fontWeight: '700', marginTop: 8 }}>Tap to retry</Text>
            </PressableScale>
          ) : restricted ? (
            <View style={[styles.notice, { backgroundColor: theme.surface }]}>
              <FontAwesome name="spotify" size={22} color="#1DB954" />
              <Text style={{ color: theme.secondaryText, flex: 1, marginLeft: 12, lineHeight: 19 }}>
                Spotify only shares the song list for playlists you created. Tap Play to listen to this one in Spotify.
              </Text>
            </View>
          ) : songs.length === 0 ? (
            <Text style={{ color: theme.secondaryText, paddingHorizontal: 20 }}>
              {isPlaylist ? 'No songs yet. Use ⋮ on any song to add it here.' : 'No songs yet.'}
            </Text>
          ) : (
            songs.map((song, index) => (
              <TrackItem
                key={song.id}
                track={song}
                onPlay={() => playList(songs, index)}
                theme={theme}
                actionContext={type === 'playlist' ? { playlistId: id, onChanged: load } : undefined}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artContainer: {
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  artwork: {
    width: width * 0.65,
    height: width * 0.65,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistImage: {
    borderRadius: width * 0.325,
  },
  albumImage: {
    borderRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  stats: {
    fontSize: 14,
    marginTop: 10,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
    gap: 15,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 30,
    minWidth: 140,
  },
  outlineButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  songList: {
    marginTop: 40,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  }
});
