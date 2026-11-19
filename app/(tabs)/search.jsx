import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/usePlayerStore';
import TrackItem from '../../components/TrackItem';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 350;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { searchResults, setSearchResults, playList, theme, localTracks } = usePlayerStore();
  const userId = useAuthStore((s) => s.user?.id);
  const [recentSearches, setRecentSearches] = useState([]);
  const debounce = useRef(null);
  const latest = useRef(''); // ignore responses for stale queries

  const loadRecent = () => api.search.recent().then(setRecentSearches).catch(() => {});

  useEffect(() => {
    if (userId) loadRecent();
  }, [userId]);

  useEffect(() => () => clearTimeout(debounce.current), []);

  // Songs on the device that match — works offline too.
  const q = query.trim().toLowerCase();
  const localMatches = useMemo(
    () =>
      q.length >= MIN_CHARS
        ? localTracks.filter((t) =>
            [t.title, t.artist, t.album].some((v) => v && v.toLowerCase().includes(q))
          )
        : [],
    [q, localTracks]
  );
  const results = [...localMatches, ...searchResults];

  const runSearch = async (text, save = false) => {
    latest.current = text;
    setLoading(true);
    setError('');
    try {
      const res = await api.search.query(text, save);
      if (latest.current === text) setSearchResults(res.tracks);
      if (save) loadRecent();
    } catch (e) {
      if (latest.current === text) setError(e.message);
    } finally {
      if (latest.current === text) setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setQuery(text);
    clearTimeout(debounce.current);
    if (text.trim().length < MIN_CHARS) {
      latest.current = '';
      setSearchResults([]);
      setLoading(false);
      return;
    }
    debounce.current = setTimeout(() => runSearch(text.trim()), DEBOUNCE_MS);
  };

  // Tapping a recent search or submitting from the keyboard saves it to recent searches.
  const submitSearch = (text) => {
    setQuery(text);
    clearTimeout(debounce.current);
    if (text.trim().length >= MIN_CHARS) runSearch(text.trim(), true);
  };

  const playResult = (index) => {
    if (query.trim()) api.search.addRecent(query.trim()).then(setRecentSearches).catch(() => {});
    playList(results, index);
  };

  const clearAll = async () => {
    setRecentSearches([]);
    api.search.clearRecent().catch(loadRecent);
  };

  const removeRecent = (item) => {
    setRecentSearches(recentSearches.filter((s) => s !== item));
    api.search.removeRecent(item).catch(loadRecent);
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
          onSubmitEditing={() => submitSearch(query)}
          returnKeyType="search"
          autoCorrect={false}
          autoFocus
        />
        {!!query && (
          <TouchableOpacity onPress={() => handleSearch('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={theme.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      {loading && !localMatches.length ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : query.trim().length >= MIN_CHARS ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TrackItem track={item} onPlay={() => playResult(index)} theme={theme} />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>{error || 'No results found'}</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Searches</Text>
            {recentSearches.length > 0 && (
              <TouchableOpacity onPress={clearAll}>
                <Text style={{ color: theme.accent, fontWeight: '700' }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.recentItem} onPress={() => submitSearch(item)}>
                <Text style={[styles.recentText, { color: theme.secondaryText }]}>{item}</Text>
                <TouchableOpacity onPress={() => removeRecent(item)} hitSlop={10}>
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
