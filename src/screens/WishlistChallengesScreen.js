import React, { useState } from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import { GENRES } from '../constants/options';
import {
  createChallenge, createWishlistItem, deleteChallenge, deleteWishlistItem, getChallenges, getWishlist,
  updateChallenge, updateWishlistItem,
} from '../database/databaseServices';
import { useFocusData } from '../utils/hooks';
import {
  addDays, endOfMonthISO, endOfYearISO, formatDate, startOfMonthISO, startOfYearISO, todayISO,
} from '../utils/dates';
import { validateChallenge, validateWishlist } from '../utils/validation';
import { confirmDelete } from '../utils/confirm';
import { useToast } from '../context/ToastContext';
import Button from '../components/Button';
import { FilterChip, Tag } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import FormModal from '../components/FormModal';
import { DateField, FieldLabel, SelectChips, TextField } from '../components/FormFields';
import LoadingView from '../components/LoadingView';
import { Page } from '../components/ScreenScroll';
import ProgressBar from '../components/ProgressBar';
import ScreenHeader from '../components/ScreenHeader';
import SearchBar from '../components/SearchBar';
import SegmentedTabs from '../components/SegmentedTabs';
import { t, tp } from '../i18n';

const blankWish = () => ({ title: t(''), author: '', genre: '', reason: '', total_pages: '' });
const blankChallenge = () => ({ title: t(''), target_books: '', genre: '', start_date: startOfYearISO(), deadline: endOfYearISO() });

export default function WishlistChallengesScreen({ navigation, route }) {
  const { showToast } = useToast();
  const isStack = route.name === 'Challenges';
  const [tab, setTab] = useState(route.params?.initialTab || (isStack ? 'quests' : 'wishlist'));
  const [search, setSearch] = useState('');
  const [questFilter, setQuestFilter] = useState('active');

  const [wishOpen, setWishOpen] = useState(false);
  const [wishForm, setWishForm] = useState(blankWish());
  const [chOpen, setChOpen] = useState(false);
  const [chForm, setChForm] = useState(blankChallenge());
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useFocusData(
    async () => {
      const [wishlist, allWishlist, challenges] = await Promise.all([getWishlist({ search }), getWishlist({}), getChallenges()]);
      return { wishlist, wishCount: allWishlist.length, challenges };
    },
    [search]
  );

  /* ---------- wishlist ---------- */
  const openNewWish = () => { setWishForm(blankWish()); setErrors({}); setEditingId(null); setWishOpen(true); };
  const openEditWish = (w) => {
    setWishForm({ title: w.title, author: w.author, genre: w.genre, reason: w.reason, total_pages: w.total_pages ? String(w.total_pages) : '' });
    setErrors({}); setEditingId(w.id); setWishOpen(true);
  };
  const setW = (k) => (v) => { setWishForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };

  const saveWish = async () => {
    const found = validateWishlist(wishForm);
    setErrors(found);
    if (Object.keys(found).length) return showToast(t('Please fix the highlighted fields.'), 'error');
    setSaving(true);
    try {
      if (editingId) await updateWishlistItem(editingId, wishForm);
      else await createWishlistItem(wishForm);
      showToast(editingId ? 'Wishlist item updated' : 'Added to your wishlist');
      setWishOpen(false);
      await reload();
    } catch (e) {
      showToast(e.message || 'Could not save the item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeWish = (id) =>
    confirmDelete({
      title: t('Remove from wishlist?'),
      message: t('This book will be removed from your reading wishlist.'),
      confirmLabel: t('Remove'),
      onConfirm: async () => {
        try { await deleteWishlistItem(id); showToast(t('Removed from wishlist')); setWishOpen(false); reload(); }
        catch (e) { showToast(t('Could not remove the item.'), 'error'); }
      },
    });

  const moveToShelf = (w) =>
    navigation.navigate('AddEditBook', {
      wishlistId: w.id,
      prefill: { title: w.title, author: w.author, genre: w.genre, total_pages: w.total_pages, description: w.reason ? t('Why I want to read it: {reason}', { reason: w.reason }) : '' },
    });

  /* ---------- challenges ---------- */
  const openNewChallenge = () => { setChForm(blankChallenge()); setErrors({}); setEditingId(null); setChOpen(true); };
  const openEditChallenge = (c) => {
    setChForm({ title: c.title, target_books: String(c.target_books), genre: c.genre || '', start_date: c.start_date, deadline: c.deadline });
    setErrors({}); setEditingId(c.id); setChOpen(true);
  };
  const setC = (k) => (v) => { setChForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };

  const saveChallenge = async () => {
    const found = validateChallenge(chForm);
    setErrors(found);
    if (Object.keys(found).length) return showToast(t('Please fix the highlighted fields.'), 'error');
    setSaving(true);
    try {
      if (editingId) await updateChallenge(editingId, chForm);
      else await createChallenge(chForm);
      showToast(editingId ? 'Challenge updated' : 'Challenge created');
      setChOpen(false);
      await reload();
    } catch (e) {
      showToast(e.message || 'Could not save the challenge.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeChallenge = (id) =>
    confirmDelete({
      title: t('Delete this challenge?'),
      message: t('Your books are not affected — only the goal is removed.'),
      onConfirm: async () => {
        try { await deleteChallenge(id); showToast(t('Challenge deleted')); setChOpen(false); reload(); }
        catch (e) { showToast(t('Could not delete the challenge.'), 'error'); }
      },
    });

  if (loading && !data) return <LoadingView />;
  if (!data) return <Page><ScreenHeader title={t('Wishlist & Quests')} /><ErrorBanner message={error} onRetry={reload} /></Page>;

  const challenges = data.challenges;
  const active = challenges.filter((c) => !c.isCompleted && !c.isExpired);
  const completed = challenges.filter((c) => c.isCompleted);
  const missed = challenges.filter((c) => c.isExpired);
  const shownChallenges = questFilter === 'active' ? active : questFilter === 'completed' ? completed : missed;
  const featured = active[0];

  return (
    <Page>
      <ScreenHeader
        onBack={isStack ? () => navigation.goBack() : undefined}
        eyebrow={t('SANCTUARY REGISTRY')}
        title={t('Wishlist & Quests')}
        subtitle={t('Books to read next, and goals to chase.')}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 6 }} keyboardShouldPersistTaps="handled">
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k)}
          tabs={[
            { key: 'wishlist', label: 'Wishlist', icon: 'bookmark-outline', count: data.wishCount },
            { key: 'quests', label: 'Quests', icon: 'trophy-outline', count: active.length },
          ]}
        />
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

        {tab === 'wishlist' ? (
          <View style={{ marginTop: 16, gap: 12 }}>
            <Button title={t('Add to Wishlist')} icon="bookmark-plus-outline" onPress={openNewWish} />
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('Search title, author, genre…')} />
            <Text style={type.small}>{tp(data.wishlist.length, '{n} prospective title shown', '{n} prospective titles shown')}</Text>

            {data.wishlist.length === 0 ? (
              <EmptyState icon="bookmark-outline" title={search ? 'No wishlist matches' : 'Your wishlist is empty'} message={search ? 'Try a different search.' : 'Save the books you hope to read someday.'} actionLabel={search ? 'Clear search' : 'Add a book'} onAction={search ? () => setSearch('') : openNewWish} />
            ) : (
              data.wishlist.map((w) => (
                <View key={w.id} style={styles.wishCard}>
                  <View style={styles.wishTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.wishMeta}>{t(w.genre).toUpperCase()}{w.total_pages ? ` · ${w.total_pages} PP` : ''}</Text>
                      <Text style={styles.wishTitle}>{w.title}</Text>
                      <Text style={type.bodySoft}>{w.author}</Text>
                    </View>
                    <View style={styles.wishIcon}><MaterialCommunityIcons name="bookmark-outline" size={22} color={colors.ochre} /></View>
                  </View>
                  {w.reason ? (
                    <View style={styles.reasonBox}>
                      <MaterialCommunityIcons name="format-quote-open" size={16} color={colors.ochre} />
                      <Text style={styles.reasonText}>{w.reason}</Text>
                    </View>
                  ) : null}
                  <View style={styles.wishActions}>
                    <Button title={t('Move to Bookshelf')} icon="bookshelf" variant="soft" small onPress={() => moveToShelf(w)} style={{ flex: 1 }} />
                    <Pressable onPress={() => openEditWish(w)} style={styles.miniBtn} accessibilityLabel="Edit wishlist item"><MaterialCommunityIcons name="pencil-outline" size={19} color={colors.primaryText} /></Pressable>
                    <Pressable onPress={() => removeWish(w.id)} style={styles.miniBtn} accessibilityLabel="Delete wishlist item"><MaterialCommunityIcons name="trash-can-outline" size={19} color={colors.danger} /></Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={{ marginTop: 16, gap: 12 }}>
            <Button title={t('Create a Challenge')} icon="trophy-outline" onPress={openNewChallenge} />

            {featured ? (
              <View style={styles.featured}>
                <Text style={styles.featEyebrow}>{t('FEATURED EXPEDITION')}</Text>
                <Text style={styles.featTitle}>{featured.title}</Text>
                <View style={styles.featRow}>
                  <Text style={styles.featSub}>{t('{a} of {b} books completed', { a: featured.progress, b: featured.target_books })}</Text>
                  <Text style={styles.featPct}>{featured.percent}%</Text>
                </View>
                <ProgressBar value={featured.percent} height={8} color={colors.gold} pip={false} style={{ backgroundColor: 'rgba(255,255,255,0.22)' }} />
                <View style={styles.featStats}>
                  <View style={styles.featStat}><Text style={styles.featStatVal}>{featured.remaining}</Text><Text style={styles.featStatLabel}>{t('books to go')}</Text></View>
                  <View style={styles.featStat}><Text style={styles.featStatVal}>{featured.daysLeft}</Text><Text style={styles.featStatLabel}>{t('days left')}</Text></View>
                </View>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <FilterChip label={t('Active')} count={active.length} active={questFilter === 'active'} onPress={() => setQuestFilter('active')} />
              <FilterChip label={t('Completed')} count={completed.length} active={questFilter === 'completed'} onPress={() => setQuestFilter('completed')} />
              <FilterChip label={t('Missed')} count={missed.length} active={questFilter === 'missed'} onPress={() => setQuestFilter('missed')} />
            </ScrollView>

            {shownChallenges.length === 0 ? (
              <EmptyState icon="trophy-outline" title={questFilter === 'active' ? 'No active challenges' : questFilter === 'completed' ? 'Nothing completed yet' : 'No missed challenges'} message={questFilter === 'active' ? 'Set a goal like “Read 12 books this year”.' : 'Finish books to complete your challenges automatically.'} actionLabel={questFilter === 'active' ? 'Create a challenge' : undefined} onAction={openNewChallenge} />
            ) : (
              shownChallenges.map((c) => (
                <View key={c.id} style={styles.chCard}>
                  <View style={styles.chTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chTitle}>{c.title}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <Tag label={c.genre ? c.genre : 'Any genre'} tone={c.genre ? 'sage' : 'plain'} />
                        {c.isCompleted ? <Tag label={t('Completed')} tone="gold" icon="trophy" /> : c.isExpired ? <Tag label={t('Deadline passed')} tone="rose" /> : <Tag label={t('{n} days left', { n: c.daysLeft })} tone="gold" />}
                      </View>
                    </View>
                    <Text style={styles.chPct}>{c.percent}%</Text>
                  </View>
                  <ProgressBar value={c.percent} height={8} style={{ marginTop: 14 }} />
                  <Text style={[type.small, { marginTop: 8 }]}>{t('{a} of {b} books · {s} → {e}', { a: c.progress, b: c.target_books, s: formatDate(c.start_date), e: formatDate(c.deadline) })}</Text>
                  <View style={styles.chActions}>
                    <Pressable onPress={() => openEditChallenge(c)} style={styles.act}><MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primaryText} /><Text style={styles.actText}>{t('Edit')}</Text></Pressable>
                    <Pressable onPress={() => removeChallenge(c.id)} style={styles.act}><MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} /><Text style={[styles.actText, { color: colors.danger }]}>{t('Delete')}</Text></Pressable>
                  </View>
                </View>
              ))
            )}
            <Text style={type.small}>{t("Progress is counted automatically from books you mark as Completed within each challenge's dates (and genre, if one is chosen).")}</Text>
          </View>
        )}
      </ScrollView>

      <FormModal
        visible={wishOpen}
        title={editingId ? 'Edit Wishlist Item' : 'Add to Wishlist'}
        subtitle={t('Prospective voyage')}
        onClose={() => setWishOpen(false)}
        onSave={saveWish}
        saving={saving}
        onDelete={editingId ? () => removeWish(editingId) : undefined}
        deleteLabel={t('Remove')}
      >
        <TextField label={t('Book title')} required value={wishForm.title} onChangeText={setW('title')} error={errors.title} />
        <TextField label={t('Author')} required value={wishForm.author} onChangeText={setW('author')} error={errors.author} />
        <SelectChips label={t('Genre')} required options={GENRES} value={wishForm.genre} onChange={setW('genre')} error={errors.genre} />
        <TextField label={t('Why do you want to read it?')} multiline value={wishForm.reason} onChangeText={setW('reason')} placeholder={t('A recommendation, a mood, a cover you adore…')} minHeight={90} />
        <TextField label={t('Estimated pages')} keyboardType="number-pad" value={wishForm.total_pages} onChangeText={setW('total_pages')} error={errors.total_pages} placeholder={t('Optional')} />
      </FormModal>

      <FormModal
        visible={chOpen}
        title={editingId ? 'Edit Challenge' : 'Create a Challenge'}
        subtitle={t('Set a reading goal')}
        onClose={() => setChOpen(false)}
        onSave={saveChallenge}
        saving={saving}
        onDelete={editingId ? () => removeChallenge(editingId) : undefined}
      >
        <TextField label={t('Challenge name')} required value={chForm.title} onChangeText={setC('title')} error={errors.title} placeholder={t('e.g. Read 12 books this year')} />
        <TextField label={t('Target number of books')} required keyboardType="number-pad" value={chForm.target_books} onChangeText={setC('target_books')} error={errors.target_books} placeholder={t('e.g. 12')} />
        <SelectChips label={t('Genre (optional)')} options={GENRES} value={chForm.genre} onChange={setC('genre')} allowClear clearLabel={t('Any genre')} />
        <View>
          <FieldLabel>{t('Quick date ranges')}</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <FilterChip label={t('This year')} onPress={() => setChForm((f) => ({ ...f, start_date: startOfYearISO(), deadline: endOfYearISO() }))} />
            <FilterChip label={t('This month')} onPress={() => setChForm((f) => ({ ...f, start_date: startOfMonthISO(), deadline: endOfMonthISO() }))} />
            <FilterChip label={t('Next 30 days')} onPress={() => setChForm((f) => ({ ...f, start_date: todayISO(), deadline: addDays(todayISO(), 30) }))} />
          </View>
        </View>
        <DateField label={t('Start date')} required value={chForm.start_date} onChange={setC('start_date')} error={errors.start_date} />
        <DateField label={t('Deadline')} required value={chForm.deadline} onChange={setC('deadline')} error={errors.deadline} />
      </FormModal>
    </Page>
  );
}

const styles = themedStyles(() => ({
  wishCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12, ...shadows.card },
  wishTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  wishMeta: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 0.9, color: colors.ochre },
  wishTitle: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 27, color: colors.text, marginTop: 3 },
  wishIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  reasonBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.parchmentAlt, borderRadius: radius.md, padding: 12 },
  reasonText: { flex: 1, fontFamily: fonts.serifItalic, fontSize: 14.5, lineHeight: 22, color: colors.textSoft },
  wishActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.softBg, alignItems: 'center', justifyContent: 'center' },
  featured: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: 20, gap: 10, ...shadows.lifted },
  featEyebrow: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 1.2, color: colors.gold },
  featTitle: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: colors.white },
  featRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  featSub: { fontFamily: fonts.sansMedium, fontSize: 14, color: 'rgba(255,255,255,0.88)' },
  featPct: { fontFamily: fonts.serif, fontSize: 30, color: colors.gold },
  featStats: { flexDirection: 'row', gap: 10, marginTop: 4 },
  featStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, padding: 12 },
  featStatVal: { fontFamily: fonts.serif, fontSize: 22, color: colors.white },
  featStatLabel: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  chCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  chTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chTitle: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: colors.text },
  chPct: { fontFamily: fonts.serif, fontSize: 26, color: colors.ochre },
  chActions: { flexDirection: 'row', gap: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.primaryText },
}));
