import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

/**
 * Small animation toolkit built on React Native's Animated API (native driver, no extra deps).
 */

// Springy "press in" feedback. Drop-in replacement for TouchableOpacity.
// `containerStyle` styles the outer touch area (e.g. flex: 1 inside a row); `style` styles the animated content.
export function PressableScale({ children, style, containerStyle, scaleTo = 0.94, onPress, onLongPress, disabled, hitSlop, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: to === 1 ? 10 : 0 }).start();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={containerStyle}
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1)}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>{children}</Animated.View>
    </Pressable>
  );
}

// Fade + slide up on mount. `delay` lets sections cascade in.
export function FadeIn({ children, delay = 0, distance = 16, duration = 450, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Animated equalizer bars. `playing=false` settles them to a resting height.
export function Equalizer({ color, bars = 4, height = 16, barWidth = 3, gap = 2, playing = true, style }) {
  const values = useRef(Array.from({ length: bars }, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (!playing) {
      values.forEach((v) => Animated.timing(v, { toValue: 0.3, duration: 200, useNativeDriver: true }).start());
      return;
    }
    const loops = values.map((v, i) => {
      const up = 380 + ((i * 137) % 260); // de-sync the bars
      return Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: up, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.25, duration: up * 0.9, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
    });
    loops.forEach((l, i) => setTimeout(() => l.start(), i * 90));
    return () => loops.forEach((l) => l.stop());
  }, [playing]);

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', height }, style]}>
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: barWidth,
            height,
            marginLeft: i ? gap : 0,
            borderRadius: barWidth / 2,
            backgroundColor: color,
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [height / 2, 0] }) }, { scaleY: v }],
          }}
        />
      ))}
    </View>
  );
}

// Gentle infinite float (used on hero icons).
export function useFloat(amplitude = 8, duration = 2200) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return v.interpolate({ inputRange: [0, 1], outputRange: [0, -amplitude] });
}

// Infinite soft pulse 0→1→0 (glows, rings).
export function usePulse(duration = 1600) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return v;
}

// Quick "pop" for toggles like the heart button. Returns [animatedScale, trigger].
export function usePop() {
  const scale = useRef(new Animated.Value(1)).current;
  const pop = () => {
    scale.setValue(0.7);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 18 }).start();
  };
  return [scale, pop];
}
