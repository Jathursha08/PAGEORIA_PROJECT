import React, { useCallback, useEffect, useRef, useState } from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import {
  createSession, deleteSession, getBooksLite, getReadingStreak, getSessionTotals, getSessions, getWeeklyActivity,
  updateSession,
} from '../database/databaseServices';
import { useFocusData } from '../utils/hooks';
import { formatDate, relativeDay, startOfMonthISO, startOfWeekISO, todayISO } from '../utils/dates';
import { formatMinutes, formatNumber } from '../utils/format';
import { validateSession } from '../utils/validation';
import { confirmDelete } from '../utils/confirm';
import { useToast } from '../context/ToastContext';
import BarChart from '../components/BarChart';
import BookCover from '../components/BookCover';
import Button from '../components/Button';
import { FilterChip, Tag } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import FormModal from '../components/FormModal';
import { BookSelectField, DateField, TextField } from '../components/FormFields';
import LoadingView from '../components/LoadingView';
import { Page } from '../components/ScreenScroll';
import ScreenHeader from '../components/ScreenHeader';
import StatCard from '../components/StatCard';
import { t, tp } from '../i18n';

const blankForm = (book) => ({
  book_id: book?.id ?? null,
  session_date: todayISO(),
  start_page: book ? String(book.current_page) : '',
  end_page: '',
  duration_minutes: '',
  notes: '',
});

const pad2 = (n) => String(n).padStart(2, '0');

export default function ReadingTrackerScreen({ navigation, route }) {
  const { showToast } = useToast();
  const [period, setPeriod] = useState('all');
  const [visibleCount, setVisibleCount] = useState(15);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // optional stopwatch
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  const { data, loading, error, reload } = useFocusData(async () => {
    const [sessions, totals, week, streak, books] = await Promise.all([
      getSessions(),
      getSessionTotals(),
      getWeeklyActivity(),
      getReadingStreak(),
      getBooksLite(),
    ]);
    return { sessions, totals, week, streak, books };
  }, []);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  const books = data?.books || [];
  const selectedBook = books.find((b) => b.id === form.book_id) || null;

  const openNew = useCallback(
    (bookId, minutesFromTimer) => {
      const book = books.find((b) => b.id === bookId) || null;
      const f = blankForm(book);
      if (minutesFromTimer) f.duration_minutes = String(minutesFromTimer);
      setForm(f);
      setErrors({});
      setEditingId(null);
      setFormOpen(true);
    },
    [books]
  );

  // Opened from Home / Book Details with a book preselected
  const handled = useRef(null);
  useEffect(() => {
    const stamp = route.params?.stamp;
    if (route.params?.openForm && stamp && handled.current !== stamp && data) {
      handled.current = stamp;
      openNew(route.params.bookId);
    }
  }, [route.params?.stamp, route.params?.openForm, route.params?.bookId, data, openNew]);

  const openEdit = (s) => {
    setForm({
      book_id: s.book_id,
      session_date: s.session_date,
      start_page: String(s.start_page),
      end_page: String(s.end_page),
      duration_minutes: String(s.duration_minutes),
      notes: s.notes || '',
    });
    setErrors({});
    setEditingId(s.id);
    setFormOpen(true);
  };

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const pickBook = (book) => {
    setForm((f) => ({
      ...f,
      book_id: book?.id ?? null,
      start_page: editingId ? f.start_page : book ? String(book.current_page) : '',
    }));
    setErrors((e) => ({ ...e, book_id: undefined }));
  };

  const handleSave = async () => {
    const found = validateSession(form, selectedBook);
    setErrors(found);
    if (Object.keys(found).length) return showToast(t('Please fix the highlighted fields.'), 'error');
    setSaving(true);
    try {
      if (editingId) await updateSession(editingId, form);
      else await createSession(form);
      showToast(editingId ? 'Session updated' : 'Reading session saved');
      setFormOpen(false);
      setSeconds(0);
      setRunning(false);
      await reload();
    } catch (e) {
      showToast(e.message || 'Could not save the session.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (s) =>
    confirmDelete({
      title: t('Delete this session?'),
      message: t('The pages and minutes will be removed from your totals. The book’s current page is not changed.'),
      onConfirm: async () => {
        try {
          await deleteSession(s.id);
          showToast(t('Session deleted'));
          if (editingId === s.id) setFormOpen(false);
          reload();
        } catch (e) {
          showToast(t('Could not delete the session.'), 'error');
        }
      },
    });

  if (loading && !data) return <LoadingView />;
  if (!data) return <Page><ScreenHeader title={t('Reading Tracker')} /><ErrorBanner message={error} onRetry={reload} /></Page>;

  const weekPages = data.week.reduce((s, d) => s + d.pages, 0);
  const weekMinutes = data.week.reduce((s, d) => s + d.minutes, 0);
  const today = data.week.find((d) => d.isToday);

  const since = period === 'week' ? startOfWeekISO() : period === 'month' ? startOfMonthISO() : null;
  const filtered = since ? data.sessions.filter((s) => s.session_date >= since) : data.sessions;
  const shown = filtered.slice(0, visibleCount);

  const pagesPreview =
    /^\d+$/.test(form.start_page) && /^\d+$/.test(form.end_page) && Number(form.end_page) > Number(form.start_page)
      ? Number(form.end_page) - Number(form.start_page)
      : null;

  const timerLabel = `${pad2(Math.floor(seconds / 60))}:${pad2(seconds % 60)}`;

  return (
    <Page>
      <ScreenHeader
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        eyebrow={t('SANCTUARY READING ALCOVE')}
        title={t('Reading Tracker')}
        subtitle={t('Record every page you turn.')}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, paddingTop: 6 }} keyboardShouldPersistTaps="handled">
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

        <Button title={t('Log a Reading Session')} icon="plus-circle-outline" onPress={() => openNew(route.params?.bookId)} />

        <View style={[styles.row, { marginTop: 16 }]}>
          <StatCard label={t('Pages read')} value={formatNumber(data.totals.pages)} caption={t('All time')} icon="file-document-outline" />
          <StatCard label={t('Time')} value={formatMinutes(data.totals.minutes)} caption={t('Total reading time')} icon="clock-outline" tint={colors.ochre} tintBg={colors.goldSoft} />
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <StatCard label={t('Sessions')} value={formatNumber(data.totals.sessions)} caption={t('Recorded')} icon="timer-sand" />
          <StatCard label={t('Streak')} value={`${data.streak.current}`} caption={t('Longest: {n} days', { n: data.streak.longest })} icon="fire" tint={colors.terracotta} tintBg={colors.roseSoft} />
        </View>

        {/* Stopwatch */}
        <View style={styles.timerCard}>
          <Text style={type.label}>{t('Session timer (optional)')}</Text>
          <Text style={styles.timerText}>{timerLabel}</Text>
          <View style={styles.timerRow}>
            <Button title={running ? 'Pause' : seconds > 0 ? 'Resume' : 'Start'} icon={running ? 'pause' : 'play'} variant="soft" small onPress={() => setRunning((r) => !r)} style={{ flex: 1 }} />
            <Button title={t('Reset')} icon="restart" variant="secondary" small onPress={() => { setRunning(false); setSeconds(0); }} style={{ flex: 1 }} />
            <Button
              title={t('Use time')}
              icon="check"
              small
              disabled={seconds < 30}
              onPress={() => { setRunning(false); openNew(route.params?.bookId, Math.max(1, Math.round(seconds / 60))); }}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Weekly rhythm */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{t('Weekly Rhythm')}</Text>
              <Text style={type.small}>{t('Pages read, Monday to Sunday')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.weekPages}>{t('{n} pages', { n: weekPages })}</Text>
              <Text style={type.small}>{t('{time} total', { time: formatMinutes(weekMinutes) })}</Text>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <BarChart data={data.week.map((d) => ({ label: t(d.label), value: d.pages, highlight: d.isToday, faded: d.isFuture }))} height={110} />
          </View>
          <View style={styles.todayBar}>
            <MaterialCommunityIcons name="lightning-bolt-outline" size={18} color={colors.ochre} />
            <Text style={styles.todayText}>
              {t('Today: {n} pages in {time}', { n: today?.pages || 0, time: formatMinutes(today?.minutes || 0) })}
            </Text>
          </View>
        </View>

        {/* History */}
        <View style={styles.historyHead}>
          <Text style={type.h2}>{t('Reading History')}</Text>
          <Text style={type.small}>{tp(filtered.length, '{n} session', '{n} sessions')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          <FilterChip label={t('All time')} active={period === 'all'} onPress={() => { setPeriod('all'); setVisibleCount(15); }} />
          <FilterChip label={t('This week')} active={period === 'week'} onPress={() => { setPeriod('week'); setVisibleCount(15); }} />
          <FilterChip label={t('This month')} active={period === 'month'} onPress={() => { setPeriod('month'); setVisibleCount(15); }} />
        </ScrollView>

        {shown.length === 0 ? (
          <EmptyState icon="timer-sand" title={t('No sessions here')} message={t('Log a session to start building your reading history.')} actionLabel={t('Log a session')} onAction={() => openNew(route.params?.bookId)} />
        ) : (
          shown.map((s) => (
            <View key={s.id} style={styles.session}>
              <Pressable onPress={() => navigation.navigate('BookDetails', { bookId: s.book_id })} accessibilityLabel={`Open ${s.book_title}`}>
                <BookCover book={{ title: s.book_title, author: s.book_author, cover_uri: s.cover_uri, cover_color: s.cover_color }} width={46} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionBook} numberOfLines={1}>{s.book_title}</Text>
                <Text style={type.small}>{relativeDay(s.session_date)} · {formatDate(s.session_date)}</Text>
                <View style={styles.tagRow}>
                  <Tag label={t('+{n} pages', { n: s.pages_read })} />
                  <Tag label={formatMinutes(s.duration_minutes)} tone="plain" />
                  <Tag label={`p. ${s.start_page}–${s.end_page}`} tone="gold" />
                </View>
                {s.notes ? <Text style={styles.note} numberOfLines={3}>“{s.notes}”</Text> : null}
              </View>
              <View style={{ gap: 4 }}>
                <Pressable onPress={() => openEdit(s)} hitSlop={6} style={styles.miniBtn} accessibilityLabel="Edit session">
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primaryText} />
                </Pressable>
                <Pressable onPress={() => handleDelete(s)} hitSlop={6} style={styles.miniBtn} accessibilityLabel="Delete session">
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}
        {filtered.length > visibleCount ? (
          <Button title={t('Show more sessions')} variant="soft" onPress={() => setVisibleCount((c) => c + 15)} />
        ) : null}
      </ScrollView>

      <FormModal
        visible={formOpen}
        title={editingId ? 'Edit Session' : 'Log Reading Session'}
        subtitle={t('Parchment entry')}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        saving={saving}
        saveLabel={editingId ? 'Save changes' : 'Save session'}
        onDelete={editingId ? () => handleDelete({ id: editingId }) : undefined}
      >
        <BookSelectField label={t('Book being read')} required books={books} value={form.book_id} onChange={pickBook} error={errors.book_id} />
        <DateField label={t('Reading date')} required value={form.session_date} onChange={set('session_date')} error={errors.session_date} maxToday />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TextField style={{ flex: 1 }} label={t('Start page')} required keyboardType="number-pad" value={form.start_page} onChangeText={set('start_page')} error={errors.start_page} placeholder={t('0')} />
          <TextField style={{ flex: 1 }} label={t('End page')} required keyboardType="number-pad" value={form.end_page} onChangeText={set('end_page')} error={errors.end_page} placeholder={selectedBook ? `≤ ${selectedBook.total_pages}` : ''} />
        </View>
        {pagesPreview ? (
          <View style={styles.preview}>
            <MaterialCommunityIcons name="lightning-bolt-outline" size={18} color={colors.ochre} />
            <Text style={styles.previewText}>{t('+{n} pages read this session', { n: pagesPreview })}</Text>
          </View>
        ) : null}
        <TextField label={t('Time spent (minutes)')} required keyboardType="number-pad" value={form.duration_minutes} onChangeText={set('duration_minutes')} error={errors.duration_minutes} placeholder={t('e.g. 45')} />
        <TextField label={t('Reading notes')} multiline value={form.notes} onChangeText={set('notes')} placeholder={t('Marginalia & reflections from this session…')} minHeight={90} />
      </FormModal>
    </Page>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: 'row', gap: 12 },
  timerCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, marginTop: 16, alignItems: 'center', ...shadows.card },
  timerText: { fontFamily: fonts.serifBold, fontSize: 46, color: colors.primaryText, marginVertical: 6, letterSpacing: 2 },
  timerRow: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.border, marginTop: 16, ...shadows.card },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  weekPages: { fontFamily: fonts.serif, fontSize: 20, color: colors.primaryText },
  todayBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: 10, marginTop: 14 },
  todayText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.goldInk },
  historyHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  session: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 10, alignItems: 'flex-start' },
  sessionBook: { fontFamily: fonts.serif, fontSize: 16, color: colors.text },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  note: { fontFamily: fonts.serifItalic, fontSize: 13.5, lineHeight: 20, color: colors.textSoft, marginTop: 6, borderLeftWidth: 2, borderLeftColor: colors.ochre, paddingLeft: 8 },
  miniBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.softBg, alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: 10 },
  previewText: { fontFamily: fonts.sansSemi, fontSize: 13.5, color: colors.goldInk },
}));
