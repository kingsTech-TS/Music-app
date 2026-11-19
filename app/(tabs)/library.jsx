import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { PressableScale } from '../../components/Motion';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { usePlayerStore } from '../../store/usePlayerStore';
import TrackItem from '../../components/TrackItem';
import { api } from '../../lib/api';

const TABS = ['Songs', 'Liked', 'Artists', 'Folders'];

export default function LibraryScreen() {
  const {
    localTracks, playList, theme, likedIds,
    localPermission, localScanning, requestLocalMusic, scanLocalMusic,
  } = usePlayerStore();
  const [activeTab, setActiveTab] = useState('Songs');
  const [liked, setLiked] = useState([]);
  const [loadingRemote, setLoadingRemote] = useState(true);
  const [error, setError] = useState('');

  const loadRemote = useCallback(async () => {
    setError('');
    try {
      setLiked((await api.library.likes()).items);
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Library</Text>
        <PressableScale onPress={activeTab === 'Liked' ? loadRemote : scanLocalMusic}>
          <Ionicons name="refresh" size={24} color={theme.text} />
        </PressableScale>
      </View>

      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <PressableScale
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && { borderBottomColor: theme.accent, borderBottomWidth: 3 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.accent : theme.secondaryText }]}>{tab}</Text>
          </PressableScale>
        ))}
      </View>

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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 20,
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
