import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Animated, Easing } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../store/usePlayerStore';
import { usePlaybackPosition } from '../hooks/usePlaybackPosition';
import { api } from '../lib/api';
import { Equalizer, FadeIn, PressableScale } from '../components/Motion';

// Show the next line a touch early so it lights up as the singer starts it.
const LEAD_S = 0.25;
// After the user scrolls by hand, stop auto-scrolling for this long.
const MANUAL_SCROLL_PAUSE_MS = 3500;

function LyricLine({ text, active, past, onPress, onLayout, theme }) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: active ? 1 : 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [active]);
  return (
    // onLayout on the outer element: its y is relative to the ScrollView content (used for auto-scroll).
    <PressableScale onPress={onPress} scaleTo={onPress ? 0.97 : 1} onLayout={onLayout}>
      <Animated.View
        style={{
          paddingVertical: 9,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [past ? 0.45 : 0.6, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
        }}
      >
        <Text style={[styles.line, { color: active ? theme.accent : theme.text }]}>{text || '♪'}</Text>
      </Animated.View>
    </PressableScale>
  );
}

export default function LyricsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { theme, currentTrack, seekTo, isPlaying } = usePlayerStore();

  // Opened for the playing song → follow it as songs change; opened from a song's menu → that song.
  const [follow] = useState(() => !params.id || params.id === currentTrack?.id);
  const song = follow && currentTrack
    ? currentTrack
    : { id: params.id, title: params.title, artist: params.artist, album: params.album || null, duration: Number(params.duration) || null };
  const isCurrent = !!currentTrack && song.id === currentTrack.id;
  const { position } = usePlaybackPosition(isCurrent, 200);

  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setLyrics(null);
    api
      .lyrics({ title: song.title, artist: song.artist, album: song.album, duration: song.duration })
      .then((l) => !cancelled && setLyrics(l))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [song.id, song.title]);

  const lines = lyrics?.synced || [];
  const synced = lines.length > 0;

  // Index of the line being sung now.
  const activeIndex = useMemo(() => {
    if (!synced || !isCurrent) return -1;
    let i = -1;
    for (let k = 0; k < lines.length; k++) {
      if (lines[k].time <= position + LEAD_S) i = k;
      else break;
    }
    return i;
  }, [position, synced, isCurrent, lines]);

  // Auto-scroll the active line to ~1/3 down the screen (unless the user is scrolling).
  const scrollRef = useRef(null);
  const lineY = useRef({});
  const viewportH = useRef(0);
  const manualUntil = useRef(0);
  useEffect(() => {
    if (activeIndex < 0 || Date.now() < manualUntil.current) return;
    const y = lineY.current[activeIndex];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - viewportH.current * 0.33), animated: true });
  }, [activeIndex]);

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      {!!song.artwork && <Image source={{ uri: song.artwork }} style={StyleSheet.absoluteFill} blurRadius={40} />}
      <LinearGradient
        colors={[theme.primary + 'cc', theme.primary + 'ee', theme.primary]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <PressableScale style={[styles.iconBtn, { backgroundColor: theme.surface }]} onPress={() => router.back()} scaleTo={0.85}>
          <Ionicons name="chevron-down" size={22} color={theme.text} />
        </PressableScale>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{song.title}</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 13 }} numberOfLines={1}>{song.artist}</Text>
        </View>
        {isCurrent && <Equalizer color={theme.accent} bars={4} height={18} playing={isPlaying} />}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} size="large" />
          <Text style={{ color: theme.secondaryText, marginTop: 12 }}>Finding lyrics…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.secondaryText} />
          <Text style={[styles.message, { color: theme.secondaryText }]}>{error}</Text>
        </View>
      ) : !lyrics?.found ? (
        <FadeIn style={styles.center}>
          <Ionicons name="document-text-outline" size={44} color={theme.secondaryText} />
          <Text style={[styles.message, { color: theme.text }]}>No lyrics found for this song</Text>
        </FadeIn>
      ) : lyrics.instrumental && !synced && !lyrics.plain ? (
        <FadeIn style={styles.center}>
          <Ionicons name="musical-notes" size={44} color={theme.accent} />
          <Text style={[styles.message, { color: theme.text }]}>Instrumental — enjoy the music</Text>
        </FadeIn>
      ) : (
        <ScrollView
          ref={scrollRef}
          onLayout={(e) => (viewportH.current = e.nativeEvent.layout.height)}
          onScrollBeginDrag={() => (manualUntil.current = Date.now() + MANUAL_SCROLL_PAUSE_MS)}
          onMomentumScrollEnd={() => (manualUntil.current = Date.now() + MANUAL_SCROLL_PAUSE_MS)}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {synced ? (
            lines.map((l, i) => (
              <LyricLine
                key={i}
                text={l.text}
                active={i === activeIndex}
                past={i < activeIndex}
                theme={theme}
                onLayout={(e) => (lineY.current[i] = e.nativeEvent.layout.y)}
                // Tap a line to jump there (only for the song that's playing).
                onPress={isCurrent ? () => seekTo(l.time) : undefined}
              />
            ))
          ) : (
            <Text style={[styles.plain, { color: theme.text }]}>{lyrics.plain}</Text>
          )}
          {!synced && isCurrent && (
            <Text style={[styles.note, { color: theme.secondaryText }]}>These lyrics aren't time-synced.</Text>
          )}
          <Text style={[styles.note, { color: theme.secondaryText }]}>Lyrics from {lyrics.source}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  message: {
    marginTop: 14,
    fontSize: 15,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  line: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  plain: {
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 30,
  },
  note: {
    fontSize: 12,
    marginTop: 24,
  },
});
