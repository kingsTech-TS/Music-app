import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import MiniPlayer from "../../components/MiniPlayer";
import { usePlayerStore } from "../../store/usePlayerStore";




export default function TabLayout() {
  const { theme } = usePlayerStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <Tabs screenOptions={{ 
        headerShown: false, 
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.secondaryText,
        tabBarStyle: { 
          backgroundColor: theme.primary, 
          borderTopWidth: 0.5, 
          borderTopColor: '#333',
          height: Platform.OS === 'android' ? 70 : 65,
          paddingBottom: Platform.OS === 'android' ? 12 : 10,
          paddingTop: 10,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        }
      }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-sharp" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarIcon: ({ color, size }) => <Ionicons name="library-sharp" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color, size }) => <Ionicons name="search-sharp" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: "Playlists",
            tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes-sharp" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-sharp" size={size} color={color} />,
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

