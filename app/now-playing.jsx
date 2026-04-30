import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { usePlayerStore } from '../store/usePlayerStore';

const { width } = Dimensions.get('window');

// Safe lazy load for TrackPlayer hooks
const getTrackPlayerStuff = () => {
  try {
    const TP = require('react-native-track-player');
    return {
      TrackPlayer: TP.default,
      useProgress: TP.useProgress,
      isNative: !!TP.default.setupPlayer
    };
  } catch (e) {
    return {
      TrackPlayer: null,
      useProgress: () => ({ position: 0, duration: 0 }),
      isNative: false
    };
  }
};

const { TrackPlayer, useProgress, isNative } = getTrackPlayerStuff();

export default function NowPlayingScreen() {
  const router = useRouter();
  const { currentTrack, isPlaying, togglePlayback, skipToNext, skipToPrevious, theme } = usePlayerStore();
  const { position, duration } = useProgress();

  if (!currentTrack) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = async (value) => {
    if (isNative && TrackPlayer) {
      await TrackPlayer.seekTo(value[0]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{currentTrack.artist}</Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.artworkContainer}>
          <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
        </View>

        <View style={styles.titleContainer}>
          <Text style={[styles.mainTitle, { color: theme.text }]} numberOfLines={1}>
            {currentTrack.title.toUpperCase()}
          </Text>
          <Text style={[styles.subArtist, { color: theme.secondaryText }]}>
            {currentTrack.artist}
          </Text>
        </View>

        <View style={styles.progressSection}>
          <Slider
            value={position}
            minimumValue={0}
            maximumValue={duration}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor={theme.accent}
            maximumTrackTintColor={theme.secondaryText + '33'}
            thumbTintColor={theme.accent}
            containerStyle={styles.slider}
            thumbStyle={styles.thumb}
          />
          <View style={styles.timeLabels}>
            <Text style={[styles.timeText, { color: theme.secondaryText }]}>{formatTime(position)}</Text>
            <Text style={[styles.timeText, { color: theme.secondaryText }]}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity>
            <Ionicons name="shuffle" size={24} color={theme.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={skipToPrevious}>
            <Ionicons name="play-skip-back-sharp" size={32} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={togglePlayback} 
            style={[styles.mainPlayButton, { backgroundColor: theme.accent }]}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={skipToNext}>
            <Ionicons name="play-skip-forward-sharp" size={32} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="repeat" size={24} color={theme.secondaryText} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.lyricsToggle}>
          <Ionicons name="chevron-up" size={20} color={theme.secondaryText} />
          <Text style={[styles.lyricsLabel, { color: theme.secondaryText }]}>Lyrics</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  artworkContainer: {
    width: width - 40,
    height: width - 40,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subArtist: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 5,
  },
  progressSection: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  slider: {
    height: 40,
  },
  thumb: {
    width: 12,
    height: 12,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -10,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 10,
  },
  mainPlayButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  lyricsToggle: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  lyricsLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
