import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { theme, setTheme } = usePlayerStore();

  const ThemeOption = ({ name, label, color }) => (
    <TouchableOpacity 
      style={[styles.themeOption, { backgroundColor: theme.surface }]} 
      onPress={() => setTheme(name)}
    >
      <View style={[styles.colorIndicator, { backgroundColor: color }]} />
      <Text style={[styles.themeLabel, { color: theme.text }]}>{label}</Text>
      {Object.keys(theme).find(key => theme[key] === color) && (
        <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        
        <View style={styles.section}>
          <ThemeOption name="mume" label="Mume Orange" color="#ff8c00" />
          <ThemeOption name="dark" label="Spotify Dark" color="#1DB954" />
          <ThemeOption name="sunset" label="Sunset Glow" color="#FF4500" />
        </View>


        <Text style={[styles.sectionTitle, { color: theme.text }]}>Player Configuration</Text>
        <View style={styles.section}>
          <TouchableOpacity style={[styles.option, { backgroundColor: theme.surface }]}>
            <Text style={[styles.optionText, { color: theme.text }]}>Audio Quality</Text>
            <Text style={[styles.optionValue, { color: theme.secondaryText }]}>Very High</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.option, { backgroundColor: theme.surface }]}>
            <Text style={[styles.optionText, { color: theme.text }]}>Gapless Playback</Text>
            <Ionicons name="toggle" size={32} color={theme.accent} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        <View style={styles.section}>
          <View style={[styles.option, { backgroundColor: theme.surface }]}>
            <Text style={[styles.optionText, { color: theme.text }]}>Version</Text>
            <Text style={[styles.optionValue, { color: theme.secondaryText }]}>1.0.0 (Pro)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 30,
    borderRadius: 12,
    overflow: 'hidden',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 1,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 15,
  },
  themeLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionValue: {
    fontSize: 14,
  },
});
