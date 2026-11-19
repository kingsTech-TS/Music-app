import { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MiniPlayer from '../../components/MiniPlayer';
import { usePlayerStore } from '../../store/usePlayerStore';

const ICONS = {
  index: 'home-outline',
  search: 'search-outline',
  library: 'heart-outline',
  playlists: 'musical-notes-outline',
  settings: 'person-outline',
};

// One tab: pops when it becomes active, squeezes on press, swaps to a filled icon.
function TabButton({ name, focused, onPress, theme }) {
  const active = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(active, { toValue: focused ? 1 : 0, useNativeDriver: false, speed: 14, bounciness: 12 }).start();
  }, [focused]);

  const pressTo = (v) => Animated.spring(press, { toValue: v, useNativeDriver: false, speed: 40, bounciness: 8 }).start();
  const icon = ICONS[name] || 'ellipse-outline';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => pressTo(0.86)}
      onPressOut={() => pressTo(1)}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={name === 'index' ? 'Home' : name}
    >
      <Animated.View
        style={[
          styles.tab,
          {
            backgroundColor: active.interpolate({
              inputRange: [0, 1],
              outputRange: [theme.surfaceLight || theme.primary, theme.accent],
            }),
            shadowColor: theme.accent,
            transform: [
              { scale: Animated.multiply(press, active.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })) },
            ],
          },
          focused && styles.tabActive,
        ]}
      >
        <Ionicons
          name={focused ? icon.replace('-outline', '') : icon}
          size={20}
          color={focused ? theme.onAccent || '#000' : theme.text}
        />
      </Animated.View>
    </Pressable>
  );
}

// expo-router 58 passes `emitter` + `navigateToTab(routeKey)` to custom tab bars (no `navigation` prop).
function PillTabBar({ state, emitter, navigateToTab }) {
  const { theme } = usePlayerStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.barWrap, { backgroundColor: theme.primary, paddingBottom: insets.bottom + 12 }]}>
      <MiniPlayer />
      <View style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.surfaceLight || theme.surface }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return <TabButton key={route.key} name={route.name} focused={focused} onPress={onPress} theme={theme} />;
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <PillTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="playlists" options={{ title: 'Playlists' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    paddingTop: 8,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    borderRadius: 40,
    borderWidth: 1,
    padding: 8,
  },
  tab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  tabActive: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
});
