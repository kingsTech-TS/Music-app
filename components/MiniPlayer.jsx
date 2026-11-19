import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/usePlayerStore';
import { Equalizer, PressableScale } from './Motion';
import { usePlaybackPosition } from '../hooks/usePlaybackPosition';

const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Compact player shown above the tab bar while a track is loaded. Slides up when a song starts.
export default function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlayback, theme, mode, syncSpotify, loaded, resumeAt } = usePlayerStore();
  const router = useRouter();
  const enter = useRef(new Animated.Value(0)).current;
  // Progress line (no extra Spotify polling — this component syncs every 5s below).
  const { position, duration } = usePlaybackPosition(false, 1000);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  // Spotify plays in the Spotify app: keep the mini player in step with track changes made there.
  useEffect(() => {
    if (mode !== 'spotify' || !loaded) return;
    const t = setInterval(syncSpotify, 5000);
    return () => clearInterval(t);
  }, [mode, loaded]);

  useEffect(() => {
    if (currentTrack) {
      enter.setValue(0);
      Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }).start();
    }
  }, [currentTrack?.id]);

  if (!currentTrack) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        },
      ]}
    >
      <PressableScale
        scaleTo={0.97}
        style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.surfaceLight || theme.surface }]}
        onPress={() => router.push('/now-playing')}
      >
        {currentTrack.artwork ? (
          <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.artFallback, { backgroundColor: theme.primary }]}>
            <Ionicons name="musical-note" size={20} color={theme.accent} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={[styles.artist, { color: !loaded && resumeAt > 0 ? theme.accent : theme.secondaryText }]} numberOfLines={1}>
            {/* Restored from last time: say where it will continue from. */}
            {!loaded && resumeAt > 0 ? `Resume from ${formatTime(resumeAt)}` : currentTrack.artist}
          </Text>
        </View>
        <Equalizer color={theme.accent} bars={3} height={14} playing={isPlaying} style={{ marginRight: 12 }} />
        <PressableScale onPress={togglePlayback} scaleTo={0.85} style={[styles.controlButton, { backgroundColor: theme.accent }]}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={theme.onAccent || '#000'} />
        </PressableScale>
        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceLight || theme.primary }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 3,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    fontSize: 12,
    marginTop: 2,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
});
