import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Linking, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../../components/Motion';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { usePlayerStore } from '../../store/usePlayerStore';
import TrackItem from '../../components/TrackItem';
import { api } from '../../lib/api';

const TABS = ['Songs', 'Liked', 'History', 'Artists', 'Folders'];

const formatTime = (s) => {
  const m = Math.floor((s || 0) / 60);
  const sec = Math.floor((s || 0) % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

const timeAgo = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export default function LibraryScreen() {
  const {
    localTracks, playList, theme, likedIds,
    localPermission, localScanning, requestLocalMusic, scanLocalMusic,
  } = usePlayerStore();
  const [activeTab, setActiveTab] = useState('Songs');
  const [liked, setLiked] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingRemote, setLoadingRemote] = useState(true);
  const [error, setError] = useState('');

  const loadRemote = useCallback(async () => {
    setError('');
    try {
      const [likes, hist] = await Promise.all([api.library.likes(), api.library.history()]);
      setLiked(likes.items);
      setHistory(hist);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingRemote(false);
    }
  }, []);

  // Refresh whenever the tab is focused (likes may have changed on other screens).
  useFocusEffect(
    useCallback(() => {
      loadRemote();
    }, [loadRemote])
  );

  const handleRequestPermission = async () => {
    // Once denied permanently, Android/iOS won't show the prompt again — send the user to Settings.
    if (localPermission === 'denied') return Linking.openSettings();
    await requestLocalMusic();
  };

  // Hide songs unliked elsewhere without waiting for a refetch.
  const likedVisible = liked.filter((t) => likedIds[t.id]);

  const groupBy = (tracks, keyFn) =>
    Object.values(
      tracks.reduce((acc, t) => {
        const key = keyFn(t);
        if (!key) return acc;
        acc[key] = acc[key] || { name: key, tracks: [] };
        acc[key].tracks.push(t);
        return acc;
      }, {})
    ).sort((a, b) => a.name.localeCompare(b.name));

  const artists = groupBy([...localTracks, ...likedVisible], (t) => t.artist);
  const folders = groupBy(localTracks, (t) => t.album); // device folder each file lives in

  const FolderItem = ({ name, count, onPress, icon = 'folder-sharp' }) => (
    <PressableScale style={styles.folderItem} onPress={onPress}>
      <View style={styles.folderIconContainer}>
        <Ionicons name={icon} size={60} color={theme.accent} />
      </View>
      <View style={{ marginLeft: 15, flex: 1 }}>
        <Text style={[styles.folderName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.folderCount, { color: theme.secondaryText }]}>{count} Songs</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
    </PressableScale>
  );

  const Empty = ({ text }) => (
    <View style={styles.centered}>
      <Text style={[styles.emptyText, { color: theme.secondaryText }]}>{text}</Text>
    </View>
  );

  const renderTab = () => {
    const needsLocal = activeTab === 'Songs' || activeTab === 'Folders';
    if (needsLocal && localPermission === 'unavailable') {
      return <Empty text="Device music isn't available here. Use a development build on Android." />;
    }
    if (needsLocal && localPermission !== 'granted') {
      return (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={64} color={theme.secondaryText} />
          <Text style={[styles.permissionText, { color: theme.text }]}>Allow access to your music</Text>
          <PressableScale style={[styles.permissionButton, { backgroundColor: theme.accent }]} onPress={handleRequestPermission}>
            <Text style={[styles.buttonText, { color: theme.onAccent || '#000' }]}>
              {localPermission === 'denied' ? 'Open Settings' : 'Grant Access'}
            </Text>
          </PressableScale>
        </View>
      );
    }
    if (needsLocal && localScanning && !localTracks.length) {
      return <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 50 }} />;
    }

    if (activeTab === 'Songs') {
      return (
        <FlatList
          data={localTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackItem track={item} onPlay={() => playList(localTracks, index)} theme={theme} />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshing={localScanning}
          onRefresh={scanLocalMusic}
          ListEmptyComponent={<Empty text="No songs found on this device" />}
        />
      );
    }

    if (activeTab === 'Folders') {
      return (
        <FlatList
          data={folders}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <FolderItem name={item.name} count={item.tracks.length} onPress={() => playList(item.tracks, 0)} />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListEmptyComponent={<Empty text="No folders with music found" />}
        />
      );
    }

    if (activeTab === 'Artists') {
      return (
        <FlatList
          data={artists}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <FolderItem
              name={item.name}
              count={item.tracks.length}
              icon="person-circle"
              onPress={() => playList(item.tracks, 0)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListEmptyComponent={<Empty text="No artists yet" />}
        />
      );
    }

    if (loadingRemote) return <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 50 }} />;
    if (error) {
      return (
        <PressableScale style={styles.centered} onPress={loadRemote}>
          <Text style={[styles.emptyText, { color: theme.secondaryText, textAlign: 'center' }]}>{error}</Text>
          <Text style={{ color: theme.accent, fontWeight: '700', marginTop: 10 }}>Tap to retry</Text>
        </PressableScale>
      );
    }

    if (activeTab === 'History') {
      const tracks = history.map((h) => h.track);
      const clear = () =>
        Alert.alert('Clear history', 'Remove your listening history and saved positions?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: () => api.library.clearHistory().then(loadRemote).catch((e) => Alert.alert('Could not clear', e.message)),
          },
        ]);
      return (
        <FlatList
          data={history}
          keyExtractor={(item) => item.track.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshing={false}
          onRefresh={loadRemote}
          ListHeaderComponent={
            history.length > 0 && (
              <PressableScale onPress={clear} style={styles.clearRow}>
                <Text style={{ color: theme.secondaryText, fontWeight: '600' }}>Clear history</Text>
              </PressableScale>
            )
          }
          renderItem={({ item, index }) => {
            const pct = item.duration ? Math.min(1, item.position / item.duration) : 0;
            return (
              // Tap → continue from where it stopped (then keep going through the history list).
              <PressableScale
                style={styles.historyItem}
                scaleTo={0.97}
                onPress={() => playList(tracks, index, { startAt: item.position })}
              >
                {item.track.artwork ? (
                  <Image source={{ uri: item.track.artwork }} style={styles.historyArt} />
                ) : (
                  <View style={[styles.historyArt, { backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="musical-note" size={20} color={theme.accent} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>{item.track.title}</Text>
                  <Text style={{ color: theme.secondaryText, fontSize: 13 }} numberOfLines={1}>
                    {item.track.artist} · {timeAgo(item.played_at)}
                  </Text>
                  {item.position > 0 && (
                    <View style={styles.resumeRow}>
                      <View style={[styles.progressTrack, { backgroundColor: theme.surface }]}>
                        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: theme.accent }]} />
                      </View>
                      <Text style={[styles.resumeText, { color: theme.accent }]}>Resume at {formatTime(item.position)}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name={item.position > 0 ? 'play-circle' : 'play-circle-outline'} size={30} color={theme.accent} />
              </PressableScale>
            );
          }}
          ListEmptyComponent={<Empty text="Songs you play will show up here, ready to continue where you stopped" />}
        />
      );
    }

    // Liked songs (stored on the server)
    return (
      <FlatList
        data={likedVisible}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TrackItem track={item} onPlay={() => playList(likedVisible, index)} theme={theme} />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Empty text="Songs you like will show up here" />}
      />
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.primary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Library</Text>
        <PressableScale onPress={activeTab === 'Liked' || activeTab === 'History' ? loadRemote : scanLocalMusic}>
          <Ionicons name="refresh" size={24} color={theme.text} />
        </PressableScale>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContainer}
      >
        {TABS.map((tab) => (
          <PressableScale
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && { borderBottomColor: theme.accent, borderBottomWidth: 3 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.accent : theme.secondaryText }]}>{tab}</Text>
          </PressableScale>
        ))}
      </ScrollView>

      {renderTab()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  tabScroll: {
    flexGrow: 0,
    marginBottom: 20,
  },
  tabContainer: {
    paddingHorizontal: 10,
  },
  clearRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  historyArt: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  resumeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 16,
  },
  permissionText: {
    fontSize: 18,
    marginVertical: 20,
    fontWeight: '600',
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  folderIconContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderName: {
    fontSize: 18,
    fontWeight: '700',
  },
  folderCount: {
    fontSize: 14,
    marginTop: 4,
  }
});
