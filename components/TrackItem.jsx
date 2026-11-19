import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/usePlayerStore';
import { isRemoteTrack } from '../lib/api';
import { Equalizer, PressableScale } from './Motion';

// `actionContext` is passed to the actions sheet, e.g. { playlistId, onChanged } to allow "Remove from playlist".
export default function TrackItem({ track, onDrag, isActive, onPlay, theme, actionContext }) {
  const currentTheme = theme || usePlayerStore.getState().theme;
  const liked = usePlayerStore((s) => !!s.likedIds[track.id]);
  const isCurrent = usePlayerStore((s) => s.currentTrack?.id === track.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const openTrackActions = usePlayerStore((s) => s.openTrackActions);
  const remote = isRemoteTrack(track);

  return (
    <PressableScale
      scaleTo={0.97}
      style={[
        styles.container,
        { backgroundColor: currentTheme.primary, borderBottomColor: currentTheme.surface },
        (isActive || isCurrent) && { backgroundColor: currentTheme.surface },
      ]}
      onLongPress={remote ? () => openTrackActions(track, actionContext) : onDrag}
      onPress={() => onPlay(track)}
      disabled={isActive}
    >
      <View>
        {track.artwork ? (
          <Image source={{ uri: track.artwork }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.artFallback, { backgroundColor: currentTheme.surface }]}>
            <Ionicons name="musical-note" size={22} color={currentTheme.accent} />
          </View>
        )}
        {isCurrent && (
          <View style={styles.nowPlaying}>
            <Equalizer color="#fff" bars={3} height={14} playing={isPlaying} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: isCurrent ? currentTheme.accent : currentTheme.text }]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text style={[styles.artist, { color: currentTheme.secondaryText }]} numberOfLines={1}>{track.artist}</Text>
      </View>
      {liked && <Ionicons name="heart" size={16} color={currentTheme.accent} style={{ marginRight: 6 }} />}
      {remote && (
        <TouchableOpacity style={styles.moreButton} hitSlop={8} onPress={() => openTrackActions(track, actionContext)}>
          <Ionicons name="ellipsis-vertical" size={20} color={currentTheme.secondaryText} />
        </TouchableOpacity>
      )}
    </PressableScale>
  );
}


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlaying: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
  moreButton: {
    padding: 5,
  }
});
