import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/usePlayerStore';
import TrackItem from '../../components/TrackItem';

export default function LibraryScreen() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const { localTracks, setLocalTracks, playTrack, theme } = usePlayerStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Songs');

  useEffect(() => {
    if (permissionResponse?.granted) {
      loadLocalTracks();
    }
  }, [permissionResponse]);

  const loadLocalTracks = async () => {
    setLoading(true);
    const assets = await MediaLibrary.getAssetsAsync({ mediaType: 'audio' });
    const formattedTracks = assets.assets.map(asset => ({
      id: asset.id,
      url: asset.uri,
      title: asset.filename,
      artist: 'Local File',
      artwork: 'https://picsum.photos/seed/local/200',
    }));
    setLocalTracks(formattedTracks);
    setLoading(false);
  };

  const handleRequestPermission = async () => {
    const response = await requestPermission();
    if (response.granted) {
      loadLocalTracks();
    }
  };

  const FolderItem = ({ name, count }) => (
    <TouchableOpacity style={styles.folderItem}>
      <View style={styles.folderIconContainer}>
        <Ionicons name="folder-sharp" size={60} color={theme.accent} />
        <View style={styles.folderOverlay}>
          <View style={styles.folderLine} />
        </View>
      </View>
      <View style={{ marginLeft: 15, flex: 1 }}>
        <Text style={[styles.folderName, { color: theme.text }]}>{name}</Text>
        <Text style={[styles.folderCount, { color: theme.secondaryText }]}>{count} Songs</Text>
      </View>
      <TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const mockFolders = [
    { id: 'f1', name: 'Top 100 Billboards', count: 100 },
    { id: 'f2', name: 'My Favorite Songs', count: 42 },
    { id: 'f3', name: 'Ariana Grande', count: 24 },
    { id: 'f4', name: 'Most Popular Songs', count: 85 },
    { id: 'f5', name: 'Childhood Memories', count: 12 },
  ];

  if (!permissionResponse?.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed-outline" size={64} color={theme.secondaryText} />
        <Text style={[styles.permissionText, { color: theme.text }]}>Storage permission required</Text>
        <TouchableOpacity 
          style={[styles.permissionButton, { backgroundColor: theme.accent }]} 
          onPress={handleRequestPermission}
        >
          <Text style={styles.buttonText}>Grant Access</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Library</Text>
        <TouchableOpacity onPress={loadLocalTracks}>
          <Ionicons name="refresh" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {['Songs', 'Artists', 'Albums', 'Folders'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && { borderBottomColor: theme.accent, borderBottomWidth: 3 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.accent : theme.secondaryText }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : activeTab === 'Folders' ? (
        <FlatList
          data={mockFolders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <FolderItem name={item.name} count={item.count} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        />
      ) : (
        <FlatList
          data={localTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrackItem track={item} onPlay={playTrack} theme={theme} />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No local tracks found</Text>
            </View>
          }
        />
      )}
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
