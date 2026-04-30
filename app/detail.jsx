import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/usePlayerStore';
import TrackItem from '../components/TrackItem';

const { width } = Dimensions.get('window');

export default function DetailScreen() {
  const { type, id, title, artwork, artist } = useLocalSearchParams();
  const router = useRouter();
  const { theme, playTrack, queue } = usePlayerStore();

  const isArtist = type === 'artist';

  // Mock songs for this detail view
  const songs = [
    { id: '1', title: 'Starboy', artist: 'The Weeknd', artwork: 'https://picsum.photos/seed/1/200', duration: 230 },
    { id: '2', title: 'Die For You', artist: 'The Weeknd', artwork: 'https://picsum.photos/seed/2/200', duration: 210 },
    { id: '3', title: 'Blinding Lights', artist: 'The Weeknd', artwork: 'https://picsum.photos/seed/3/200', duration: 190 },
    { id: '4', title: 'Save Your Tears', artist: 'The Weeknd', artwork: 'https://picsum.photos/seed/4/200', duration: 205 },
    { id: '5', title: 'Call Out My Name', artist: 'The Weeknd', artwork: 'https://picsum.photos/seed/5/200', duration: 220 },
  ];

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playTrack(songs[0]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.artContainer}>
          <Image 
            source={{ uri: artwork }} 
            style={[
              styles.artwork, 
              isArtist ? styles.artistImage : styles.albumImage
            ]} 
          />
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {artist && <Text style={[styles.artistName, { color: theme.secondaryText }]}>{artist}</Text>}
          <Text style={[styles.stats, { color: theme.secondaryText }]}>
            {isArtist ? 'Artist | 28 Songs' : 'Album | 2024 | 12 Songs'}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.playButton, { backgroundColor: theme.accent }]}
            onPress={handlePlayAll}
          >
            <Ionicons name="shuffle" size={20} color="#fff" />
            <Text style={styles.buttonText}>Shuffle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.playButton, styles.outlineButton, { borderColor: theme.accent }]}>
            <Ionicons name="play" size={20} color={theme.accent} />
            <Text style={[styles.buttonText, { color: theme.accent }]}>Play</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.songList}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Songs</Text>
            <TouchableOpacity>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>See All</Text>
            </TouchableOpacity>
          </View>
          {songs.map((song) => (
            <TrackItem 
              key={song.id} 
              track={song} 
              onPlay={playTrack} 
              theme={theme} 
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  artwork: {
    width: width * 0.65,
    height: width * 0.65,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  artistImage: {
    borderRadius: width * 0.325,
  },
  albumImage: {
    borderRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 5,
  },
  stats: {
    fontSize: 14,
    marginTop: 10,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
    gap: 15,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 30,
    minWidth: 140,
  },
  outlineButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  songList: {
    marginTop: 40,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  }
});
