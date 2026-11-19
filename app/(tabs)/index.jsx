import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api';
import { FadeIn, PressableScale } from '../../components/Motion';

const { width } = Dimensions.get('window');

const greetingFor = (date = new Date()) => {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Good Morning!';
  if (h >= 12 && h < 17) return 'Good Afternoon!';
  return 'Good Evening!';
};

// "Top Songs Global" -> "Top Songs\nGlobal" to keep the two-line card look.
const twoLines = (title) => {
  const words = title.split(' ');
  if (words.length < 2) return title;
  return `${words.slice(0, -1).join(' ')}\n${words[words.length - 1]}`;
};

function Artwork({ uri, style, theme, icon = 'musical-notes' }) {
  if (uri) return <Image source={{ uri }} style={style} />;
  return (
    <View style={[style, styles.artFallback, { backgroundColor: theme.surface }]}>
      <Ionicons name={icon} size={36} color={theme.accent} />
    </View>
  );
}

export default function HomeScreen() {
  const { playList, theme, localTracks, localPermission, localScanning, requestLocalMusic, scanLocalMusic } =
    usePlayerStore();
  const { user, ensureSession } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('All');
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (cat) => {
    try {
      setError('');
      setFeed(await api.home(cat));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when the category changes or once the device's account is ready.
  useEffect(() => {
    load(category);
  }, [category, user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    if (!user) ensureSession();
    if (localPermission === 'granted') scanLocalMusic();
    load(category);
  };

  const categories = feed?.categories?.length ? ['All', ...feed.categories] : [];
  const popular = feed?.popular || [];
  const recent = feed?.recently_played || [];
  const collections = feed?.collections || [];
  const localPreview = localTracks.slice(0, 20);

  const open = (list, index) => {
    playList(list, index);
    router.push('/now-playing');
  };

  const nothingYet =
    !loading && !popular.length && !recent.length && !collections.length && !localTracks.length;

  const SectionHeader = ({ title, onSeeAll }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity style={styles.seeAll} onPress={onSeeAll}>
          <Text style={[styles.seeAllText, { color: theme.secondaryText }]}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.secondaryText} />
        </TouchableOpacity>
      )}
    </View>
  );

  const SongRow = ({ data }) => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.hList}
      renderItem={({ item, index }) => (
        <PressableScale style={styles.songCard} onPress={() => open(data, index)}>
          <Artwork uri={item.artwork} style={styles.songImage} theme={theme} />
          <View style={styles.songMeta}>
            <View style={[styles.songBar, { backgroundColor: theme.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.songArtist, { color: theme.secondaryText }]} numberOfLines={1}>{item.artist}</Text>
            </View>
          </View>
        </PressableScale>
      )}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.primary, paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={theme.accent} colors={[theme.accent]} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <FadeIn>
        <View style={styles.header}>
          <TouchableOpacity style={styles.userInfo} onPress={() => router.push('/settings')} activeOpacity={0.8}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.surface }]}>
                <Ionicons name="person" size={22} color={theme.accent} />
              </View>
            )}
            <View style={{ marginLeft: 12 }}>
              <Text style={[user?.name ? styles.greeting : styles.userName, { color: user?.name ? theme.secondaryText : theme.text }]}>
                {greetingFor()}
              </Text>
              {!!user?.name && <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconCircle, { backgroundColor: theme.surface, borderColor: theme.surfaceLight || theme.surface }]}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
        </FadeIn>

        {!!error && (
          <TouchableOpacity onPress={onRefresh} style={[styles.errorBox, { backgroundColor: theme.surface }]}>
            <Ionicons name="cloud-offline-outline" size={20} color={theme.secondaryText} style={{ marginRight: 10 }} />
            <Text style={{ color: theme.text, flex: 1 }}>{error}</Text>
            <Text style={{ color: theme.accent, fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        )}

        {/* Categories (only those that actually have songs) */}
        {categories.length > 1 && (
          <>
            <SectionHeader title="Select Categories" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.map((c) => {
                const active = c === category;
                return (
                  <PressableScale
                    key={c}
                    onPress={() => setCategory(c)}
                    scaleTo={0.9}
                    style={[styles.chip, { backgroundColor: active ? theme.accent : theme.surface }]}
                  >
                    <Text style={[styles.chipText, { color: active ? theme.onAccent || '#000' : theme.text }]}>{c}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Songs on this device */}
        {localPermission === 'granted' ? (
          localTracks.length > 0 ? (
            <>
              <FadeIn delay={100}>
                <SectionHeader title="On This Device" onSeeAll={() => router.push('/library')} />
                <SongRow data={localPreview} />
              </FadeIn>
            </>
          ) : localScanning ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />
          ) : null
        ) : localPermission !== 'unavailable' ? (
          <FadeIn delay={150}>
          <PressableScale
            style={[styles.promptCard, { backgroundColor: theme.surface }]}
            scaleTo={0.97}
            onPress={requestLocalMusic}
          >
            <Ionicons name="folder-open-outline" size={26} color={theme.accent} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.promptTitle, { color: theme.text }]}>Play songs on this device</Text>
              <Text style={{ color: theme.secondaryText, fontSize: 12, marginTop: 2 }}>
                {localPermission === 'denied' ? 'Allow music access in your phone settings' : 'Allow access to your music files'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.secondaryText} />
          </PressableScale>
          </FadeIn>
        ) : null}

        {/* Recently played */}
        {recent.length > 0 && (
          <>
            <FadeIn delay={200}>
              <SectionHeader title="Recently Played" />
              <SongRow data={recent} />
            </FadeIn>
          </>
        )}

        {/* Popular */}
        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />
        ) : popular.length > 0 ? (
          <>
            <FadeIn delay={300}>
              <SectionHeader title="Popular Songs" onSeeAll={() => router.push('/search')} />
              <SongRow data={popular} />
            </FadeIn>
          </>
        ) : category !== 'All' ? (
          <Text style={{ color: theme.secondaryText, paddingHorizontal: 20, paddingVertical: 30 }}>
            No songs in {category} yet.
          </Text>
        ) : null}

        {/* Collections */}
        {collections.length > 0 && (
          <FadeIn delay={400}>
            <SectionHeader title="New Collection" />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={collections}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <PressableScale
                  style={[styles.collection, { backgroundColor: theme.surface }]}
                  scaleTo={0.96}
                  onPress={() =>
                    router.push({
                      pathname: '/detail',
                      params: { type: 'collection', id: item.id, title: item.title, artwork: item.artwork || '', artist: item.subtitle },
                    })
                  }
                >
                  {!!item.artwork && <Image source={{ uri: item.artwork }} style={styles.collectionImage} />}
                  <LinearGradient
                    colors={[theme.surface, theme.surface + 'cc', 'transparent']}
                    locations={[0, 0.45, 0.8]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.collectionText}>
                    <Text style={[styles.collectionTitle, { color: theme.text }]} numberOfLines={2}>{twoLines(item.title)}</Text>
                    <Text style={[styles.collectionSub, { color: theme.secondaryText }]}>{item.subtitle}</Text>
                    <Ionicons name="arrow-forward" size={20} color={theme.accent} style={{ marginTop: 'auto' }} />
                  </View>
                </PressableScale>
              )}
            />
          </FadeIn>
        )}

        {nothingYet && localPermission === 'granted' && !localScanning && (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={48} color={theme.secondaryText} />
            <Text style={{ color: theme.secondaryText, marginTop: 10, textAlign: 'center' }}>
              No music found yet. Add songs to your phone or connect Spotify in Settings.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const CARD_W = width * 0.36;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 18,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 26,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 13,
    marginRight: 2,
  },
  chips: {
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hList: {
    paddingLeft: 20,
    paddingRight: 6,
  },
  songCard: {
    width: CARD_W,
    marginRight: 14,
  },
  songImage: {
    width: CARD_W,
    height: CARD_W * 1.2,
    borderRadius: 18,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  songBar: {
    width: 2,
    height: 28,
    borderRadius: 1,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  songArtist: {
    fontSize: 11,
    marginTop: 2,
  },
  collection: {
    width: width * 0.62,
    height: 150,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 14,
  },
  collectionImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
  },
  collectionText: {
    flex: 1,
    padding: 16,
  },
  collectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26,
  },
  collectionSub: {
    fontSize: 12,
    marginTop: 4,
  },
});
