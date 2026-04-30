import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { usePlayerStore } from '../store/usePlayerStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlayback, theme } = usePlayerStore();
  const router = useRouter();


  if (!currentTrack) return null;

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.secondaryText + '33' }]} 
      activeOpacity={0.9} 
      onPress={() => router.push('/now-playing')}
    >
      <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{currentTrack.title}</Text>
        <Text style={[styles.artist, { color: theme.secondaryText }]} numberOfLines={1}>{currentTrack.artist}</Text>
      </View>
      <TouchableOpacity onPress={togglePlayback} style={styles.controlButton}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={28} color={theme.text} />
      </TouchableOpacity>
    </TouchableOpacity>

  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#1c1c1e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#333',
  },
  artwork: {
    width: 45,
    height: 45,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: '#b3b3b3',
    fontSize: 12,
  },
  controlButton: {
    padding: 8,
  },
});
