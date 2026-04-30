import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { usePlayerStore } from "../../store/usePlayerStore";

export default function PlaylistsScreen() {
  const { theme } = usePlayerStore();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary }]}>
      <Text style={[styles.text, { color: theme.text }]}>My Playlists</Text>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 20,
  },
});
