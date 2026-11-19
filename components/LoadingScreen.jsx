import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, StatusBar } from 'react-native';
import Constants from 'expo-constants';
import { usePlayerStore } from '../store/usePlayerStore';
import { Equalizer } from './Motion';

const APP_NAME = Constants.expoConfig?.name ?? '';
const RINGS = 3;
const RING_DURATION = 2400;

// Expanding "sound wave" ring that fades as it grows.
function Ring({ delay, color }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: RING_DURATION, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, []);
  return (
    <Animated.View
      style={[
        styles.ring,
        {
          borderColor: color,
          opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.6, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }],
        },
      ]}
    />
  );
}

// App name revealed letter by letter.
function AnimatedTitle({ text, color }) {
  const letters = text.split('');
  const values = useRef(letters.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      70,
      values.map((v) => Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 12 }))
    ).start();
  }, []);
  return (
    <View style={{ flexDirection: 'row' }}>
      {letters.map((ch, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.title,
            {
              color,
              opacity: values[i],
              transform: [{ translateY: values[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
            },
          ]}
        >
          {ch}
        </Animated.Text>
      ))}
    </View>
  );
}

export default function LoadingScreen() {
  const theme = usePlayerStore((s) => s.theme);
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.center}>
        {Array.from({ length: RINGS }).map((_, i) => (
          <Ring key={i} delay={(i * RING_DURATION) / RINGS} color={theme.accent} />
        ))}
        <Animated.View
          style={[
            styles.disc,
            {
              backgroundColor: theme.surface,
              borderColor: theme.accent + '55',
              shadowColor: theme.accent,
              opacity: appear,
              transform: [{ scale: appear }],
            },
          ]}
        >
          <Equalizer color={theme.accent} bars={5} height={44} barWidth={6} gap={5} />
        </Animated.View>
      </View>
      <View style={styles.footer}>
        <AnimatedTitle text={APP_NAME} color={theme.text} />
      </View>
    </View>
  );
}

const DISC = 120;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    width: DISC,
    height: DISC,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    borderWidth: 2,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 90,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
