import { useEffect } from "react";
import { Stack } from "expo-router";
import { usePlayerStore } from "../store/usePlayerStore";
import { useAuthStore } from "../store/useAuthStore";
import TrackActionsSheet from "../components/TrackActionsSheet";

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

export default function RootLayout() {
  const { setPlayerReady, initLocalMusic } = usePlayerStore();
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate(); // restores (or silently creates) this device's account
    initLocalMusic(); // picks up songs on the device if permission was already granted
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
            NativeCapability.Stop,
          ],
          compactCapabilities: [NativeCapability.Play, NativeCapability.Pause],
        });
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
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="now-playing"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="detail"
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack>
    <TrackActionsSheet />
    </>
  );
}
