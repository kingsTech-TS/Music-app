import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../../components/Motion';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { usePlayerStore } from '../../store/usePlayerStore';
import { api } from '../../lib/api';

export default function PlaylistsScreen() {
  const router = useRouter();
  const { theme } = usePlayerStore();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setPlaylists(await api.playlists.mine());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const p = await api.playlists.create(name.trim());
      setCreating(false);
      setName('');
      setPlaylists([p, ...playlists]);
    } catch (e) {
      Alert.alert('Could not create playlist', e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (p) =>
    Alert.alert('Delete playlist', `Delete "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setPlaylists((list) => list.filter((x) => x.id !== p.id));
          api.playlists.remove(p.id).catch((e) => {
            Alert.alert('Could not delete', e.message);
            load();
          });
        },
      },
    ]);

  const open = (p) =>
    router.push({ pathname: '/detail', params: { type: 'playlist', id: p.id, title: p.name, artwork: p.cover || '' } });

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.primary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Playlists</Text>
        <PressableScale style={[styles.addBtn, { backgroundColor: theme.accent }]} onPress={() => setCreating(true)}>
          <Ionicons name="add" size={22} color={theme.onAccent || '#000'} />
        </PressableScale>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, flexGrow: 1 }}
          onRefresh={load}
          refreshing={false}
          renderItem={({ item }) => (
            <PressableScale
              style={[styles.row, { backgroundColor: theme.surface }]}
              onPress={() => open(item)}
              onLongPress={() => confirmDelete(item)}
            >
              {item.cover ? (
                <Image source={{ uri: item.cover }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverEmpty, { backgroundColor: theme.surfaceLight || theme.primary }]}>
                  <Ionicons name="musical-notes" size={24} color={theme.accent} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: theme.secondaryText, marginTop: 3 }}>
                  {item.track_count} {item.track_count === 1 ? 'song' : 'songs'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
            </PressableScale>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={56} color={theme.secondaryText} />
              <Text style={{ color: theme.secondaryText, marginTop: 12, textAlign: 'center' }}>
                {error || 'No playlists yet.\nTap + to create one, or use ⋮ on any song.'}
              </Text>
            </View>
          }
        />
      )}

      <Modal transparent animationType="fade" visible={creating} onRequestClose={() => setCreating(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCreating(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>New playlist</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.primary }]}
              placeholder="Playlist name"
              placeholderTextColor={theme.secondaryText}
              value={name}
              onChangeText={setName}
              onSubmitEditing={create}
              autoFocus
            />
            <View style={styles.dialogButtons}>
              <PressableScale onPress={() => setCreating(false)} style={styles.dialogBtn}>
                <Text style={{ color: theme.secondaryText, fontWeight: '600' }}>Cancel</Text>
              </PressableScale>
              <PressableScale
                onPress={create}
                disabled={saving || !name.trim()}
                style={[styles.dialogBtn, styles.dialogPrimary, { backgroundColor: theme.accent, opacity: name.trim() ? 1 : 0.5 }]}
              >
                {saving ? (
                  <ActivityIndicator color={theme.onAccent || '#000'} />
                ) : (
                  <Text style={{ color: theme.onAccent || '#000', fontWeight: '700' }}>Create</Text>
                )}
              </PressableScale>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 18,
    marginBottom: 12,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    borderRadius: 24,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  input: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  dialogBtn: {
    paddingHorizontal: 18,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 21,
  },
  dialogPrimary: {
    marginLeft: 8,
    minWidth: 90,
  },
});
