import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Secure, persistent key/value storage for auth tokens.
// SecureStore on iOS/Android (works in Expo Go and dev builds), localStorage on web.
const isWeb = Platform.OS === 'web';

export const storage = {
  async get(key) {
    try {
      if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      if (isWeb) return globalThis.localStorage?.setItem(key, value);
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async remove(key) {
    try {
      if (isWeb) return globalThis.localStorage?.removeItem(key);
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};
