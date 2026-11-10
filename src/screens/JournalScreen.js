import React, { useCallback, useEffect, useRef, useState } from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import { MOODS } from '../constants/options';
import {
  createJournalEntry, deleteJournalEntry, getBooksLite, getJournalEntries, getJournalStats, updateJournalEntry,
} from '../database/databaseServices';
import { useFocusData } from '../utils/hooks';
import { formatDate, relativeDay, todayISO } from '../utils/dates';
import { validateJournal } from '../utils/validation';
import { confirmDelete } from '../utils/confirm';
import { useToast } from '../context/ToastContext';
import BookCover from '../components/BookCover';
import Button from '../components/Button';
import { FilterChip, Tag } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import FormModal from '../components/FormModal';
import { BookSelectField, DateField, SelectChips, TextField } from '../components/FormFields';
import LoadingView from '../components/LoadingView';
import { Page } from '../components/ScreenScroll';
import ScreenHeader from '../components/ScreenHeader';
import SearchBar from '../components/SearchBar';
import { t } from '../i18n';

const blankForm = (bookId = null) => ({
  title: t(''),
  book_id: bookId,
  entry_date: todayISO(),
  mood: '',
  thoughts: '',
  favourite_characters: '',
  memorable_scenes: '',
  feelings: '',
  reflections: '',
});

export default function JournalScreen({ navigation, route }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [bookFilter, setBookFilter] = useState(null);
  const [order, setOrder] = useState('newest');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useFocusData(
    async () => {
      const [entries, all, stats, books] = await Promise.all([
        getJournalEntries({ search, bookId: bookFilter, order }),
        getJournalEntries({}),
        getJournalStats(),
        getBooksLite(),
      ]);
      const linked = [];
      all.forEach((e) => {
        if (e.book_id && !linked.find((b) => b.id === e.book_id)) linked.push({ id: e.book_id, title: e.book_title });
      });
      return { entries, stats, books, linked };
    },
    [search, bookFilter, order]
  );

  const books = data?.books || [];

  const openNew = useCallback((bookId = null) => {
    setForm(blankForm(bookId));
    setErrors({});
    setEditingId(null);
    setFormOpen(true);
  }, []);

  const handled = useRef(null);
  useEffect(() => {
    const stamp = route.params?.stamp;
    if (route.params?.openNew && stamp && handled.current !== stamp) {
      handled.current = stamp;
      openNew(route.params.bookId || null);
    }
  }, [route.params?.stamp, route.params?.openNew, route.params?.bookId, openNew]);

  const openEdit = (e) => {
    setForm({
      title: e.title, book_id: e.book_id, entry_date: e.entry_date, mood: e.mood || '', thoughts: e.thoughts,
      favourite_characters: e.favourite_characters, memorable_scenes: e.memorable_scenes, feelings: e.feelings, reflections: e.reflections,
    });
    setErrors({});
    setEditingId(e.id);
    setFormOpen(true);
  };

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSave = async () => {
    const found = validateJournal(form);
    setErrors(found);
    if (Object.keys(found).length) return showToast(t('Please fix the highlighted fields.'), 'error');
    setSaving(true);
    try {
      if (editingId) await updateJournalEntry(editingId, form);
      else await createJournalEntry(form);
      showToast(editingId ? 'Entry updated' : 'Journal entry saved');
      setFormOpen(false);
      await reload();
    } catch (e) {
      showToast(e.message || 'Could not save the entry.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) =>
    confirmDelete({
      title: t('Delete this entry?'),
      message: t('This reflection will be permanently removed.'),
      onConfirm: async () => {
        try {
          await deleteJournalEntry(id);
          showToast(t('Entry deleted'));
          setFormOpen(false);
          reload();
        } catch (e) {
          showToast(t('Could not delete the entry.'), 'error');
        }
      },
    });

  if (loading && !data) return <LoadingView />;

  const entries = data?.entries || [];
  const stats = data?.stats || { entries: 0, books: 0, topMood: '—' };
  const filtersActive = !!(search || bookFilter);

  return (
    <Page>
      <ScreenHeader
        eyebrow={t('MARGINALIA ARCHIVE')}
        title={t('Literary Journal')}
        subtitle={t('Quiet reflections, character whispers & resonant scenes.')}
        right={<Button title={t('New')} icon="feather" small onPress={() => openNew()} />}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 6 }} keyboardShouldPersistTaps="handled">
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Search thoughts, books, characters…')} />

        <View style={styles.statRow}>
          <View style={styles.stat}><Text style={styles.statVal}>{stats.entries}</Text><Text style={type.label}>{t('Reflections')}</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{stats.books}</Text><Text style={type.label}>{t('Books linked')}</Text></View>
          <View style={styles.stat}><Text style={[styles.statVal, { fontSize: 16, lineHeight: 28 }]} numberOfLines={1}>{stats.topMood}</Text><Text style={type.label}>{t('Dominant mood')}</Text></View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 14 }}>
          <FilterChip label={t('All entries')} active={!bookFilter} onPress={() => setBookFilter(null)} />
          {data?.linked.map((b) => (
            <FilterChip key={b.id} label={b.title.length > 22 ? `${b.title.slice(0, 21)}…` : b.title} active={bookFilter === b.id} onPress={() => setBookFilter(bookFilter === b.id ? null : b.id)} />
          ))}
        </ScrollView>

        <View style={styles.orderRow}>
          <Text style={type.small}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <FilterChip label={t('Newest first')} active={order === 'newest'} onPress={() => setOrder('newest')} icon="sort-calendar-descending" />
            <FilterChip label={t('Oldest first')} active={order === 'oldest'} onPress={() => setOrder('oldest')} icon="sort-calendar-ascending" />
          </View>
        </View>

        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

        {entries.length === 0 ? (
          <EmptyState
            icon="feather"
            title={filtersActive ? 'No entries match' : 'Your journal awaits'}
            message={filtersActive ? 'Try another search or book.' : 'Write your first reflection and keep the feeling of a story forever.'}
            actionLabel={filtersActive ? 'Clear filters' : 'Write an entry'}
            onAction={filtersActive ? () => { setSearch(''); setBookFilter(null); } : () => openNew()}
          />
        ) : (
          entries.map((e) => (
            <Pressable key={e.id} onPress={() => openEdit(e)} style={styles.entry} accessibilityRole="button" accessibilityLabel={`Edit entry ${e.title}`}>
              <View style={styles.entryStripe} />
              <View style={styles.entryHead}>
                {e.book_id ? (
                  <>
                    <BookCover book={{ title: e.book_title, author: e.book_author, cover_uri: e.cover_uri, cover_color: e.cover_color }} width={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryBook} numberOfLines={1}>{e.book_title}</Text>
                      <Text style={type.small} numberOfLines={1}>{e.book_author} · {t(e.book_genre)}</Text>
                    </View>
                  </>
                ) : (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="notebook-outline" size={22} color={colors.primarySoft} />
                    <Text style={styles.entryBook}>{t('General reflection')}</Text>
                  </View>
                )}
                {e.mood ? <Tag label={e.mood} tone="gold" /> : null}
              </View>
              <View style={styles.dateRow}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={colors.textSoft} />
                <Text style={type.small}>{relativeDay(e.entry_date)}{relativeDay(e.entry_date) !== formatDate(e.entry_date) ? ` · ${formatDate(e.entry_date)}` : ''}</Text>
              </View>
              <Text style={styles.entryTitle}>{e.title}</Text>
              {e.memorable_scenes ? (
                <View style={styles.sceneBlock}>
                  <Text style={styles.sceneLabel}>{t('MEMORABLE SCENE')}</Text>
                  <Text style={styles.sceneText} numberOfLines={3}>“{e.memorable_scenes}”</Text>
                </View>
              ) : null}
              <Text style={styles.thoughts} numberOfLines={5}>{e.thoughts}</Text>
              {e.reflections ? <Text style={styles.reflection} numberOfLines={3}>{e.reflections}</Text> : null}
              {e.favourite_characters ? (
                <View style={styles.chars}>
                  <Text style={styles.charLabel}>{t('Favourite characters')}</Text>
                  {e.favourite_characters.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 4).map((c) => (
                    <Tag key={c} label={c} tone="plain" />
                  ))}
                </View>
              ) : null}
              <View style={styles.entryActions}>
                <Pressable onPress={() => openEdit(e)} hitSlop={8} style={styles.act}><MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primaryText} /><Text style={styles.actText}>{t('Edit')}</Text></Pressable>
                <Pressable onPress={() => handleDelete(e.id)} hitSlop={8} style={styles.act}><MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} /><Text style={[styles.actText, { color: colors.danger }]}>{t('Delete')}</Text></Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <FormModal
        visible={formOpen}
        title={editingId ? 'Edit Entry' : 'New Journal Entry'}
        subtitle={t('Ink on ivory')}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        saving={saving}
        saveLabel={editingId ? 'Save changes' : 'Save entry'}
        onDelete={editingId ? () => handleDelete(editingId) : undefined}
      >
        <TextField label={t('Journal title')} required value={form.title} onChangeText={set('title')} error={errors.title} placeholder={t('e.g. The Silence of the Observatory')} />
        <BookSelectField label={t('Related book')} books={books} value={form.book_id} onChange={(b) => set('book_id')(b?.id ?? null)} allowNone placeholder={t('Choose a book (optional)')} />
        <DateField label={t('Journal date')} required value={form.entry_date} onChange={set('entry_date')} error={errors.entry_date} />
        <SelectChips label={t('Mood')} options={MOODS} value={form.mood} onChange={set('mood')} allowClear />
        <TextField label={t('Personal thoughts')} required multiline minHeight={120} value={form.thoughts} onChangeText={set('thoughts')} error={errors.thoughts} placeholder={t('What is on your mind about this story?')} />
        <TextField label={t('Favourite characters')} value={form.favourite_characters} onChangeText={set('favourite_characters')} placeholder={t('Separate with commas')} />
        <TextField label={t('Memorable scenes')} multiline value={form.memorable_scenes} onChangeText={set('memorable_scenes')} placeholder={t('A scene you won\'t forget…')} />
        <TextField label={t('Feelings and emotions')} value={form.feelings} onChangeText={set('feelings')} placeholder={t('Awestruck, tender, restless…')} />
        <TextField label={t('Personal reflections')} multiline value={form.reflections} onChangeText={set('reflections')} placeholder={t('What did this book leave with you?')} />
      </FormModal>
    </Page>
  );
}

const styles = themedStyles(() => ({
  statRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 2 },
  statVal: { fontFamily: fonts.serif, fontSize: 24, color: colors.text },
  orderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 12 },
  entry: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, paddingLeft: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 14, overflow: 'hidden', ...shadows.card },
  entryStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: colors.ochre },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryBook: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  entryTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 29, color: colors.text, marginTop: 4 },
  sceneBlock: { backgroundColor: colors.parchment, borderLeftWidth: 3, borderLeftColor: colors.ochre, padding: 12, marginTop: 12, borderRadius: radius.sm },
  sceneLabel: { fontFamily: fonts.sansBold, fontSize: 9.5, letterSpacing: 1.1, color: colors.ochre },
  sceneText: { fontFamily: fonts.serifItalic, fontSize: 16.5, lineHeight: 26, color: colors.text, marginTop: 4 },
  thoughts: { fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 24, color: colors.text, marginTop: 12 },
  reflection: { fontFamily: fonts.serifItalic, fontSize: 14.5, lineHeight: 23, color: colors.textSoft, marginTop: 10 },
  chars: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 },
  charLabel: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 0.6, color: colors.textSoft, textTransform: 'uppercase' },
  entryActions: { flexDirection: 'row', gap: 20, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.primaryText },
}));
