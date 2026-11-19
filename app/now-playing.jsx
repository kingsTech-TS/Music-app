import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar, Animated } from 'react-native';
import { PressableScale, usePop } from '../components/Motion';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../store/usePlayerStore';
import { isRemoteTrack } from '../lib/api';
import { usePlaybackPosition } from '../hooks/usePlaybackPosition';

const { width: W, height: H } = Dimensions.get('window');

// ---- Geometry for the curved control panel ----
const PANEL_H = Math.min(400, H * 0.48); // height of the dome-shaped panel
const DOME_D = W * 1.8; // dome is a huge circle so only a gentle curve shows
const ARC_R = W * 0.44; // radius of the progress arc
const ARC_TOP = 34; // distance from panel top to the top of the arc
const ARC_CX = W / 2;
const ARC_CY = ARC_TOP + ARC_R; // arc centre (in panel coordinates)
const ARC_START = 165; // degrees, left end
const ARC_END = 15; // degrees, right end
const SEGMENTS = 72;

const toRad = (d) => (d * Math.PI) / 180;
const arcPoint = (deg) => ({
  x: ARC_CX + ARC_R * Math.cos(toRad(deg)),
  y: ARC_CY - ARC_R * Math.sin(toRad(deg)),
});

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

function ProgressArc({ progress, onSeek, accent, track }) {
  const [dragging, setDragging] = useState(null);
  const p = dragging ?? progress;
  const thumbDeg = ARC_START - (ARC_START - ARC_END) * p;
  const thumb = arcPoint(thumbDeg);

  // Convert a touch inside the panel into a 0..1 progress value along the arc
  const fromTouch = (e) => {
    const { locationX, locationY } = e.nativeEvent;
    let deg = (Math.atan2(ARC_CY - locationY, locationX - ARC_CX) * 180) / Math.PI;
    if (deg < -90) deg += 360; // touches below-left of centre map to the left end
    const clamped = Math.max(ARC_END, Math.min(ARC_START, deg));
    return (ARC_START - clamped) / (ARC_START - ARC_END);
  };

  const segLen = ((ARC_START - ARC_END) / SEGMENTS) * (Math.PI / 180) * ARC_R + 1.5;

  return (
    <>
      {Array.from({ length: SEGMENTS }).map((_, i) => {
        const deg = ARC_START - ((ARC_START - ARC_END) * (i + 0.5)) / SEGMENTS;
        const pt = arcPoint(deg);
        const filled = i / SEGMENTS < p;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: pt.x - segLen / 2,
              top: pt.y - (filled ? 1.5 : 1),
              width: segLen,
              height: filled ? 3 : 2,
              backgroundColor: filled ? '#ffffff' : track,
              transform: [{ rotate: `${90 - deg}deg` }],
            }}
          />
        );
      })}
      <View style={[styles.thumb, { left: thumb.x - 8, top: thumb.y - 8, shadowColor: accent }]} />
      {/* Transparent touch layer over the arc band for scrubbing */}
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ARC_TOP + ARC_R * 0.55 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => setDragging(fromTouch(e))}
        onResponderMove={(e) => setDragging(fromTouch(e))}
        onResponderRelease={(e) => {
          onSeek(fromTouch(e));
          setDragging(null);
        }}
        onResponderTerminate={() => setDragging(null)}
      />
    </>
  );
}

export default function NowPlayingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentTrack, isPlaying, togglePlayback, skipToNext, skipToPrevious,
    shuffle, toggleShuffle, repeatMode, cycleRepeat, theme, likedIds, toggleLike, openTrackActions,
    seekTo,
  } = usePlayerStore();
  // Native player, Spotify (polled) or the saved resume point — whichever applies.
  const { position, duration } = usePlaybackPosition(true);
  const [heartScale, popHeart] = usePop();

  if (!currentTrack) return null;

  const liked = !!likedIds[currentTrack.id];
  const canLike = isRemoteTrack(currentTrack); // device files aren't stored on the server

  const accent = theme.accent;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  const handleSeek = async (p) => {
    if (duration > 0) await seekTo(p * duration);
  };

  const artHeight = H - PANEL_H - insets.bottom + 90; // artwork tucks behind the curved panel

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <StatusBar barStyle="light-content" />

      {/* Full-bleed artwork */}
      {currentTrack.artwork ? (
        <Image source={{ uri: currentTrack.artwork }} style={[styles.art, { height: artHeight }]} />
      ) : (
        // Device files have no artwork: show a themed placeholder instead of an empty image.
        <View style={[styles.art, styles.artFallback, { height: artHeight, backgroundColor: theme.surface }]}>
          <Ionicons name="musical-notes" size={W * 0.35} color={accent} style={{ opacity: 0.5 }} />
        </View>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.4)']}
        locations={[0, 0.3, 1]}
        style={[styles.art, { height: artHeight }]}
      />

      {/* Top buttons */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity style={styles.glassBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topRight}>
          <PressableScale
            style={styles.glassBtn}
            scaleTo={0.85}
            onPress={() =>
              router.push({
                pathname: '/lyrics',
                params: {
                  title: currentTrack.title,
                  artist: currentTrack.artist,
                  album: currentTrack.album || '',
                  duration: currentTrack.duration || '',
                  id: currentTrack.id,
                },
              })
            }
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
          </PressableScale>
          <PressableScale style={styles.glassBtn} scaleTo={0.85} onPress={() => router.push('/queue')}>
            <Ionicons name="list" size={19} color="#fff" />
          </PressableScale>
          {canLike && (
            <PressableScale style={styles.glassBtn} scaleTo={0.85} onPress={() => openTrackActions(currentTrack)}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
            </PressableScale>
          )}
        </View>
      </View>

      {/* Track title over the artwork */}
      <View style={[styles.trackInfo, { bottom: PANEL_H + insets.bottom + 12 }]}>
        <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{currentTrack.artist}</Text>
      </View>

      {/* Curved control panel */}
      <View style={[styles.panel, { height: PANEL_H + insets.bottom }]}>
        <View style={styles.dome}>
          <LinearGradient
            colors={[theme.surfaceLight || theme.surface, theme.primary, theme.primary]}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
        {/* soft lime glow behind the play button */}
        <View style={[styles.glow, { backgroundColor: accent, shadowColor: accent }]} />

        <ProgressArc progress={progress} onSeek={handleSeek} accent={accent} track="rgba(255,255,255,0.25)" />

        {/* Like + time */}
        <View style={styles.center}>
          <TouchableOpacity
            onPress={() => {
              popHeart();
              toggleLike(currentTrack).catch(() => {});
            }}
            hitSlop={10}
            disabled={!canLike}
            style={!canLike && { opacity: 0.3 }}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={accent} />
            </Animated.View>
          </TouchableOpacity>
          <Text style={[styles.time, { color: theme.text }]}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
          <View style={[styles.timeBar, { backgroundColor: accent }]} />
        </View>

        {/* Shuffle / repeat */}
        <TouchableOpacity style={[styles.smallBtn, { left: W * 0.2 }]} onPress={toggleShuffle}>
          <Ionicons name="shuffle" size={18} color={shuffle ? accent : theme.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallBtn, { right: W * 0.2 }]} onPress={cycleRepeat}>
          <Ionicons name={repeatMode === 'track' ? 'repeat-outline' : 'repeat'} size={18} color={repeatMode !== 'off' ? accent : theme.text} />
          {repeatMode === 'track' && <Text style={[styles.repeatOne, { color: accent }]}>1</Text>}
        </TouchableOpacity>

        {/* Prev / play / next */}
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.skipBtn, { backgroundColor: theme.surface }]} onPress={skipToPrevious}>
            <Ionicons name="play-skip-back" size={18} color={theme.text} />
          </TouchableOpacity>

          <View style={[styles.ringOuter, { borderColor: accent + '55', backgroundColor: theme.accentDark || accent + '44' }]}>
            <View style={[styles.ringMid, { backgroundColor: theme.primary, borderColor: accent + '88' }]}>
              <PressableScale style={styles.playBtn} onPress={togglePlayback} scaleTo={0.85}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#111" style={!isPlaying && { marginLeft: 4 }} />
              </PressableScale>
            </View>
          </View>

          <TouchableOpacity style={[styles.skipBtn, { backgroundColor: theme.surface }]} onPress={skipToNext}>
            <Ionicons name="play-skip-forward" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const PLAY_Y = ARC_CY + 10; // vertical centre of the play button (panel coords)

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  art: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topRight: {
    flexDirection: 'row',
    gap: 10,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  trackTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dome: {
    position: 'absolute',
    top: 0,
    left: (W - DOME_D) / 2,
    width: DOME_D,
    height: DOME_D,
    borderRadius: DOME_D / 2,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    left: W / 2 - 90,
    top: PLAY_Y - 90,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  center: {
    position: 'absolute',
    top: ARC_TOP + 34,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    marginTop: 8,
  },
  timeBar: {
    width: 56,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
  },
  smallBtn: {
    position: 'absolute',
    top: ARC_TOP + 92,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOne: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '800',
  },
  controls: {
    position: 'absolute',
    top: PLAY_Y - 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  skipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringMid: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
