import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/usePlayerStore';
import TrackItem from '../../components/TrackItem';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { searchResults, setSearchResults, playTrack, theme } = usePlayerStore();
  const [recentSearches, setRecentSearches] = useState([
    'Ariana Grande', 'The Weeknd', 'Justin Bieber', 'Drake', 'Blinding Lights', 'Positions'
  ]);



  const handleSearch = async (text) => {
    setQuery(text);
    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    // Mocking an API call
    setTimeout(() => {
      const mockResults = [
        {
          id: 'mock1',
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
          title: 'Streaming Song 1',
          artist: 'Online Artist',
          artwork: 'https://picsum.photos/seed/online1/200',
        },
        {
          id: 'mock2',
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
          title: 'Streaming Song 2',
          artist: 'Online Artist',
          artwork: 'https://picsum.photos/seed/online2/200',
        },
        {
          id: 'mock3',
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
          title: 'Streaming Song 3',
          artist: 'Online Artist',
          artwork: 'https://picsum.photos/seed/online3/200',
        },
      ].filter(song => song.title.toLowerCase().includes(text.toLowerCase()));
      
      setSearchResults(mockResults);
      setLoading(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary }]}>
      <View style={[styles.searchBarContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={20} color={theme.secondaryText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search for songs, artists..."
          placeholderTextColor={theme.secondaryText}
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : query.length >= 3 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrackItem track={item} onPlay={playTrack} theme={theme} />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No results found</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Searches</Text>
            <TouchableOpacity onPress={() => setRecentSearches([])}>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.recentItem} onPress={() => handleSearch(item)}>
                <Text style={[styles.recentText, { color: theme.secondaryText }]}>{item}</Text>
                <TouchableOpacity onPress={() => setRecentSearches(recentSearches.filter(s => s !== item))}>
                  <Ionicons name="close" size={20} color={theme.secondaryText} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={[styles.emptyText, { color: theme.secondaryText }]}>Search for your favorite music</Text>
              </View>
            }
          />
        </View>
      )}

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    margin: 20,
    paddingHorizontal: 15,
    borderRadius: 8,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
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
  recentSection: {
    flex: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  recentText: {
    fontSize: 16,
    fontWeight: '500',
  }
});

