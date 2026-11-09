import React, { useCallback, useState } from 'react';
import {FlatList, Pressable, ScrollView, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import { GENRES, SORT_OPTIONS, STATUSES, STATUS_SHORT } from '../constants/options';
import { getBooks, getStatusCounts, toggleFavourite } from '../database/databaseServices';
import { useFocusData } from '../utils/hooks';
import { useToast } from '../context/ToastContext';
import { BookGridCard, BookListRow } from '../components/BookCards';
import { FilterChip } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import LoadingView from '../components/LoadingView';
import { Page } from '../components/ScreenScroll';
import ScreenHeader, { IconButton } from '../components/ScreenHeader';
import { runImportWithSummary } from '../utils/bookFiles';
import SearchBar from '../components/SearchBar';
import { t, tp } from '../i18n';

export default function BookshelfScreen({ navigation, route }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState(null);
  const [status, setStatus] = useState(null);
  const [sort, setSort] = useState('recent');
  const [layout, setLayout] = useState('grid');

  const { data, loading, error, reload } = useFocusData(
    async () => {
      const [books, counts] = await Promise.all([getBooks({ search, genre, status, sort }), getStatusCounts()]);
      return { books, counts };
    },
    [search, genre, status, sort]
  );

  const openBook = useCallback((book) => navigation.navigate('BookDetails', { bookId: book.id }), [navigation]);

  const onToggleFavourite = useCallback(
    async (book) => {
      try {
        const nowFav = await toggleFavourite(book.id);
        showToast(nowFav ? 'Added to favourites' : 'Removed from favourites');
        reload();
      } catch (e) {
        showToast(t('Could not update favourite.'), 'error');
      }
    },
    [reload, showToast]
  );

  const handleImport = async () => {
    const r = await runImportWithSummary(showToast);
    if (r) reload();
  };

  const clearFilters = () => {
    setSearch('');
    setGenre(null);
    setStatus(null);
  };

  const books = data?.books || [];
  const counts = data?.counts || { all: 0 };
  const filtersActive = !!(search || genre || status);

  const header = (
    <View>
      <ScreenHeader
        eyebrow={t('PERSONAL BOOKSHELF')}
        title={t('My Bookshelf')}
        subtitle={t('{n} volumes in your private library', { n: counts.all || 0 })}
        right={<IconButton icon="file-upload-outline" onPress={handleImport} label={t('Import books from file')} />}
      />
      <View style={styles.controls}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Search by title or author…')} />

        <View style={styles.sortRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }} style={{ flex: 1 }}>
            <MaterialCommunityIcons name="sort" size={18} color={colors.textSoft} />
            {SORT_OPTIONS.map((o) => (
              <FilterChip key={o.key} label={o.label} active={sort === o.key} onPress={() => setSort(o.key)} />
            ))}
          </ScrollView>
          <View style={styles.layoutToggle}>
            <Pressable onPress={() => setLayout('grid')} accessibilityLabel="Grid layout" style={[styles.toggleBtn, layout === 'grid' && styles.toggleActive]}>
              <MaterialCommunityIcons name="view-grid-outline" size={19} color={layout === 'grid' ? colors.white : colors.primaryText} />
            </Pressable>
            <Pressable onPress={() => setLayout('list')} accessibilityLabel="List layout" style={[styles.toggleBtn, layout === 'list' && styles.toggleActive]}>
              <MaterialCommunityIcons name="view-agenda-outline" size={19} color={layout === 'list' ? colors.white : colors.primaryText} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label={t('All')} count={counts.all} active={!status} onPress={() => setStatus(null)} />
          {STATUSES.map((s) => (
            <FilterChip key={s} label={STATUS_SHORT[s]} count={counts[s] || 0} active={status === s} onPress={() => setStatus(status === s ? null : s)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label={t('All genres')} active={!genre} onPress={() => setGenre(null)} />
          {GENRES.map((g) => (
            <FilterChip key={g} label={g} active={genre === g} onPress={() => setGenre(genre === g ? null : g)} />
          ))}
        </ScrollView>

        <View style={styles.resultRow}>
          <Text style={type.small}>{tp(books.length, '{n} book shown', '{n} books shown')}</Text>
          {filtersActive ? (
            <Pressable onPress={clearFilters} hitSlop={8}>
              <Text style={styles.clear}>{t('Clear filters')}</Text>
            </Pressable>
          ) : null}
        </View>
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      </View>
    </View>
  );

  if (loading && !data) return <LoadingView />;

  return (
    <Page>
      <FlatList
        key={layout}
        data={books}
        keyExtractor={(b) => String(b.id)}
        numColumns={layout === 'grid' ? 2 : 1}
        columnWrapperStyle={layout === 'grid' ? { gap: 12, paddingHorizontal: 20 } : undefined}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon={filtersActive ? 'book-search-outline' : 'bookshelf'}
            title={filtersActive ? 'No books match' : 'Your shelf is waiting'}
            message={filtersActive ? 'Try a different search, genre or status.' : 'Add your first book and begin your collection.'}
            actionLabel={filtersActive ? 'Clear filters' : 'Add a book'}
            onAction={filtersActive ? clearFilters : () => navigation.navigate('AddEditBook')}
          />
        }
        renderItem={({ item }) =>
          layout === 'grid' ? (
            <BookGridCard book={item} onPress={openBook} onToggleFavourite={onToggleFavourite} />
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              <BookListRow book={item} onPress={openBook} onToggleFavourite={onToggleFavourite} />
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 150 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews={false}
      />
      <Pressable
        onPress={() => navigation.navigate('AddEditBook')}
        accessibilityRole="button"
        accessibilityLabel="Add a new book"
        style={[styles.fab, { bottom: 20 }]}
      >
        <MaterialCommunityIcons name="plus" size={22} color={colors.onGold} />
        <Text style={styles.fabText}>{t('Add Book')}</Text>
      </Pressable>
    </Page>
  );
}

const styles = themedStyles(() => ({
  controls: { paddingHorizontal: 20, gap: 12, paddingBottom: 12 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  layoutToggle: { flexDirection: 'row', backgroundColor: colors.segmentBg, borderRadius: radius.md, padding: 3, gap: 2 },
  toggleBtn: { width: 36, height: 34, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: colors.primary },
  chipRow: { gap: 8, paddingRight: 20 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clear: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.ochre },
  fab: {
    position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 20,
    borderRadius: 26, backgroundColor: colors.gold, ...shadows.lifted,
  },
  fabText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onGold },
}));
