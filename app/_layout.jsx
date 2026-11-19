import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { usePlayerStore } from "../store/usePlayerStore";
import { useAuthStore } from "../store/useAuthStore";
import TrackActionsSheet from "../components/TrackActionsSheet";
import Toast from "../components/Toast";

// Safe check for TrackPlayer to prevent Expo Go crashes
const getTrackPlayer = () => {
  try {
    return require("react-native-track-player").default;
  } catch (e) {
    return null;
  }
};

const TrackPlayer = getTrackPlayer();
const isNative = TrackPlayer && !!TrackPlayer.setupPlayer;

if (isNative) {
  TrackPlayer.registerPlaybackService(() => require("../service"));
}

// How often to save where the song is while it plays (so "continue where you stopped" survives crashes).
const SAVE_POSITION_EVERY_MS = 15000;

// Saves the playback position periodically while playing, and when the app goes to the background.
function usePlaybackPersistence() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const persistPlayback = usePlayerStore((s) => s.persistPlayback);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(persistPlayback, SAVE_POSITION_EVERY_MS);
    return () => clearInterval(t);
  }, [isPlaying]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") persistPlayback();
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const { setPlayerReady, initLocalMusic, initNativeEvents, restoreLastPlayback } = usePlayerStore();
  const hydrate = useAuthStore((s) => s.hydrate);
  usePlaybackPersistence();

  useEffect(() => {
    hydrate(); // restores (or silently creates) this device's account
    initLocalMusic(); // picks up songs on the device if permission was already granted
    restoreLastPlayback(); // last song comes back paused where it stopped — press play to continue
  }, []);

  useEffect(() => {
    async function setupPlayer() {
      if (!isNative) {
        console.warn("TrackPlayer native module is null. You might be in Expo Go.");
        setPlayerReady(true);
        return;
      }
      try {
        await TrackPlayer.setupPlayer();
        const { Capability: NativeCapability } = require("react-native-track-player");
        await TrackPlayer.updateOptions({
          capabilities: [
            NativeCapability.Play,
            NativeCapability.Pause,
            NativeCapability.SkipToNext,
            NativeCapability.SkipToPrevious,
            NativeCapability.SeekTo,
            NativeCapability.Stop,
          ],
          compactCapabilities: [NativeCapability.Play, NativeCapability.Pause],
        });
        initNativeEvents(); // song changes / lock-screen controls / queue end → app state
        setPlayerReady(true);
      } catch (e) {
        console.log("TrackPlayer setup error: ", e);
        setPlayerReady(true);
      }
    }
    setupPlayer();
  }, []);

  return (
    <>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="now-playing"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen name="lyrics" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="queue" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen
        name="detail"
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack>
    <TrackActionsSheet />
    <Toast />
    </>
  );
}
