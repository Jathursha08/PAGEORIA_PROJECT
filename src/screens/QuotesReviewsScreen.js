import React, { useCallback, useEffect, useRef, useState } from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import {
  createQuote, createReview, deleteQuote, deleteReview, getBooksLite, getQuoteBooks, getQuotes, getReviewCounts,
  getReviews, updateQuote, updateReview,
} from '../database/databaseServices';
import { useFocusData } from '../utils/hooks';
import { formatDate, todayISO } from '../utils/dates';
import { validateQuote, validateReview } from '../utils/validation';
import { confirmDelete } from '../utils/confirm';
import { useToast } from '../context/ToastContext';
import BookCover from '../components/BookCover';
import Button from '../components/Button';
import { FilterChip, Tag } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import FormModal from '../components/FormModal';
import { BookSelectField, DateField, FieldLabel, TextField } from '../components/FormFields';
import LoadingView from '../components/LoadingView';
import { Page } from '../components/ScreenScroll';
import ScreenHeader from '../components/ScreenHeader';
import SearchBar from '../components/SearchBar';
import SegmentedTabs from '../components/SegmentedTabs';
import StarRating from '../components/StarRating';
import { t } from '../i18n';

const blankQuote = (book) => ({
  quote_text: '', book_id: book?.id ?? null, author: book?.author || '', note: '', page_number: '', date_saved: todayISO(),
});
const blankReview = (book) => ({
  book_id: book?.id ?? null, rating: 0, title: t(''), body: '', date_reviewed: todayISO(),
});

export default function QuotesReviewsScreen({ navigation, route }) {
  const { showToast } = useToast();
  const [tab, setTab] = useState(route.params?.initialTab || 'quotes');
  const [search, setSearch] = useState('');
  const [bookFilter, setBookFilter] = useState(null);
  const [ratingFilter, setRatingFilter] = useState(null);

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [qForm, setQForm] = useState(blankQuote());
  const [rForm, setRForm] = useState(blankReview());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useFocusData(
    async () => {
      const [quotes, quoteBooks, reviews, reviewCounts, books] = await Promise.all([
        getQuotes({ search, bookId: bookFilter }),
        getQuoteBooks(),
        getReviews({ rating: ratingFilter }),
        getReviewCounts(),
        getBooksLite(),
      ]);
      return { quotes, quoteBooks, reviews, reviewCounts, books };
    },
    [search, bookFilter, ratingFilter]
  );

  const books = data?.books || [];

  const openNewQuote = useCallback(
    (bookId) => {
      setQForm(blankQuote(books.find((b) => b.id === bookId)));
      setErrors({});
      setEditingId(null);
      setQuoteOpen(true);
    },
    [books]
  );
  const openNewReview = useCallback(
    (bookId) => {
      setRForm(blankReview(books.find((b) => b.id === bookId)));
      setErrors({});
      setEditingId(null);
      setReviewOpen(true);
    },
    [books]
  );

  const handled = useRef(null);
  useEffect(() => {
    const { stamp, openForm, bookId, initialTab } = route.params || {};
    if (openForm && stamp && handled.current !== stamp && data) {
      handled.current = stamp;
      if (initialTab) setTab(initialTab);
      if (openForm === 'quote') openNewQuote(bookId);
      else if (openForm === 'review') openNewReview(bookId);
    }
  }, [route.params, data, openNewQuote, openNewReview]);

  const setQ = (k) => (v) => { setQForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };
  const setR = (k) => (v) => { setRForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };

  const saveQuote = async () => {
    const found = validateQuote(qForm);
    setErrors(found);
    if (Object.keys(found).length) return showToast(t('Please fix the highlighted fields.'), 'error');
    setSaving(true);
    try {
      if (editingId) await updateQuote(editingId, qForm);
      else await createQuote(qForm);
      showToast(editingId ? 'Quote updated' : 'Quote saved');
      setQuoteOpen(false);
      await reload();
    } catch (e) {
      showToast(e.message || 'Could not save the quote.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveReview = async () => {
    const found = validateReview(rForm);
    setErrors(found);
    if (Object.keys(found).length) return showToast(t('Please fix the highlighted fields.'), 'error');
    setSaving(true);
    try {
      if (editingId) await updateReview(editingId, rForm);
      else await createReview(rForm);
      showToast(editingId ? 'Review updated' : 'Review saved');
      setReviewOpen(false);
      await reload();
    } catch (e) {
      showToast(e.message || 'Could not save the review.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeQuote = (id) =>
    confirmDelete({
      title: t('Delete this quote?'),
      message: t('It will be removed from your collection.'),
      onConfirm: async () => {
        try { await deleteQuote(id); showToast(t('Quote deleted')); setQuoteOpen(false); reload(); }
        catch (e) { showToast(t('Could not delete the quote.'), 'error'); }
      },
    });
  const removeReview = (id) =>
    confirmDelete({
      title: t('Delete this review?'),
      message: t('Your review will be permanently removed.'),
      onConfirm: async () => {
        try { await deleteReview(id); showToast(t('Review deleted')); setReviewOpen(false); reload(); }
        catch (e) { showToast(t('Could not delete the review.'), 'error'); }
      },
    });

  const editQuote = (q) => {
    setQForm({ quote_text: q.quote_text, book_id: q.book_id, author: q.author, note: q.note, page_number: q.page_number ? String(q.page_number) : '', date_saved: q.date_saved });
    setErrors({}); setEditingId(q.id); setQuoteOpen(true);
  };
  const editReview = (r) => {
    setRForm({ book_id: r.book_id, rating: r.rating, title: r.title, body: r.body, date_reviewed: r.date_reviewed });
    setErrors({}); setEditingId(r.id); setReviewOpen(true);
  };

  if (loading && !data) return <LoadingView />;
  if (!data) return <Page><ScreenHeader title={t('Quotes & Reviews')} onBack={() => navigation.goBack()} /><ErrorBanner message={error} onRetry={reload} /></Page>;

  const quoteTotal = data.quoteBooks.reduce((s, b) => s + b.n, 0);

  return (
    <Page>
      <ScreenHeader
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        eyebrow={t('ARCHIVAL PASSAGES & CRITIQUES')}
        title={t('Quotes & Reviews')}
        subtitle={t('Resonant lines and honest impressions.')}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, paddingTop: 6 }} keyboardShouldPersistTaps="handled">
        <SegmentedTabs
          value={tab}
          onChange={(k) => { setTab(k); setSearch(''); }}
          tabs={[
            { key: 'quotes', label: 'Quotes', icon: 'format-quote-close', count: quoteTotal },
            { key: 'reviews', label: 'Reviews', icon: 'star-circle-outline', count: data.reviewCounts.all },
          ]}
        />
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

        {tab === 'quotes' ? (
          <View style={{ marginTop: 16, gap: 12 }}>
            <Button title={t('Save a Quote')} icon="plus" onPress={() => openNewQuote(bookFilter)} />
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('Search quote lines, authors, books…')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <FilterChip label={t('All books')} active={!bookFilter} onPress={() => setBookFilter(null)} />
              {data.quoteBooks.map((b) => (
                <FilterChip key={b.id} label={b.title.length > 20 ? `${b.title.slice(0, 19)}…` : b.title} count={b.n} active={bookFilter === b.id} onPress={() => setBookFilter(bookFilter === b.id ? null : b.id)} />
              ))}
            </ScrollView>
            <Text style={type.small}>{t('Type the passages you love in your own words — PAGEORIA never copies book text for you.')}</Text>

            {data.quotes.length === 0 ? (
              <EmptyState icon="format-quote-close" title={search || bookFilter ? 'No quotes match' : 'No quotes yet'} message={search || bookFilter ? 'Try a different search or book.' : 'Save a line that stayed with you.'} actionLabel={search || bookFilter ? 'Clear filters' : 'Save a quote'} onAction={search || bookFilter ? () => { setSearch(''); setBookFilter(null); } : () => openNewQuote()} />
            ) : (
              data.quotes.map((q) => (
                <View key={q.id} style={styles.quoteCard}>
                  <MaterialCommunityIcons name="format-quote-open" size={26} color={colors.gold} />
                  <Text style={styles.quoteText}>{q.quote_text}</Text>
                  <Pressable onPress={() => navigation.navigate('BookDetails', { bookId: q.book_id })} style={styles.quoteBook} accessibilityRole="button">
                    <BookCover book={{ title: q.book_title, author: q.book_author, cover_uri: q.cover_uri, cover_color: q.cover_color }} width={30} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quoteBookTitle} numberOfLines={1}>{q.book_title}</Text>
                      <Text style={type.small} numberOfLines={1}>{q.author ? `${q.author}` : q.book_author}{q.page_number ? ` · p. ${q.page_number}` : ''}</Text>
                    </View>
                  </Pressable>
                  {q.note ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteLabel}>{t('PERSONAL NOTE')}</Text>
                      <Text style={styles.noteText}>{q.note}</Text>
                    </View>
                  ) : null}
                  <View style={styles.cardFoot}>
                    <Text style={type.small}>{t('Saved {date}', { date: formatDate(q.date_saved) })}</Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <Pressable onPress={() => editQuote(q)} hitSlop={8} accessibilityLabel="Edit quote"><MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primaryText} /></Pressable>
                      <Pressable onPress={() => removeQuote(q.id)} hitSlop={8} accessibilityLabel="Delete quote"><MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} /></Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={{ marginTop: 16, gap: 12 }}>
            <Button title={t('Write a Review')} icon="plus" onPress={() => openNewReview()} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <FilterChip label={t('All ratings')} count={data.reviewCounts.all} active={!ratingFilter} onPress={() => setRatingFilter(null)} />
              {[5, 4, 3, 2, 1].map((n) => (
                <FilterChip key={n} label={`${n} ★`} count={data.reviewCounts[n] || 0} active={ratingFilter === n} onPress={() => setRatingFilter(ratingFilter === n ? null : n)} />
              ))}
            </ScrollView>

            {data.reviews.length === 0 ? (
              <EmptyState icon="star-circle-outline" title={ratingFilter ? 'No reviews at this rating' : 'No reviews yet'} message={ratingFilter ? 'Choose another rating.' : 'Share what you thought of a book you finished.'} actionLabel={ratingFilter ? 'Show all' : 'Write a review'} onAction={ratingFilter ? () => setRatingFilter(null) : () => openNewReview()} />
            ) : (
              data.reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable onPress={() => navigation.navigate('BookDetails', { bookId: r.book_id })} accessibilityLabel={`Open ${r.book_title}`}>
                      <BookCover book={{ title: r.book_title, author: r.book_author, cover_uri: r.cover_uri, cover_color: r.cover_color }} width={54} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewBook} numberOfLines={1}>{r.book_title}</Text>
                      <Text style={type.small} numberOfLines={1}>{r.book_author}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <StarRating value={r.rating} size={16} gap={1} />
                        <Text style={styles.ratingNum}>{r.rating}.0 / 5</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewTitle}>“{r.title}”</Text>
                  <Text style={styles.reviewBody}>{r.body}</Text>
                  <View style={styles.cardFoot}>
                    <Tag label={t('Reviewed {date}', { date: formatDate(r.date_reviewed) })} tone="plain" />
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <Pressable onPress={() => editReview(r)} hitSlop={8} accessibilityLabel="Edit review"><MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primaryText} /></Pressable>
                      <Pressable onPress={() => removeReview(r.id)} hitSlop={8} accessibilityLabel="Delete review"><MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} /></Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <FormModal
        visible={quoteOpen}
        title={editingId ? 'Edit Quote' : 'Save a Quote'}
        subtitle={t('In your own hand')}
        onClose={() => setQuoteOpen(false)}
        onSave={saveQuote}
        saving={saving}
        onDelete={editingId ? () => removeQuote(editingId) : undefined}
      >
        <TextField label={t('Quote text')} required multiline minHeight={110} value={qForm.quote_text} onChangeText={setQ('quote_text')} error={errors.quote_text} placeholder={t('Type the line you want to keep…')} />
        <BookSelectField label={t('Related book')} required books={books} value={qForm.book_id} error={errors.book_id}
          onChange={(b) => { setQForm((f) => ({ ...f, book_id: b?.id ?? null, author: f.author || b?.author || '' })); setErrors((e) => ({ ...e, book_id: undefined })); }} />
        <TextField label={t('Author')} value={qForm.author} onChangeText={setQ('author')} placeholder={t('Who wrote it?')} />
        <TextField label={t('Page number')} keyboardType="number-pad" value={qForm.page_number} onChangeText={setQ('page_number')} error={errors.page_number} placeholder={t('Optional')} />
        <TextField label={t('Personal note')} multiline value={qForm.note} onChangeText={setQ('note')} placeholder={t('Why does this line matter to you?')} minHeight={80} />
        <DateField label={t('Date saved')} required value={qForm.date_saved} onChange={setQ('date_saved')} error={errors.date_saved} />
      </FormModal>

      <FormModal
        visible={reviewOpen}
        title={editingId ? 'Edit Review' : 'Write a Review'}
        subtitle={t('Your honest impression')}
        onClose={() => setReviewOpen(false)}
        onSave={saveReview}
        saving={saving}
        onDelete={editingId ? () => removeReview(editingId) : undefined}
      >
        <BookSelectField label={t('Related book')} required books={books} value={rForm.book_id} error={errors.book_id}
          onChange={(b) => { setRForm((f) => ({ ...f, book_id: b?.id ?? null })); setErrors((e) => ({ ...e, book_id: undefined })); }} />
        <View>
          <FieldLabel required>{t('Star rating')}</FieldLabel>
          <StarRating value={rForm.rating} onChange={setR('rating')} size={34} clearable={false} />
          {errors.rating ? <Text style={styles.err}>{errors.rating}</Text> : null}
        </View>
        <TextField label={t('Review title')} required value={rForm.title} onChangeText={setR('title')} error={errors.title} placeholder={t('A headline for your thoughts')} />
        <TextField label={t('Review')} required multiline minHeight={130} value={rForm.body} onChangeText={setR('body')} error={errors.body} placeholder={t('What worked, what didn\'t, who should read it…')} />
        <DateField label={t('Date reviewed')} required value={rForm.date_reviewed} onChange={setR('date_reviewed')} error={errors.date_reviewed} />
      </FormModal>
    </Page>
  );
}

const styles = themedStyles(() => ({
  quoteCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 10, ...shadows.card },
  quoteText: { fontFamily: fonts.serifItalic, fontSize: 19, lineHeight: 30, color: colors.text },
  quoteBook: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.parchmentAlt, borderRadius: radius.md, padding: 10 },
  quoteBookTitle: { fontFamily: fonts.sansSemi, fontSize: 13.5, color: colors.text },
  noteBox: { backgroundColor: colors.parchment, borderRadius: radius.md, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.ochre },
  noteLabel: { fontFamily: fonts.sansBold, fontSize: 9.5, letterSpacing: 1.1, color: colors.ochre },
  noteText: { fontFamily: fonts.serifItalic, fontSize: 14.5, lineHeight: 22, color: colors.textSoft, marginTop: 3 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10, ...shadows.card },
  reviewBook: { fontFamily: fonts.serif, fontSize: 17, color: colors.text },
  ratingNum: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.textSoft },
  reviewTitle: { fontFamily: fonts.serifMedium, fontSize: 19, lineHeight: 26, color: colors.text },
  reviewBody: { fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 23, color: colors.textSoft },
  err: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.danger, marginTop: 5 },
}));
