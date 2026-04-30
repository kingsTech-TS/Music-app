import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList,
  Dimensions,
  StatusBar
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from "../../store/usePlayerStore";

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { queue, playTrack, theme } = usePlayerStore();
  const router = useRouter();

  const handlePlayTestSong = () => {
    const id = Math.random().toString(36).substr(2, 9);
    playTrack({
      id,
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      title: `Song ${queue.length + 1}`,
      artist: "SoundHelix",
      artwork: `https://picsum.photos/seed/${id}/200`,
    });
  };

  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <TouchableOpacity>
        <Text style={{ color: theme.accent, fontWeight: '700' }}>See All</Text>
      </TouchableOpacity>
    </View>
  );

  const RecentlyPlayedCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.recentCard} 
      onPress={() => router.push({ pathname: '/detail', params: { type: 'album', id: item.id, title: item.title, artwork: item.artwork, artist: item.artist } })}
    >
      <Image source={{ uri: item.artwork }} style={styles.recentImage} />
      <Text style={[styles.recentTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
      <Text style={[styles.recentArtist, { color: theme.secondaryText }]} numberOfLines={1}>{item.artist}</Text>
    </TouchableOpacity>
  );

  const ArtistCircle = ({ item }) => (
    <TouchableOpacity 
      style={styles.artistItem}
      onPress={() => router.push({ pathname: '/detail', params: { type: 'artist', id: item.id, title: item.name, artwork: item.image } })}
    >
      <Image source={{ uri: item.image }} style={styles.artistImage} />
      <Text style={[styles.artistName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/100?u=andrew' }} 
              style={styles.avatar} 
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.greeting, { color: theme.secondaryText }]}>Good Morning 👋</Text>
              <Text style={[styles.userName, { color: theme.text }]}>Andrew Ainsley</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconCircle}>
              <Ionicons name="notifications-outline" size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle}>
              <Ionicons name="search-outline" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {['Suggested', 'Songs', 'Artists', 'Albums', 'Folders'].map((tab, i) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabItem, i === 0 && { borderBottomColor: theme.accent, borderBottomWidth: 3 }]}
            >
              <Text style={[styles.tabText, { color: i === 0 ? theme.accent : theme.secondaryText }]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader title="Recently Played" />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={queue.length > 0 ? queue : [
            { id: '1', title: 'Starboy', artist: 'The Weeknd', artwork: 'https://picsum.photos/seed/1/200' },
            { id: '2', title: 'Positions', artist: 'Ariana Grande', artwork: 'https://picsum.photos/seed/2/200' },
            { id: '3', title: 'Future Nostalgia', artist: 'Dua Lipa', artwork: 'https://picsum.photos/seed/3/200' },
          ]}
          renderItem={({ item }) => <RecentlyPlayedCard item={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingLeft: 20 }}
        />

        <SectionHeader title="Artists" />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { id: 'a1', name: 'Ariana Grande', image: 'https://picsum.photos/seed/ari/200' },
            { id: 'a2', name: 'The Weeknd', image: 'https://picsum.photos/seed/wee/200' },
            { id: 'a3', name: 'Dua Lipa', image: 'https://picsum.photos/seed/dua/200' },
            { id: 'a4', name: 'Justin Bieber', image: 'https://picsum.photos/seed/jus/200' },
            { id: 'a5', name: 'Billie Eilish', image: 'https://picsum.photos/seed/bil/200' },
          ]}
          renderItem={({ item }) => <ArtistCircle item={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingLeft: 20 }}
        />

        <SectionHeader title="Suggested For You" />
        <View style={styles.suggestedGrid}>
          {[
            { id: 's1', title: 'Grades of Love', artist: 'Alex Sierra', artwork: 'https://picsum.photos/seed/s1/200' },
            { id: 's2', title: 'Without You', artist: 'The Kid LAROI', artwork: 'https://picsum.photos/seed/s2/200' },
            { id: 's3', title: 'Save Your Tears', artist: 'The Weeknd', artwork: 'https://picsum.photos/seed/s3/200' },
            { id: 's4', title: 'Peaches', artist: 'Justin Bieber', artwork: 'https://picsum.photos/seed/s4/200' },
          ].map((item) => (
            <TouchableOpacity key={item.id} style={styles.gridItem} onPress={() => playTrack(item)}>
              <Image source={{ uri: item.artwork }} style={styles.gridImage} />
              <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.gridArtist, { color: theme.secondaryText }]} numberOfLines={1}>{item.artist}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f222a',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  tabScroll: {
    maxHeight: 50,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  tabItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 5,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  recentCard: {
    width: width * 0.4,
    marginRight: 16,
  },
  recentImage: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: 24,
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  recentArtist: {
    fontSize: 13,
    marginTop: 2,
  },
  artistItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '700',
    width: 80,
    textAlign: 'center',
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (width - 60) / 2,
    marginBottom: 20,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    marginBottom: 10,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  gridArtist: {
    fontSize: 13,
    marginTop: 2,
  }
});
