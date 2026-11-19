# Rave (Music-app)

**Rave** is a music player for Android and iOS built with **Expo SDK 58** (React Native 0.88, Expo Router).
It plays the songs on your phone, songs uploaded to the Rave backend, and the Spotify catalog.

The backend lives in [`../Music-app-BD`](../Music-app-BD) (FastAPI + MongoDB). See its README for the API.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running](#running)
- [Expo Go vs development build](#expo-go-vs-development-build)
- [Spotify sign-in](#spotify-sign-in)
- [Screens](#screens)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)

## Features

| Area     | What you get                                                                    |
| -------- | ------------------------------------------------------------------------------- |
| Music    | Songs on the phone, uploads from the Rave backend, the Spotify catalog          |
| Playback | Curved seek arc, queue, repeat, shuffle, resume where you stopped               |
| Spotify  | Sign in, browse liked songs and playlists, play through the phone's Spotify app |
| Library  | Likes, playlists, recently played, recent searches                              |
| Lyrics   | Time-synced lyrics that follow the song                                         |
| Accounts | Works on first launch (guest), optional email sign-up or Spotify sign-in        |
| Look     | Olive / lime design, animated tab bar and mini player, four themes              |

## Requirements

- Node.js 20+ and npm
- The Rave backend running and reachable from the phone (see [`../Music-app-BD`](../Music-app-BD))
- A phone on the same Wi-Fi as your computer
- For full functionality (phone songs, audio playback): a **development build**, see
  [Expo Go vs development build](#expo-go-vs-development-build)
- For Spotify playback: **Spotify Premium** and the Spotify app installed and logged in on the phone

## Setup

```bash
npm install
copy .env.example .env            # macOS / Linux: cp .env.example .env
```

Then set `EXPO_PUBLIC_API_URL` in `.env` (see [Configuration](#configuration)).

## Configuration

All settings live in `.env`:

| Variable              | Required | Description                                       |
| --------------------- | -------- | ------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | yes      | Backend base URL, including `/api/v1` (see below) |

Which address to use:

| Where the app runs  | `EXPO_PUBLIC_API_URL`              |
| ------------------- | ---------------------------------- |
| Physical phone      | `http://<your-LAN-IP>:8000/api/v1` |
| Android emulator    | `http://10.0.2.2:8000/api/v1`      |
| iOS simulator / web | `http://localhost:8000/api/v1`     |

On a phone, `localhost` means the phone itself, so use your computer's LAN IP. Restart Metro after
changing `.env`.

Spotify needs no app-side settings: the client id, redirect URI and scopes come from the backend
(`GET /spotify/config`).

## Running

```bash
npm start            # Metro dev server; scan the QR code with Expo Go or open your development build
npm run android      # same, opening on a connected Android device / emulator
npm run ios          # same, opening the iOS simulator (macOS only)
npm run web          # web preview (no phone songs or native playback)
```

Start the backend first with `fastapi dev app/main.py --host 0.0.0.0`.

## Expo Go vs development build

Expo Go is fine for working on screens and layout, but some features need native code that Expo Go
doesn't include:

| Feature                             | Expo Go                          | Development build |
| ----------------------------------- | -------------------------------- | ----------------- |
| Screens, navigation, themes         | Yes                              | Yes               |
| Backend data, likes, playlists      | Yes                              | Yes               |
| Spotify sign-in                     | Yes (with the `exp://` URI)      | Yes               |
| Songs on the phone (Android)        | No: Expo Go lacks the permission | Yes               |
| Audio playback (track player)       | No: native module missing        | Yes               |
| Lock-screen / notification controls | No                               | Yes               |

To create a development build (your own app with Metro and live reload still working):

```bash
npx expo install expo-dev-client
npx expo run:android                                      # local: needs Android Studio + Android SDK
# or, in the cloud:
eas build --profile development --platform android        # then install the APK on the phone
```

> **Note:** `react-native-track-player` does not support the New Architecture, which SDK 58 always uses.
> Check playback first in the development build.

## Spotify sign-in

Sign-in uses the Authorization Code flow with PKCE. The code is exchanged by the backend, so the client
secret never ships in the app.

| Where the app runs             | Redirect URI the app uses                  |
| ------------------------------ | ------------------------------------------ |
| Development build / production | `rave://spotify-auth` (from the backend)   |
| Expo Go                        | `exp://<your-LAN-IP>:8081/--/spotify-auth` |

Both must be listed under **Redirect URIs** in the Spotify developer dashboard. In development the app
prints the one it uses in the Metro terminal:

```text
[spotify] redirect URI: exp://192.168.1.138:8081/--/spotify-auth
```

The Expo Go address changes when your LAN IP or the Metro port changes, so update the dashboard if it does.
While the Spotify app is in Development mode, each Spotify account must also be added under
**User Management**.

Spotify songs play in the **Spotify app on the phone** (Spotify Connect); Rave sends the commands and
shows the progress.

## Screens

| Screen      | File                       | What it does                                                   |
| ----------- | -------------------------- | -------------------------------------------------------------- |
| Loading     | `app/index.jsx`            | Animated intro, then onboarding (first launch only) or the app |
| Onboarding  | `app/onboarding.jsx`       | "Start Your Sonic Journey"; asks for access to phone music     |
| Sign in     | `app/auth.jsx`             | Email sign-up / log in or Spotify; "Not now" keeps the guest   |
| Home        | `app/(tabs)/index.jsx`     | Categories, popular songs, new collections, Spotify sections   |
| Search      | `app/(tabs)/search.jsx`    | Phone songs, Rave and the Spotify catalog; recent searches     |
| Library     | `app/(tabs)/library.jsx`   | Tabs: phone songs, liked, history, artists, folders            |
| Playlists   | `app/(tabs)/playlists.jsx` | Your playlists                                                 |
| Settings    | `app/(tabs)/settings.jsx`  | Account, Spotify, phone music access, theme, player options    |
| Detail      | `app/detail.jsx`           | A collection, album, artist, playlist or Spotify playlist      |
| Now playing | `app/now-playing.jsx`      | Full player with the curved seek arc                           |
| Queue       | `app/queue.jsx`            | Up next (Rave queue, or Spotify's "Next up")                   |
| Lyrics      | `app/lyrics.jsx`           | Time-synced lyrics with auto-scroll                            |
| (redirect)  | `app/spotify-auth.jsx`     | Landing route for Spotify's redirect; finishes sign-in         |

Themes (Settings > Appearance): **Hive Lime** (default), **Mume Orange**, **Spotify Dark**, **Sunset Glow**.

## Project layout

```text
Music-app/
├── app/                          Screens (Expo Router: file = route)
│   ├── _layout.jsx               Root stack, player setup, saves the playback position
│   ├── (tabs)/                   Home, Search, Library, Playlists, Settings + pill tab bar
│   └── ...                       Other screens (see Screens)
├── components/
│   ├── LoadingScreen.jsx         Animated intro
│   ├── MiniPlayer.jsx            Compact player above the tab bar
│   ├── Motion.jsx                Animation helpers (PressableScale, FadeIn, Equalizer, ...)
│   ├── Toast.jsx                 Slide-down messages
│   ├── TrackActionsSheet.jsx     Like / add to playlist / remove sheet
│   └── TrackItem.jsx             Song row
├── hooks/
│   ├── usePlaybackPosition.js    Position of the current song (native, Spotify or resume point)
│   ├── useSpotifyLogin.js        Spotify sign-in (picks the redirect URI)
│   └── useSpotifyProgress.js     Progress for Spotify Connect playback
├── lib/
│   ├── api.js                    Backend client (tokens, refresh, endpoints)
│   ├── localMusic.js             Reads audio files on the phone (expo-media-library)
│   ├── spotifyAuth.js            PKCE flow that survives an app restart
│   └── storage.js                SecureStore (phone) / localStorage (web)
├── store/
│   ├── useAuthStore.js           Account, session, Spotify connection (Zustand)
│   └── usePlayerStore.js         Queue, playback, themes, phone songs (Zustand)
├── service.js                    Background playback service (lock-screen controls)
├── app.json                      Expo config (scheme `rave`, plugins, permissions)
├── .env.example
└── package.json
```

## Troubleshooting

| Problem                             | Fix                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| App can't reach the backend         | Use your LAN IP in `.env`, run the backend with `--host 0.0.0.0`, restart Metro |
| Spotify: **Allow** does nothing     | Reload the app; the Metro log must show an `exp://` redirect URI in Expo Go     |
| Spotify: "Invalid redirect URI"     | Add the exact URI from the Metro log to the Spotify dashboard                   |
| Spotify: 403 for a user             | Add that Spotify account under User Management (Development mode)               |
| Spotify song has no sound           | Open the Spotify app on the phone and log in (Premium needed)                   |
| "Device music isn't available here" | Expected in Expo Go; use a development build                                    |
| "TrackPlayer native module is null" | Expected in Expo Go; use a development build                                    |
| Phone disconnects from Metro        | Keep the screen on and Expo Go in front; shake the phone and tap **Reload**     |
