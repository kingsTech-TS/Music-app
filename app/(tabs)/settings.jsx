import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Image, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../../components/Motion';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { usePlayerStore, themes } from '../../store/usePlayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSpotifyLogin } from '../../hooks/useSpotifyLogin';
import { Ionicons } from '@expo/vector-icons';

const QUALITIES = ['low', 'normal', 'high', 'very_high'];
const QUALITY_LABEL = { low: 'Low', normal: 'Normal', high: 'High', very_high: 'Very High' };

export default function SettingsScreen() {
  const {
    theme, themeName, setTheme,
    localTracks, localPermission, localScanning, requestLocalMusic, scanLocalMusic,
  } = usePlayerStore();
  const router = useRouter();
  const { user, updatePreferences, disconnectSpotify, logout, sessionError } = useAuthStore();
  const spotify = useSpotifyLogin();
  const prefs = user?.preferences || { audio_quality: 'very_high', gapless_playback: true };
  const connected = !!user?.spotify?.connected;

  const save = (changes) =>
    updatePreferences(changes).catch((e) => Alert.alert('Could not save setting', e.message));

  const chooseTheme = (name) => {
    setTheme(name);
    save({ theme: name });
  };

  const cycleQuality = () => {
    const next = QUALITIES[(QUALITIES.indexOf(prefs.audio_quality) + 1) % QUALITIES.length];
    save({ audio_quality: next });
  };

  const confirmDisconnect = () =>
    Alert.alert('Disconnect Spotify', 'Your likes and playlists stay on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => disconnectSpotify().catch((e) => Alert.alert('Could not disconnect', e.message)),
      },
    ]);

  const confirmLogout = () =>
    Alert.alert('Log out', 'You can log back in any time. Songs on this device stay available.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => logout().catch((e) => Alert.alert('Could not log out', e.message)),
      },
    ]);

  const onDeviceMusic = () => {
    if (localPermission === 'granted') return scanLocalMusic();
    if (localPermission === 'denied') return Linking.openSettings();
    return requestLocalMusic();
  };

  const deviceMusicLabel =
    localPermission === 'unavailable'
      ? 'Not available'
      : localPermission === 'granted'
        ? localScanning
          ? 'Scanning…'
          : `${localTracks.length} songs · Rescan`
        : localPermission === 'denied'
          ? 'Open settings'
          : 'Allow access';

  const ThemeOption = ({ name, label, color }) => (
    <PressableScale
      style={[styles.themeOption, { backgroundColor: theme.surface }]}
      onPress={() => chooseTheme(name)}
    >
      <View style={[styles.colorIndicator, { backgroundColor: color }]} />
      <Text style={[styles.themeLabel, { color: theme.text }]}>{label}</Text>
      {themeName === name && (
        <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
      )}
    </PressableScale>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.primary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
        <View style={styles.section}>
          {user?.has_password ? (
            <>
              <View style={[styles.option, { backgroundColor: theme.surface }]}>
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.accent }]}>
                  <Text style={{ color: theme.onAccent || '#000', fontWeight: '800' }}>
                    {(user.name || user.email || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.optionText, { color: theme.text }]}>{user.name}</Text>
                  <Text style={[styles.optionValue, { color: theme.secondaryText, marginTop: 2 }]}>{user.email}</Text>
                </View>
              </View>
              <PressableScale style={[styles.option, { backgroundColor: theme.surface }]} onPress={confirmLogout}>
                <Text style={[styles.optionText, { color: '#ff6b6b' }]}>Log out</Text>
                <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
              </PressableScale>
            </>
          ) : (
            <PressableScale
              style={[styles.option, { backgroundColor: theme.surface }]}
              onPress={() => router.push({ pathname: '/auth', params: { mode: 'register' } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, { color: theme.text }]}>Sign up or log in</Text>
                <Text style={[styles.optionValue, { color: theme.secondaryText, marginTop: 2 }]}>
                  Keep your likes and playlists on every device
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
            </PressableScale>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Spotify</Text>
        <View style={styles.section}>
          {connected ? (
            <>
              <View style={[styles.option, { backgroundColor: theme.surface }]}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primary }]}>
                    <Ionicons name="person" size={18} color={theme.accent} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.optionText, { color: theme.text }]}>{user.spotify.display_name || user.name}</Text>
                  <Text style={[styles.optionValue, { color: theme.secondaryText, marginTop: 2 }]}>
                    Connected{user.spotify.product ? ` · ${user.spotify.product}` : ''}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
              </View>
              <PressableScale
                style={[styles.option, { backgroundColor: theme.surface }]}
                onPress={spotify.connect}
                disabled={spotify.connecting}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionText, { color: theme.text }]}>Reconnect</Text>
                  <Text style={[styles.optionValue, { color: theme.secondaryText, marginTop: 2 }]}>
                    Refresh Spotify permissions
                  </Text>
                </View>
                {spotify.connecting ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <Ionicons name="refresh" size={20} color={theme.secondaryText} />
                )}
              </PressableScale>
              <PressableScale style={[styles.option, { backgroundColor: theme.surface }]} onPress={confirmDisconnect}>
                <Text style={[styles.optionText, { color: theme.secondaryText }]}>Disconnect Spotify</Text>
                <Ionicons name="unlink-outline" size={20} color={theme.secondaryText} />
              </PressableScale>
            </>
          ) : (
            <PressableScale
              style={[styles.option, { backgroundColor: theme.surface }]}
              onPress={spotify.connect}
              disabled={!spotify.ready || spotify.connecting || !user}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, { color: theme.text }]}>Connect Spotify</Text>
                <Text style={[styles.optionValue, { color: theme.secondaryText, marginTop: 2 }]}>
                  Sign in with Spotify to keep your library across devices
                </Text>
              </View>
              {spotify.connecting ? (
                <ActivityIndicator color={theme.accent} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
              )}
            </PressableScale>
          )}
          {!!(spotify.error || sessionError) && (
            <Text style={styles.errorText}>{spotify.error || sessionError}</Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Music on this device</Text>
        <View style={styles.section}>
          <PressableScale
            style={[styles.option, { backgroundColor: theme.surface }]}
            onPress={onDeviceMusic}
            disabled={localPermission === 'unavailable' || localScanning}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>Local songs</Text>
            <Text style={[styles.optionValue, { color: localPermission === 'granted' ? theme.secondaryText : theme.accent }]}>
              {deviceMusicLabel}
            </Text>
          </PressableScale>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>

        <View style={styles.section}>
          {Object.entries(themes).map(([name, t]) => (
            <ThemeOption key={name} name={name} label={t.label} color={t.accent} />
          ))}
        </View>


        <Text style={[styles.sectionTitle, { color: theme.text }]}>Player Configuration</Text>
        <View style={styles.section}>
          <PressableScale style={[styles.option, { backgroundColor: theme.surface }]} onPress={cycleQuality}>
            <Text style={[styles.optionText, { color: theme.text }]}>Audio Quality</Text>
            <Text style={[styles.optionValue, { color: theme.secondaryText }]}>
              {QUALITY_LABEL[prefs.audio_quality] || 'Very High'}
            </Text>
          </PressableScale>
          <PressableScale
            style={[styles.option, { backgroundColor: theme.surface }]}
            onPress={() => save({ gapless_playback: !prefs.gapless_playback })}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>Gapless Playback</Text>
            <Ionicons
              name={prefs.gapless_playback ? 'toggle' : 'toggle-outline'}
              size={32}
              color={prefs.gapless_playback ? theme.accent : theme.secondaryText}
              style={!prefs.gapless_playback && { transform: [{ rotate: '180deg' }] }}
            />
          </PressableScale>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        <View style={styles.section}>
          <View style={[styles.option, { backgroundColor: theme.surface }]}>
            <Text style={[styles.optionText, { color: theme.text }]}>Version</Text>
            <Text style={[styles.optionValue, { color: theme.secondaryText }]}>{Constants.expoConfig?.version}</Text>
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
    paddingBottom: 120,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    paddingHorizontal: 15,
    paddingTop: 10,
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
