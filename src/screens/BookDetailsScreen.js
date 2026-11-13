import React, { useEffect, useState } from 'react';
import {Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import { STATUS, STATUSES, STATUS_SHORT } from '../constants/options';
import {
  deleteBook, getBookById, getJournalEntries, getQuotes, getReviews, getSessions, setBookFile, setBookProgress, toggleFavourite,
  updateBook,
} from '../database/databaseServices';
import { useFocusData } from '../utils/hooks';
import { formatDate, relativeDay } from '../utils/dates';
import { formatMinutes, percent, truncate } from '../utils/format';
import { confirmDelete } from '../utils/confirm';
import { isNonNegativeInt } from '../utils/validation';
import { useToast } from '../context/ToastContext';
import BookCover from '../components/BookCover';
import BookFileCard from '../components/BookFileCard';
import Button from '../components/Button';
import { openBookFile, pickBookFile, removeStoredFile, storeBookFile, storedFileExists } from '../utils/bookFiles';
import { FilterChip, StatusBadge, Tag } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import LoadingView from '../components/LoadingView';
import ProgressBar from '../components/ProgressBar';
import { Page } from '../components/ScreenScroll';
import ScreenHeader, { IconButton } from '../components/ScreenHeader';
import StarRating from '../components/StarRating';
import { t } from '../i18n';

function ActionTile({ icon, title, subtitle, onPress, tone }) {
  const bg = tone === 'gold' ? colors.goldSoft : tone === 'rose' ? colors.roseSoft : colors.surfaceTint;
  const fg = tone === 'gold' ? colors.ochre : tone === 'rose' ? colors.terracotta : colors.primaryText;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
      <View style={[styles.tileIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tileTitle}>{t(title)}</Text>
        <Text style={type.small} numberOfLines={1}>{t(subtitle)}</Text>
      </View>
    </Pressable>
  );
}

export default function BookDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { bookId } = route.params;
  const [tab, setTab] = useState('sessions');
  const [pageInput, setPageInput] = useState('');
  const [savingPage, setSavingPage] = useState(false);

  const { data, loading, error, reload } = useFocusData(async () => {
    const book = await getBookById(bookId);
    if (!book) return { book: null };
    const [sessions, journal, quotes, reviews] = await Promise.all([
      getSessions({ bookId }),
      getJournalEntries({ bookId }),
      getQuotes({ bookId }),
      getReviews({ bookId }),
    ]);
    return { book, sessions, journal, quotes, reviews };
  }, [bookId]);

  const book = data?.book;

  useEffect(() => {
    if (book) setPageInput(String(book.current_page));
  }, [book?.current_page, book?.id]);

  if (loading && !data) return <LoadingView label={t('Opening the book…')} />;
  if (!book) {
    return (
      <Page>
        <ScreenHeader onBack={() => navigation.goBack()} title={t('Book not found')} />
        <EmptyState icon="book-remove-outline" title={t('This book is no longer on your shelf')} message={error || 'It may have been deleted.'} actionLabel={t('Go back')} onAction={() => navigation.goBack()} />
      </Page>
    );
  }

  const pct = percent(book.current_page, book.total_pages);
  const remaining = Math.max(0, book.total_pages - book.current_page);
  const totalMinutes = (data.sessions || []).reduce((s, x) => s + x.duration_minutes, 0);
  const totalPagesLogged = (data.sessions || []).reduce((s, x) => s + x.pages_read, 0);
  const pace = totalMinutes > 0 ? Math.round((totalPagesLogged / totalMinutes) * 60) : 0;
  const estHours = pace > 0 ? (remaining / pace) : 0;

  const handleFavourite = async () => {
    try {
      const fav = await toggleFavourite(book.id);
      showToast(fav ? 'Added to favourites' : 'Removed from favourites');
      reload();
    } catch (e) {
      showToast(t('Could not update favourite.'), 'error');
    }
  };

  const handleDelete = () =>
    confirmDelete({
      title: t('Delete “{title}”?', { title: truncate(book.title, 30) }),
      message: t('Its reading sessions, quotes and reviews will be removed too. Journal entries are kept. This cannot be undone.'),
      onConfirm: async () => {
        try {
          await deleteBook(book.id);
          removeStoredFile(book.file_path);
          showToast(t('Book deleted'));
          navigation.goBack();
        } catch (e) {
          showToast(t('Could not delete the book.'), 'error');
        }
      },
    });

  const attachFile = async () => {
    try {
      const picked = await pickBookFile();
      if (!picked) return;
      const info = await storeBookFile(picked, book.id);
      await setBookFile(book.id, info);
      if (book.file_path) removeStoredFile(book.file_path);
      showToast(t('Book file uploaded'));
      reload();
    } catch (e) {
      showToast(e.message || t('Could not upload that file.'), 'error');
    }
  };

  const openFile = async () => {
    try {
      await openBookFile(book);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const removeFile = () =>
    confirmDelete({
      title: t('Remove the uploaded file?'),
      message: t('The file is deleted from PAGEORIA. The book and your notes stay.'),
      confirmLabel: t('Remove'),
      onConfirm: async () => {
        try {
          await setBookFile(book.id, null);
          removeStoredFile(book.file_path);
          showToast(t('File removed'));
          reload();
        } catch (e) {
          showToast(t('Could not remove the file.'), 'error');
        }
      },
    });

  const savePage = async (value) => {
    const raw = String(value ?? pageInput).trim();
    if (!isNonNegativeInt(raw)) return showToast(t('Enter a whole page number.'), 'error');
    if (Number(raw) > book.total_pages) return showToast(t('This book has only {n} pages.', { n: book.total_pages }), 'error');
    setSavingPage(true);
    try {
      await setBookProgress(book.id, Number(raw));
      showToast(Number(raw) >= book.total_pages ? 'Finished! Book marked as completed.' : 'Reading progress updated');
      await reload();
    } catch (e) {
      showToast(e.message || 'Could not update progress.', 'error');
    } finally {
      setSavingPage(false);
    }
  };

  const nudge = (delta) => {
    const base = isNonNegativeInt(pageInput) ? Number(pageInput) : book.current_page;
    setPageInput(String(Math.max(0, Math.min(book.total_pages, base + delta))));
  };

  const changeStatus = async (status) => {
    if (status === book.status) return;
    try {
      await updateBook(book.id, { ...book, status, total_pages: book.total_pages, current_page: book.current_page });
      showToast(t('Marked as {status}', { status: t(STATUS_SHORT[status]) }));
      reload();
    } catch (e) {
      showToast(t('Could not change status.'), 'error');
    }
  };

  const toTab = (name, params) => navigation.navigate('Tabs', { screen: name, params });

  const tabs = [
    { key: 'sessions', label: 'Sessions', count: data.sessions.length },
    { key: 'journal', label: 'Journal', count: data.journal.length },
    { key: 'quotes', label: 'Quotes', count: data.quotes.length },
    { key: 'reviews', label: 'Reviews', count: data.reviews.length },
  ];

  return (
    <Page>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        backLabel={t('Shelf')}
        title=""
        right={
          <>
            <IconButton icon={book.is_favourite ? 'heart' : 'heart-outline'} color={colors.terracotta} active={!!book.is_favourite} onPress={handleFavourite} label={t('Toggle favourite')} />
            <IconButton icon="pencil-outline" onPress={() => navigation.navigate('AddEditBook', { bookId: book.id })} label={t('Edit book')} />
            <IconButton icon="trash-can-outline" color={colors.danger} onPress={handleDelete} label={t('Delete book')} />
          </>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <BookCover book={book} width={150} />
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
          <View style={styles.chipRow}>
            <Tag label={book.genre} icon="book-open-variant" />
            <StatusBadge status={book.status} />
          </View>
          <View style={styles.ratingPill}>
            <StarRating value={book.rating} size={16} gap={1} />
            <Text style={styles.ratingText}>{book.rating > 0 ? Number(book.rating).toFixed(1) : t('Not rated yet')}</Text>
          </View>
        </View>

        <View style={styles.pad}>
          {/* Journey / progress */}
          <View style={styles.card}>
            <View style={styles.journeyTop}>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{t('Reading Journey')}</Text>
                <Text style={type.small}>{t('Current leaf & pacing')}</Text>
              </View>
              <Text style={styles.bigPct}>{pct}%</Text>
            </View>
            <ProgressBar value={pct} height={8} style={{ marginTop: 12 }} />
            <Text style={[type.small, { marginTop: 10 }]}>
              {remaining > 0 ? t('{n} pages remaining', { n: remaining }) : t('All pages read')}
              {pace > 0 && remaining > 0 ? ` · ${t('≈ {time} left at {pace} p/h', { time: estHours < 1 ? t('{n} min', { n: Math.round(estHours * 60) }) : t('{n} hrs', { n: estHours.toFixed(1) }), pace })}` : ''}
            </Text>

            <View style={styles.calibrator}>
              <Text style={styles.calTitle}>{t('Update reading progress')}</Text>
              <View style={styles.calRow}>
                <Pressable onPress={() => nudge(-10)} style={styles.calBtn} accessibilityLabel="Minus ten pages"><Text style={styles.calBtnText}>−10</Text></Pressable>
                <View style={styles.calInputWrap}>
                  <Text style={styles.calPrefix}>{t('Page')}</Text>
                  <TextInput
                    value={pageInput}
                    onChangeText={setPageInput}
                    keyboardType="number-pad"
                    style={styles.calInput}
                    accessibilityLabel="Current page"
                    maxLength={5}
                  />
                  <Text style={styles.calPrefix}>/ {book.total_pages}</Text>
                </View>
                <Pressable onPress={() => nudge(10)} style={styles.calBtn} accessibilityLabel="Plus ten pages"><Text style={styles.calBtnText}>+10</Text></Pressable>
                <Pressable onPress={() => savePage()} style={[styles.calBtn, styles.calSave]} accessibilityLabel="Save progress" disabled={savingPage}>
                  <MaterialCommunityIcons name="check" size={22} color={colors.white} />
                </Pressable>
              </View>
            </View>

            <Text style={[styles.calTitle, { marginTop: 16 }]}>{t('Reading status')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
              {STATUSES.map((s) => (
                <FilterChip key={s} label={STATUS_SHORT[s]} active={book.status === s} onPress={() => changeStatus(s)} />
              ))}
            </ScrollView>
          </View>

          {/* Quick actions */}
          <View style={styles.tileGrid}>
            <ActionTile icon="timer-outline" title={t('Log Session')} subtitle={t('Record pages & time')} onPress={() => navigation.navigate('ReadingTracker', { bookId: book.id, openForm: true, stamp: Date.now() })} />
            <ActionTile icon="feather" title={t('Journal')} subtitle={t('Write a reflection')} tone="gold" onPress={() => toTab('Journal', { openNew: true, bookId: book.id, stamp: Date.now() })} />
          </View>
          <View style={styles.tileGrid}>
            <ActionTile icon="format-quote-close" title={t('Save Quote')} subtitle={t('Add a memorable line')} tone="gold" onPress={() => navigation.navigate('QuotesReviews', { initialTab: 'quotes', bookId: book.id, openForm: 'quote', stamp: Date.now() })} />
            <ActionTile icon="star-circle-outline" title={t('Write Review')} subtitle={t('Rate & reflect')} tone="rose" onPress={() => navigation.navigate('QuotesReviews', { initialTab: 'reviews', bookId: book.id, openForm: 'review', stamp: Date.now() })} />
          </View>

          {/* Uploaded book file */}
          <View style={{ marginBottom: 14 }}>
            <Text style={[type.h3, { marginBottom: 10 }]}>{t('Your copy')}</Text>
            {book.file_path ? (
              <BookFileCard
                name={book.file_name}
                size={book.file_size}
                missing={!storedFileExists(book.file_path)}
                onOpen={openFile}
                onReplace={attachFile}
                onRemove={removeFile}
              />
            ) : (
              <View style={styles.uploadBox}>
                <Text style={type.bodySoft}>{t('Keep a PDF, EPUB or text copy of this book inside PAGEORIA and open it any time, offline.')}</Text>
                <Button title="Upload book file" icon="file-upload-outline" variant="secondary" onPress={attachFile} />
              </View>
            )}
          </View>

          {/* About */}
          <View style={[styles.card, { marginTop: 4 }]}>
            <Text style={type.h3}>{t('About this book')}</Text>
            <Text style={[type.body, { marginTop: 8 }]}>{book.description || t('No description yet. Tap edit to add one.')}</Text>
            <View style={styles.infoGrid}>
              <Info label={t('Total pages')} value={String(book.total_pages)} />
              <Info label={t('Current page')} value={String(book.current_page)} />
              <Info label={t('Date added')} value={formatDate(book.date_added)} />
              <Info label={book.date_completed ? 'Completed' : 'Status'} value={book.date_completed ? formatDate(book.date_completed) : STATUS_SHORT[book.status]} />
            </View>
          </View>

          {/* Related records */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 18, marginBottom: 12 }}>
            {tabs.map((tb) => (
              <FilterChip key={tb.key} label={tb.label} count={tb.count} active={tab === tb.key} onPress={() => setTab(tb.key)} />
            ))}
          </ScrollView>

          {tab === 'sessions' && (
            data.sessions.length === 0 ? (
              <EmptyState icon="timer-sand" title={t('No sessions yet')} message={t('Log your first reading session for this book.')} actionLabel={t('Log a session')} onAction={() => navigation.navigate('ReadingTracker', { bookId: book.id, openForm: true, stamp: Date.now() })} />
            ) : (
              data.sessions.slice(0, 8).map((s) => (
                <View key={s.id} style={styles.listItem}>
                  <View style={styles.listIcon}><MaterialCommunityIcons name="clock-outline" size={20} color={colors.primarySoft} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={type.title}>{relativeDay(s.session_date)}</Text>
                      <Tag label={formatMinutes(s.duration_minutes)} tone="plain" />
                    </View>
                    <Text style={type.bodySoft}>{t('p. {a} → p. {b} (+{n} pages)', { a: s.start_page, b: s.end_page, n: s.pages_read })}</Text>
                    {s.notes ? <Text style={styles.noteItalic}>“{truncate(s.notes, 110)}”</Text> : null}
                  </View>
                </View>
              ))
            )
          )}
          {tab === 'journal' && (
            data.journal.length === 0 ? (
              <EmptyState icon="feather" title={t('No journal entries')} message={t('Capture your thoughts about this book.')} actionLabel={t('Write an entry')} onAction={() => toTab('Journal', { openNew: true, bookId: book.id, stamp: Date.now() })} />
            ) : (
              data.journal.map((j) => (
                <View key={j.id} style={styles.listItem}>
                  <View style={styles.listIcon}><MaterialCommunityIcons name="notebook-edit-outline" size={20} color={colors.ochre} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.title}>{j.title}</Text>
                    <Text style={type.small}>{formatDate(j.entry_date)}{j.mood ? ` · ${j.mood}` : ''}</Text>
                    <Text style={[type.bodySoft, { marginTop: 4 }]} numberOfLines={3}>{j.thoughts}</Text>
                  </View>
                </View>
              ))
            )
          )}
          {tab === 'quotes' && (
            data.quotes.length === 0 ? (
              <EmptyState icon="format-quote-close" title={t('No quotes saved')} message={t('Keep the lines that stay with you.')} actionLabel={t('Save a quote')} onAction={() => navigation.navigate('QuotesReviews', { initialTab: 'quotes', bookId: book.id, openForm: 'quote', stamp: Date.now() })} />
            ) : (
              data.quotes.map((q) => (
                <View key={q.id} style={styles.quoteItem}>
                  <Text style={styles.quoteText}>“{q.quote_text}”</Text>
                  <Text style={type.small}>{q.page_number ? `p. ${q.page_number} · ` : ''}{formatDate(q.date_saved)}</Text>
                </View>
              ))
            )
          )}
          {tab === 'reviews' && (
            data.reviews.length === 0 ? (
              <EmptyState icon="star-circle-outline" title={t('No reviews yet')} message={t('Share what you thought of this book.')} actionLabel={t('Write a review')} onAction={() => navigation.navigate('QuotesReviews', { initialTab: 'reviews', bookId: book.id, openForm: 'review', stamp: Date.now() })} />
            ) : (
              data.reviews.map((r) => (
                <View key={r.id} style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <StarRating value={r.rating} size={15} gap={1} />
                    <Text style={[type.title, { marginTop: 4 }]}>{r.title}</Text>
                    <Text style={[type.bodySoft, { marginTop: 2 }]} numberOfLines={4}>{r.body}</Text>
                    <Text style={[type.small, { marginTop: 4 }]}>{formatDate(r.date_reviewed)}</Text>
                  </View>
                </View>
              ))
            )
          )}
        </View>
      </ScrollView>

      <View style={[styles.resume, { bottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={() => navigation.navigate('ReadingTracker', { bookId: book.id, openForm: true, stamp: Date.now() })}
          style={styles.resumeBtn}
          accessibilityRole="button"
          accessibilityLabel="Resume reading"
        >
          <MaterialCommunityIcons name="book-open-page-variant-outline" size={22} color={colors.white} />
          <Text style={styles.resumeText}>
            {book.status === STATUS.COMPLETED ? t('Re-read · log a session') : book.current_page > 0 ? t('Resume Reading · p. {n}', { n: book.current_page }) : t('Begin Reading')}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={colors.gold} />
        </Pressable>
      </View>
    </Page>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.info}>
      <Text style={type.label}>{t(label)}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  hero: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 18 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 35, textAlign: 'center', color: colors.text, marginTop: 20 },
  author: { fontFamily: fonts.serifMedium, fontSize: 17, color: colors.ochre, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: colors.surface, paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  ratingText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.textSoft },
  pad: { paddingHorizontal: 20 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 14, ...shadows.card },
  journeyTop: { flexDirection: 'row', alignItems: 'center' },
  bigPct: { fontFamily: fonts.serif, fontSize: 30, color: colors.ochre },
  calibrator: { backgroundColor: colors.softBg, borderRadius: radius.md, padding: 12, marginTop: 14 },
  calTitle: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textSoft },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  calBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  calBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.primaryText },
  calSave: { backgroundColor: colors.primary, borderColor: colors.primary },
  calInputWrap: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10 },
  calPrefix: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.textSoft },
  calInput: { flex: 1, fontFamily: fonts.serif, fontSize: 20, color: colors.text, textAlign: 'center', paddingVertical: 0 },
  tileGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.text },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 12 },
  info: { width: '50%' },
  infoValue: { fontFamily: fonts.sansSemi, fontSize: 14.5, color: colors.text, marginTop: 2 },
  listItem: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  listIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  noteItalic: { fontFamily: fonts.serifItalic, fontSize: 13.5, lineHeight: 20, color: colors.goldInk, marginTop: 4 },
  quoteItem: { backgroundColor: colors.parchment, borderLeftWidth: 3, borderLeftColor: colors.ochre, padding: 14, borderRadius: radius.md, marginBottom: 10, gap: 6 },
  quoteText: { fontFamily: fonts.serifItalic, fontSize: 16.5, lineHeight: 26, color: colors.text },
  uploadBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', padding: 14, gap: 12 },
  resume: { position: 'absolute', left: 20, right: 20 },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: radius.lg, backgroundColor: colors.primary, ...shadows.lifted },
  resumeText: { fontFamily: fonts.sansSemi, fontSize: 15.5, color: colors.white },
}));
