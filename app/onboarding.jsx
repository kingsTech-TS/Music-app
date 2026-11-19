import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar, Animated, Easing, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { Equalizer, FadeIn, PressableScale, useFloat, usePulse } from '../components/Motion';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const APP_NAME = Constants.expoConfig?.name ?? '';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = usePlayerStore();
  const accent = theme.accent;
  const { onboarded, completeOnboarding } = useAuthStore();
  const requestLocalMusic = usePlayerStore((s) => s.requestLocalMusic);
  const [starting, setStarting] = useState(false);

  const float = useFloat(10, 2400);
  const pulse = usePulse(1800);
  const nudge = useRef(new Animated.Value(0)).current; // play icon nudges right to invite a tap

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(nudge, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(nudge, { toValue: 0, useNativeDriver: true, bounciness: 14 }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Onboarding is first-launch only.
  if (onboarded && !starting) return <Redirect href="/(tabs)" />;

  // No account needed. Ask for access to the device's music (so local songs show up), then go in.
  const start = async () => {
    if (starting) return;
    setStarting(true);
    await requestLocalMusic().catch(() => {});
    await completeOnboarding();
    // Offer sign up / log in / Spotify next — skippable with "Not now".
    router.replace({ pathname: '/auth', params: { from: 'onboarding', mode: 'register' } });
  };

  return (
    <LinearGradient
      colors={[theme.surfaceLight || theme.surface, theme.primary, theme.primary]}
      locations={[0, 0.55, 1]}
      style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}
    >
      <StatusBar barStyle="light-content" />
      <FadeIn>
        <Text style={[styles.brand, { color: theme.text }]}>{APP_NAME}</Text>
      </FadeIn>

      <View style={styles.hero}>
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: accent,
              shadowColor: accent,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.28] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) }],
            },
          ]}
        />
        <Equalizer color={theme.secondaryText} bars={6} height={22} barWidth={2} gap={3} style={styles.wave} />
        <Animated.View style={{ transform: [{ translateY: float }] }}>
          <Ionicons name="headset" size={width * 0.62} color={accent} style={[styles.headphones, { textShadowColor: accent + '73' }]} />
        </Animated.View>
        <Equalizer color={theme.secondaryText} bars={6} height={22} barWidth={2} gap={3} style={styles.wave} />
      </View>

      <FadeIn delay={250} style={styles.textBlock}>
        <Text style={[styles.title, { color: theme.text }]}>Start Your{'\n'}Sonic Journey</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Play the music on your phone, build your own playlists, and connect Spotify whenever you want.
        </Text>
      </FadeIn>

      <FadeIn delay={500}>
        <PressableScale
          onPress={start}
          scaleTo={0.96}
          style={[styles.cta, { backgroundColor: theme.surface, borderColor: theme.surfaceLight || theme.surface }]}
        >
          <Animated.View
            style={[
              styles.ctaIcon,
              {
                backgroundColor: accent,
                transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }],
              },
            ]}
          >
            {starting ? (
              <ActivityIndicator color={theme.onAccent || '#000'} />
            ) : (
              <Ionicons name="play-forward" size={22} color={theme.onAccent || '#000'} />
            )}
          </Animated.View>
          <Text style={[styles.ctaText, { color: theme.text }]}>Turn on your music</Text>
          <View style={[styles.ctaIcon, { backgroundColor: theme.surfaceLight || theme.primary }]}>
            <Ionicons name="headset-outline" size={20} color={theme.text} />
          </View>
        </PressableScale>
      </FadeIn>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  brand: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  hero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    opacity: 0.18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 30,
  },
  headphones: {
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 30,
  },
  wave: {
    marginTop: width * 0.25,
    marginHorizontal: 6,
    opacity: 0.7,
  },
  textBlock: {
    marginBottom: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 300,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 40,
    borderWidth: 1,
    padding: 8,
  },
  ctaIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
