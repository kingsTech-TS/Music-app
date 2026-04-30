import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TrackItem({ track, onDrag, isActive, onPlay, theme }) {
  const currentTheme = theme || { text: '#fff', secondaryText: '#b3b3b3', primary: '#121212', surface: '#282828' };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor: currentTheme.primary, borderBottomColor: currentTheme.surface },
        isActive && { backgroundColor: currentTheme.surface }
      ]}
      onLongPress={onDrag}
      onPress={() => onPlay(track)}
      disabled={isActive}
    >
      <Image source={{ uri: track.artwork }} style={styles.artwork} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: currentTheme.text }]} numberOfLines={1}>{track.title}</Text>
        <Text style={[styles.artist, { color: currentTheme.secondaryText }]} numberOfLines={1}>{track.artist}</Text>
      </View>
      <TouchableOpacity style={styles.moreButton}>
        <Ionicons name="ellipsis-vertical" size={20} color={currentTheme.secondaryText} />
      </TouchableOpacity>
    </TouchableOpacity>

  );
}


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#121212',
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  activeContainer: {
    backgroundColor: '#282828',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackArtist: {
    fontSize: 14,
    marginTop: 2,
  },
  moreButton: {
    padding: 5,
  }
});

