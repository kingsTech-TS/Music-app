import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../store/usePlayerStore';
import { Equalizer, FadeIn, PressableScale } from '../components/Motion';

const REPEAT_ICON = { off: 'repeat', queue: 'repeat', track: 'repeat-outline' };

function Artwork({ uri, theme, size = 48 }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 10 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="musical-note" size={20} color={theme.accent} />
    </View>
  );
}

/**
 * The play queue.
 * - Your own songs: the app's queue — tap to jump, ✕ to remove.
 * - Spotify: Spotify's own "Next up" (read from Spotify; tap a song to play from there).
 */
export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    theme, mode, loaded, currentTrack, isPlaying, queue, queueIndex,
    shuffle, toggleShuffle, repeatMode, cycleRepeat,
    playQueueIndex, removeFromQueue, fetchSpotifyQueue, playSpotify,
  } = usePlayerStore();

  const isSpotify = mode === 'spotify' && loaded;
  const [spotifyQueue, setSpotifyQueue] = useState(null);
  const [loading, setLoading] = useState(isSpotify);
  const [error, setError] = useState('');

  const loadSpotify = useCallback(async () => {
    try {
      setError('');
      const q = await fetchSpotifyQueue();
      setSpotifyQueue(q);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Spotify's queue changes as songs play; refresh when the current song changes.
  useEffect(() => {
    if (isSpotify) loadSpotify();
  }, [isSpotify, currentTrack?.id, shuffle]);

  const upNext = isSpotify ? spotifyQueue?.queue || [] : queue.slice(queueIndex + 1);
  const startIndex = isSpotify ? 0 : queueIndex + 1;

  const onPlay = (i) => {
    if (isSpotify) return playSpotify(upNext, i);
    return playQueueIndex(startIndex + i);
  };

  const ControlPill = ({ icon, active, onPress, badge }) => (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      style={[styles.pill, { backgroundColor: active ? theme.accent : theme.surface }]}
    >
      <Ionicons name={icon} size={18} color={active ? theme.onAccent || '#000' : theme.text} />
      {!!badge && <Text style={[styles.pillText, { color: active ? theme.onAccent || '#000' : theme.text }]}>{badge}</Text>}
    </PressableScale>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.primary, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <PressableScale style={[styles.iconBtn, { backgroundColor: theme.surface }]} onPress={() => router.back()} scaleTo={0.85}>
          <Ionicons name="chevron-down" size={22} color={theme.text} />
        </PressableScale>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Queue</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Now playing */}
      {currentTrack && (
        <FadeIn>
          <Text style={[styles.section, { color: theme.secondaryText }]}>NOW PLAYING</Text>
          <View style={[styles.nowCard, { backgroundColor: theme.surface }]}>
            <Artwork uri={currentTrack.artwork} theme={theme} size={56} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.title, { color: theme.accent }]} numberOfLines={1}>{currentTrack.title}</Text>
              <View style={styles.row}>
                {isSpotify && <FontAwesome name="spotify" size={13} color="#1DB954" style={{ marginRight: 5 }} />}
                <Text style={{ color: theme.secondaryText }} numberOfLines={1}>{currentTrack.artist}</Text>
              </View>
            </View>
            <Equalizer color={theme.accent} bars={4} height={18} playing={isPlaying} />
          </View>
        </FadeIn>
      )}

      {/* Shuffle / repeat */}
      <FadeIn delay={80} style={styles.controls}>
        <ControlPill icon="shuffle" active={shuffle} onPress={toggleShuffle} badge={shuffle ? 'Shuffle on' : 'Shuffle'} />
        <ControlPill
          icon={REPEAT_ICON[repeatMode]}
          active={repeatMode !== 'off'}
          onPress={cycleRepeat}
          badge={repeatMode === 'track' ? 'Repeat song' : repeatMode === 'queue' ? 'Repeat queue' : 'Repeat'}
        />
      </FadeIn>

      <Text style={[styles.section, { color: theme.secondaryText }]}>
        {isSpotify ? 'NEXT UP ON SPOTIFY' : 'NEXT UP'}
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />
      ) : error ? (
        <PressableScale onPress={loadSpotify} style={styles.empty}>
          <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>{error}</Text>
          <Text style={{ color: theme.accent, fontWeight: '700', marginTop: 8 }}>Tap to retry</Text>
        </PressableScale>
      ) : (
        <FlatList
          data={upNext}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          onRefresh={isSpotify ? loadSpotify : undefined}
          refreshing={false}
          renderItem={({ item, index }) => (
            <FadeIn delay={Math.min(index, 10) * 30} distance={10}>
              <PressableScale style={styles.item} onPress={() => onPlay(index)} scaleTo={0.97}>
                <Text style={[styles.index, { color: theme.secondaryText }]}>{index + 1}</Text>
                <Artwork uri={item.artwork} theme={theme} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={{ color: theme.secondaryText, fontSize: 13 }} numberOfLines={1}>{item.artist}</Text>
                </View>
                {!isSpotify && (
                  <PressableScale onPress={() => removeFromQueue(startIndex + index)} hitSlop={10} scaleTo={0.8} style={styles.remove}>
                    <Ionicons name="close" size={20} color={theme.secondaryText} />
                  </PressableScale>
                )}
              </PressableScale>
            </FadeIn>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={40} color={theme.secondaryText} />
              <Text style={{ color: theme.secondaryText, marginTop: 10, textAlign: 'center' }}>
                Nothing up next. Use “Play next” or “Add to queue” from a song's ⋮ menu.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
  },
  nowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
  },
  pillText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 13,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  index: {
    width: 24,
    fontSize: 13,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  remove: {
    padding: 6,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 30,
  },
});
