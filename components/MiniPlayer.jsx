import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/usePlayerStore';
import { Equalizer, PressableScale } from './Motion';

// Compact player shown above the tab bar while a track is loaded. Slides up when a song starts.
export default function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlayback, theme } = usePlayerStore();
  const router = useRouter();
  const enter = useRef(new Animated.Value(0)).current;

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
          <Text style={[styles.artist, { color: theme.secondaryText }]} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        <Equalizer color={theme.accent} bars={3} height={14} playing={isPlaying} style={{ marginRight: 12 }} />
        <PressableScale onPress={togglePlayback} scaleTo={0.85} style={[styles.controlButton, { backgroundColor: theme.accent }]}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={theme.onAccent || '#000'} />
        </PressableScale>
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
