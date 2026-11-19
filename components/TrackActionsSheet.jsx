import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../store/usePlayerStore';
import { api } from '../lib/api';
import { FadeIn } from './Motion';

// Bottom sheet opened from a track's ⋮ button: like, add to playlist, remove from playlist.
export default function TrackActionsSheet() {
  const insets = useSafeAreaInsets();
  const { actionTrack: track, actionContext, closeTrackActions, theme, likedIds, toggleLike, addTrack } = usePlayerStore();
  const [view, setView] = useState('menu'); // 'menu' | 'playlists'
  const [playlists, setPlaylists] = useState(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (track) {
      setView('menu');
      setNewName('');
    }
  }, [track]);

  if (!track) return null;
  const liked = !!likedIds[track.id];

  const fail = (e) => Alert.alert('Something went wrong', e.message);

  const openPlaylists = async () => {
    setView('playlists');
    setPlaylists(null);
    try {
      setPlaylists(await api.playlists.mine());
    } catch (e) {
      setPlaylists([]);
      fail(e);
    }
  };

  const addTo = async (playlist) => {
    setBusy(true);
    try {
      await api.playlists.addTracks(playlist.id, [track.id]);
      closeTrackActions();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await api.playlists.create(newName.trim(), null, [track.id]);
      closeTrackActions();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const removeFromPlaylist = async () => {
    try {
      await api.playlists.removeTrack(actionContext.playlistId, track.id);
      actionContext.onChanged?.();
      closeTrackActions();
    } catch (e) {
      fail(e);
    }
  };

  const Row = ({ icon, label, onPress, color }) => (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color || theme.text} />
      <Text style={[styles.rowText, { color: color || theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal transparent animationType="fade" visible onRequestClose={closeTrackActions}>
      <Pressable style={styles.backdrop} onPress={closeTrackActions} />
      <FadeIn distance={120} duration={320}>
      <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: theme.secondaryText }]} />
        <View style={styles.header}>
          <Image source={{ uri: track.artwork || undefined }} style={[styles.art, { backgroundColor: theme.primary }]} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{track.title}</Text>
            <Text style={{ color: theme.secondaryText }} numberOfLines={1}>{track.artist}</Text>
          </View>
        </View>

        {view === 'menu' ? (
          <>
            <Row
              icon={liked ? 'heart' : 'heart-outline'}
              label={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
              color={liked ? theme.accent : undefined}
              onPress={() => toggleLike(track).catch(fail)}
            />
            <Row icon="add-circle-outline" label="Add to playlist" onPress={openPlaylists} />
            {!!track.url && (
              <Row
                icon="list-outline"
                label="Add to queue"
                onPress={() => {
                  addTrack(track);
                  closeTrackActions();
                }}
              />
            )}
            {actionContext?.playlistId && (
              <Row icon="remove-circle-outline" label="Remove from this playlist" onPress={removeFromPlaylist} />
            )}
          </>
        ) : (
          <>
            <View style={[styles.newRow, { backgroundColor: theme.primary }]}>
              <TextInput
                style={[styles.newInput, { color: theme.text }]}
                placeholder="New playlist name"
                placeholderTextColor={theme.secondaryText}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={createAndAdd}
              />
              <TouchableOpacity onPress={createAndAdd} disabled={busy || !newName.trim()}>
                <Ionicons name="add-circle" size={28} color={newName.trim() ? theme.accent : theme.secondaryText} />
              </TouchableOpacity>
            </View>
            {playlists === null || busy ? (
              <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 280 }}>
                {playlists.length === 0 && (
                  <Text style={{ color: theme.secondaryText, padding: 16 }}>No playlists yet — create one above.</Text>
                )}
                {playlists.map((p) => (
                  <Row key={p.id} icon="musical-notes-outline" label={`${p.name}  ·  ${p.track_count}`} onPress={() => addTo(p)} />
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>
      </FadeIn>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowText: {
    fontSize: 15,
    marginLeft: 14,
    fontWeight: '500',
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    marginVertical: 8,
  },
  newInput: {
    flex: 1,
    fontSize: 15,
  },
});
