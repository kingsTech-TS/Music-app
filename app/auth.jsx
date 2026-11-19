import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSpotifyLogin } from '../hooks/useSpotifyLogin';
import { FadeIn, PressableScale } from '../components/Motion';

const MODES = ['login', 'register'];

/**
 * Sign up / log in with email, or continue with Spotify.
 * Optional: "Not now" keeps using the device's guest account (nothing is lost — signing up later keeps it).
 * Opened from onboarding (?from=onboarding → continues into the app) or from Settings (→ goes back).
 */
export default function AuthScreen() {
  const router = useRouter();
  const { from, mode: initialMode } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const theme = usePlayerStore((s) => s.theme);
  const { login, register } = useAuthStore();
  const spotify = useSpotifyLogin();

  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';
  const tab = useRef(new Animated.Value(isRegister ? 1 : 0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const [tabWidth, setTabWidth] = useState(0);

  const done = () => {
    if (from === 'onboarding' || !router.canGoBack()) router.replace('/(tabs)');
    else router.back();
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    Animated.spring(tab, { toValue: MODES.indexOf(m), useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  };

  const fail = (message) => {
    setError(message);
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 0].map((x) =>
        Animated.timing(shake, { toValue: x, duration: 55, easing: Easing.linear, useNativeDriver: true })
      )
    ).start();
  };

  const submit = async () => {
    setError('');
    if (isRegister && !name.trim()) return fail('Please enter your name');
    if (!email.trim() || !password) return fail('Email and password are required');
    if (isRegister && password.length < 8) return fail('Password must be at least 8 characters');

    setLoading(true);
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
      done();
    } catch (e) {
      fail(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const continueWithSpotify = async () => {
    setError('');
    if (await spotify.connect()) done();
  };

  const fieldStyle = [styles.field, { backgroundColor: theme.surface, borderColor: theme.surfaceLight || theme.surface }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.primary }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          {from !== 'onboarding' ? (
            <PressableScale style={styles.iconBtn} onPress={done}>
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </PressableScale>
          ) : (
            <View />
          )}
          <PressableScale onPress={done} scaleTo={0.9}>
            <Text style={{ color: theme.secondaryText, fontWeight: '600' }}>Not now</Text>
          </PressableScale>
        </View>

        <FadeIn>
          <Text style={[styles.title, { color: theme.text }]}>{isRegister ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            {isRegister
              ? 'Keep your likes and playlists safe and on every device.'
              : 'Log in to pick up where you left off.'}
          </Text>
        </FadeIn>

        {/* Login / Sign up switch with a sliding pill */}
        <FadeIn delay={80}>
          <View
            style={[styles.switch, { backgroundColor: theme.surface }]}
            onLayout={(e) => setTabWidth((e.nativeEvent.layout.width - 8) / 2)}
          >
            {tabWidth > 0 && (
              <Animated.View
                style={[
                  styles.switchPill,
                  {
                    width: tabWidth,
                    backgroundColor: theme.accent,
                    transform: [{ translateX: tab.interpolate({ inputRange: [0, 1], outputRange: [0, tabWidth] }) }],
                  },
                ]}
              />
            )}
            {MODES.map((m) => (
              <PressableScale
                key={m}
                containerStyle={{ flex: 1 }}
                style={styles.switchItem}
                onPress={() => switchMode(m)}
                scaleTo={0.95}
              >
                <Text style={[styles.switchText, { color: mode === m ? theme.onAccent || '#000' : theme.text }]}>
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </Text>
              </PressableScale>
            ))}
          </View>
        </FadeIn>

        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          <FadeIn delay={140}>
            {isRegister && (
              <View style={fieldStyle}>
                <Ionicons name="person-outline" size={18} color={theme.secondaryText} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Name"
                  placeholderTextColor={theme.secondaryText}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  textContentType="name"
                />
              </View>
            )}
            <View style={fieldStyle}>
              <Ionicons name="mail-outline" size={18} color={theme.secondaryText} style={styles.fieldIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Email"
                placeholderTextColor={theme.secondaryText}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
            <View style={fieldStyle}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.secondaryText} style={styles.fieldIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder={isRegister ? 'Password (8+ characters)' : 'Password'}
                placeholderTextColor={theme.secondaryText}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                textContentType={isRegister ? 'newPassword' : 'password'}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
              <PressableScale onPress={() => setShowPassword(!showPassword)} hitSlop={10} scaleTo={0.8}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.secondaryText} />
              </PressableScale>
            </View>
          </FadeIn>
        </Animated.View>

        {!!(error || spotify.error) && <Text style={styles.error}>{error || spotify.error}</Text>}

        <FadeIn delay={200}>
          <PressableScale
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={submit}
            disabled={loading}
            scaleTo={0.96}
          >
            {loading ? (
              <ActivityIndicator color={theme.onAccent || '#000'} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.onAccent || '#000' }]}>{isRegister ? 'Create account' : 'Log in'}</Text>
            )}
          </PressableScale>

          {spotify.enabled && (
            <>
              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: theme.surface }]} />
                <Text style={{ color: theme.secondaryText, marginHorizontal: 12, fontSize: 12 }}>or</Text>
                <View style={[styles.divider, { backgroundColor: theme.surface }]} />
              </View>
              <PressableScale
                style={[styles.button, styles.spotifyButton, { borderColor: theme.surfaceLight || theme.surface }]}
                onPress={continueWithSpotify}
                disabled={spotify.connecting}
                scaleTo={0.96}
              >
                {spotify.connecting ? (
                  <ActivityIndicator color="#1DB954" />
                ) : (
                  <>
                    <FontAwesome name="spotify" size={22} color="#1DB954" />
                    <Text style={[styles.buttonText, { color: theme.text, marginLeft: 10 }]}>Continue with Spotify</Text>
                  </>
                )}
              </PressableScale>
            </>
          )}
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 40,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  switch: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 4,
    marginBottom: 22,
  },
  switchPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 24,
  },
  switchItem: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    fontSize: 15,
    fontWeight: '700',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 14,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 12,
    fontSize: 13,
  },
  button: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexDirection: 'row',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  spotifyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    marginTop: 0,
  },
});
