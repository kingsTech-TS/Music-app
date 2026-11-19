import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/usePlayerStore';

const VISIBLE_MS = 3200;

// Slides down from the top for a few seconds when the store calls showToast().
export default function Toast() {
  const toast = usePlayerStore((s) => s.toast);
  const theme = usePlayerStore((s) => s.theme);
  const insets = useSafeAreaInsets();
  const v = useRef(new Animated.Value(0)).current;
  const [text, setText] = useState('');

  const hide = () => Animated.timing(v, { toValue: 0, duration: 200, useNativeDriver: true }).start();

  useEffect(() => {
    if (!toast) return;
    setText(toast.text);
    Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
    const t = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [toast?.id]);

  return (
    <Animated.View
      pointerEvents={toast ? 'box-none' : 'none'}
      style={[
        styles.wrap,
        {
          top: insets.top + 8,
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
        },
      ]}
    >
      <Pressable
        onPress={hide}
        style={[styles.toast, { backgroundColor: theme.surface, borderColor: theme.accent + '55' }]}
      >
        <Ionicons name="information-circle" size={20} color={theme.accent} />
        <Text style={[styles.text, { color: theme.text }]}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  text: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '500',
  },
});
