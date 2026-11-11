import React, { useState } from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import { APP_NAME, APP_VERSION, GENRES, TAGLINE } from '../constants/options';
import { getStatistics, updateProfile } from '../database/databaseServices';
import { useFocusData } from '../utils/hooks';
import { diffDays, monthLabels, startOfYearISO, todayISO } from '../utils/dates';
import { formatMinutes, formatNumber, initials, percent, roundOne } from '../utils/format';
import { validateProfile } from '../utils/validation';
import { useToast } from '../context/ToastContext';
import BarChart from '../components/BarChart';
import Button from '../components/Button';
import { Tag } from '../components/Chip';
import ErrorBanner from '../components/ErrorBanner';
import FormModal from '../components/FormModal';
import { SelectChips, TextField } from '../components/FormFields';
import LoadingView from '../components/LoadingView';
import ProgressBar from '../components/ProgressBar';
import { Page } from '../components/ScreenScroll';
import ScreenHeader from '../components/ScreenHeader';
import StatCard from '../components/StatCard';
import { t, tp } from '../i18n';

const GENRE_COLORS = ['#5B8A72', '#C45A5A', '#D8B875', '#879B80', '#E9A8A1', '#7A8CA8', '#A6AD8A', '#B7773A', '#5B3F63', '#2F6A6B'];

function Row({ icon, title, subtitle, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}>
      <View style={styles.linkIcon}><MaterialCommunityIcons name={icon} size={20} color={colors.primaryText} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>{t(title)}</Text>
        <Text style={type.small}>{t(subtitle)}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textFaint} />
    </Pressable>
  );
}

export default function StatisticsProfileScreen({ navigation, route }) {
  const { showToast } = useToast();
  const isStack = route.name === 'Statistics';
  const [year, setYear] = useState(new Date().getFullYear());
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ display_name: '', intro: '', favourite_genre: '', yearly_goal: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useFocusData(() => getStatistics(year), [year]);

  if (loading && !data) return <LoadingView />;
  if (!data) return <Page><ScreenHeader title={t('Profile')} /><ErrorBanner message={error} onRetry={reload} /></Page>;

  const p = data.profile;
  const goal = p?.yearly_goal || 12;
  const thisYear = new Date().getFullYear();
  const dayOfYear = diffDays(startOfYearISO(), todayISO()) + 1;
  const expected = (goal * dayOfYear) / 365;
  const goalPct = percent(data.booksThisYear, goal);
  const ahead = data.booksThisYear >= expected;

  const openEdit = () => {
    setForm({ display_name: p.display_name, intro: p.intro, favourite_genre: p.favourite_genre, yearly_goal: String(p.yearly_goal) });
    setErrors({});
    setEditOpen(true);
  };
  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };

  const save = async () => {
    const found = validateProfile(form);
    setErrors(found);
    if (Object.keys(found).length) return showToast(t('Please fix the highlighted fields.'), 'error');
    setSaving(true);
    try {
      await updateProfile(form);
      showToast(t('Profile updated'));
      setEditOpen(false);
      await reload();
    } catch (e) {
      showToast(e.message || 'Could not save your profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const monthData = data.monthly.map((m, i) => ({
    label: monthLabels()[i],
    value: m.pages,
    highlight: year === thisYear && i === new Date().getMonth(),
  }));
  const monthBooks = data.monthly.map((m, i) => ({ label: monthLabels()[i], value: m.books, highlight: year === thisYear && i === new Date().getMonth() }));
  const yearPages = data.monthly.reduce((s, m) => s + m.pages, 0);
  const maxYearPages = Math.max(1, ...data.yearly.map((y) => y.pages));
  const genreTotal = data.genres.reduce((s, g) => s + g.n, 0);

  return (
    <Page>
      <ScreenHeader
        onBack={isStack ? () => navigation.goBack() : undefined}
        eyebrow={t('READER PROFILE')}
        title={t('Profile & Statistics')}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 6 }} keyboardShouldPersistTaps="handled">
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(p.display_name)}</Text></View>
          <Text style={styles.name}>{p.display_name}</Text>
          <Text style={styles.reader}>{t('Curator of tales')}</Text>
          {p.intro ? <Text style={styles.intro}>“{p.intro}”</Text> : null}
          <View style={styles.profileChips}>
            {p.favourite_genre ? <Tag label={t('{genre} aficionado', { genre: t(p.favourite_genre) })} icon="book-open-variant" /> : null}
            <Tag label={t('{n} books / year', { n: goal })} tone="gold" icon="target" />
          </View>
          <Button title={t('Edit profile')} icon="pencil-outline" variant="secondary" small onPress={openEdit} style={{ marginTop: 14 }} />
        </View>

        {/* Yearly goal */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={type.h3}>{t('{year} Reading Goal', { year: thisYear })}</Text>
            <Tag label={goalPct >= 100 ? 'Goal reached' : ahead ? 'Ahead of schedule' : 'Keep going'} tone={ahead ? 'sage' : 'gold'} />
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.bigNum}>{data.booksThisYear}</Text>
            <Text style={styles.goalOf}>{t('of {a} books · {b}%', { a: goal, b: goalPct })}</Text>
          </View>
          <ProgressBar value={goalPct} height={10} />
          <Text style={[type.small, { marginTop: 10 }]}>
            {ahead
              ? t('You are on pace — about {n} books expected by today.', { n: roundOne(expected) })
              : t('About {n} books would keep you on pace by today.', { n: roundOne(expected) })}
          </Text>
        </View>

        {/* Analytics */}
        <Text style={[type.h2, { marginTop: 24, marginBottom: 12 }]}>{t('Literary Analytics')}</Text>
        <View style={styles.grid}>
          <StatCard label={t('Collected')} value={formatNumber(data.totalBooks)} caption={t('Total books')} icon="bookshelf" />
          <StatCard label={t('Finished')} value={formatNumber(data.completed)} caption={t('Completed books')} icon="check-circle-outline" tint={colors.complete} tintBg={colors.greenSoft} />
        </View>
        <View style={styles.grid}>
          <StatCard label={t('In hand')} value={formatNumber(data.reading)} caption={t('Currently reading')} icon="book-open-variant" />
          <StatCard label={t('Wishlist')} value={formatNumber(data.wishlist)} caption={t('Books to read')} icon="bookmark-outline" tint={colors.ochre} tintBg={colors.goldSoft} />
        </View>
        <View style={styles.grid}>
          <StatCard label={t('Pages')} value={formatNumber(data.pagesRead)} caption={t('Total pages read')} icon="file-document-outline" />
          <StatCard label={t('Immersion')} value={formatMinutes(data.minutesRead)} caption={t('Total reading time')} icon="clock-outline" tint={colors.ochre} tintBg={colors.goldSoft} />
        </View>
        <View style={styles.grid}>
          <StatCard label={t('Avg rating')} value={data.ratedBooks ? `${roundOne(data.averageRating)} ★` : '—'} caption={t('{n} rated books', { n: data.ratedBooks })} icon="star-outline" tint={colors.star} tintBg={colors.goldSoft} />
          <StatCard label={t('Favourite genre')} value={t(data.favouriteGenre)} caption={t('Most read')} icon="heart-outline" tint={colors.terracotta} tintBg={colors.roseSoft} />
        </View>
        <View style={styles.grid}>
          <StatCard label={t('Velocity')} value={`${data.velocity} p/h`} caption={t('Pages per hour')} icon="speedometer" />
          <StatCard label={t('Streak')} value={`${data.streak}d`} caption={t('Longest: {n} days', { n: data.longestStreak })} icon="fire" tint={colors.terracotta} tintBg={colors.roseSoft} />
        </View>

        {/* Monthly activity */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{t('Monthly Activity')}</Text>
              <Text style={type.small}>{t('Pages read · {n} in {year}', { n: formatNumber(yearPages), year })}</Text>
            </View>
            <View style={styles.yearSwitch}>
              <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={8} accessibilityLabel="Previous year"><MaterialCommunityIcons name="chevron-left" size={22} color={colors.primaryText} /></Pressable>
              <Text style={styles.yearText}>{year}</Text>
              <Pressable onPress={() => setYear((y) => Math.min(thisYear, y + 1))} hitSlop={8} accessibilityLabel="Next year" disabled={year >= thisYear}><MaterialCommunityIcons name="chevron-right" size={22} color={year >= thisYear ? colors.borderStrong : colors.primaryText} /></Pressable>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <BarChart data={monthData.map((d) => ({ ...d, value: d.value }))} height={110} showValues={false} />
          </View>
          <Text style={[type.label, { marginTop: 16, marginBottom: 6 }]}>{t('Books completed per month')}</Text>
          <BarChart data={monthBooks} height={60} barColor={colors.ochre} highlightColor={colors.primaryText} />
        </View>

        {/* Yearly */}
        <View style={styles.card}>
          <Text style={type.h3}>{t('Yearly Activity')}</Text>
          <Text style={[type.small, { marginBottom: 12 }]}>{t('Pages and finished books per year')}</Text>
          {data.yearly.map((y) => (
            <View key={y.year} style={{ marginBottom: 12 }}>
              <View style={styles.yearRow}>
                <Text style={styles.yearLabel}>{y.year}</Text>
                <Text style={type.small}>{t('{p} pages · {b} · {time}', { p: formatNumber(y.pages), b: tp(y.books, '{n} book', '{n} books'), time: formatMinutes(y.minutes) })}</Text>
              </View>
              <ProgressBar value={percent(y.pages, maxYearPages)} height={8} pip={false} color={colors.ochre} />
            </View>
          ))}
        </View>

        {/* Genre distribution */}
        <View style={styles.card}>
          <Text style={type.h3}>{t('Genre Constellation')}</Text>
          <Text style={[type.small, { marginBottom: 12 }]}>{t('{n} genres in your library', { n: data.genres.length })}</Text>
          <View style={styles.stack}>
            {data.genres.map((g, i) => (
              <View key={g.genre} style={{ flex: g.n, backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length] }} />
            ))}
          </View>
          {data.genres.map((g, i) => (
            <View key={g.genre} style={styles.genreRow}>
              <View style={[styles.dot, { backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length] }]} />
              <Text style={styles.genreName}>{t(g.genre)}</Text>
              <Text style={type.small}>{tp(g.n, '{n} book', '{n} books')}</Text>
              <Text style={styles.genrePct}>{percent(g.n, genreTotal)}%</Text>
            </View>
          ))}
        </View>

        {/* Challenges */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={type.h3}>{t('Challenge Completion')}</Text>
            <Text style={styles.bigNum2}>{data.challengesCompleted}/{data.challengesTotal}</Text>
          </View>
          <ProgressBar value={percent(data.challengesCompleted, data.challengesTotal)} height={8} style={{ marginTop: 10 }} />
          <Text style={[type.small, { marginTop: 8 }]}>
            {data.challengesTotal === 0 ? t('No challenges yet — create one in Quests.') : t('{n}% of your reading challenges are complete.', { n: percent(data.challengesCompleted, data.challengesTotal) })}
          </Text>
        </View>

        {/* Links */}
        <View style={{ gap: 10, marginTop: 8 }}>
          <Row icon="cog-outline" title={t('Settings')} subtitle={t('Language, theme & upload books')} onPress={() => navigation.navigate('Settings')} />
          <Row icon="timer-outline" title={t('Reading Tracker')} subtitle={t('Sessions, history & weekly rhythm')} onPress={() => navigation.navigate('ReadingTracker')} />
          <Row icon="format-quote-close" title={t('Quotes & Reviews')} subtitle={t('Favourite lines and critiques')} onPress={() => navigation.navigate('QuotesReviews')} />
          <Row icon="trophy-outline" title={t('Reading Quests')} subtitle={t('Goals, deadlines and progress')} onPress={() => navigation.navigate('Challenges')} />
        </View>

        {/* About */}
        <View style={styles.about}>
          <View style={styles.aboutHead}>
            <MaterialCommunityIcons name="lock-outline" size={22} color={colors.primaryText} />
            <Text style={styles.aboutTitle}>{t('100% Offline Vault')}</Text>
          </View>
          <Text style={type.bodySoft}>{t('Your books, journal, quotes and reviews live only on this device in a local SQLite database. No accounts, no servers, no internet needed.')}</Text>
          <View style={styles.aboutMeta}>
            <Text style={styles.aboutBrand}>{APP_NAME}</Text>
            <Text style={type.small}>{t('Version {v}', { v: APP_VERSION })}</Text>
          </View>
          <Text style={styles.aboutTag}>{TAGLINE}</Text>
        </View>
      </ScrollView>

      <FormModal visible={editOpen} title={t('Edit Profile')} subtitle={t('Your reader identity')} onClose={() => setEditOpen(false)} onSave={save} saving={saving} saveLabel={t('Save profile')}>
        <TextField label={t('Reader display name')} required value={form.display_name} onChangeText={set('display_name')} error={errors.display_name} autoCapitalize="words" />
        <TextField label={t('Short introduction')} multiline value={form.intro} onChangeText={set('intro')} placeholder={t('A line about you as a reader…')} minHeight={80} maxLength={160} />
        <SelectChips label={t('Favourite genre')} options={GENRES} value={form.favourite_genre} onChange={set('favourite_genre')} allowClear />
        <TextField label={t('Reading goal (books per year)')} keyboardType="number-pad" value={form.yearly_goal} onChangeText={set('yearly_goal')} error={errors.yearly_goal} />
      </FormModal>
    </Page>
  );
}

const styles = themedStyles(() => ({
  profileCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.lifted },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.goldSoft },
  avatarText: { fontFamily: fonts.serifBold, fontSize: 32, color: colors.onGold },
  name: { fontFamily: fonts.serif, fontSize: 26, color: colors.text, marginTop: 12, textAlign: 'center' },
  reader: { fontFamily: fonts.serifMedium, fontSize: 14.5, color: colors.ochre, marginTop: 2 },
  intro: { fontFamily: fonts.serifItalic, fontSize: 15.5, lineHeight: 24, color: colors.textSoft, textAlign: 'center', marginTop: 12, backgroundColor: colors.parchmentAlt, padding: 12, borderRadius: radius.md, alignSelf: 'stretch' },
  profileChips: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.border, marginTop: 16, ...shadows.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  goalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 10 },
  bigNum: { fontFamily: fonts.serif, fontSize: 40, color: colors.primaryText },
  bigNum2: { fontFamily: fonts.serif, fontSize: 22, color: colors.ochre },
  goalOf: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textSoft },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  yearSwitch: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceTint, borderRadius: 18, paddingHorizontal: 8, height: 36 },
  yearText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.primaryText, minWidth: 44, textAlign: 'center' },
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  yearLabel: { fontFamily: fonts.serif, fontSize: 17, color: colors.text },
  stack: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, marginBottom: 14 },
  genreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  genreName: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 14, color: colors.text },
  genrePct: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.text, width: 40, textAlign: 'right' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  linkIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.text },
  about: { backgroundColor: colors.surfaceTint, borderRadius: radius.lg, padding: 18, marginTop: 20, gap: 10 },
  aboutHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.primaryText },
  aboutMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  aboutBrand: { fontFamily: fonts.serifBold, letterSpacing: 2, fontSize: 15, color: colors.primaryText },
  aboutTag: { fontFamily: fonts.serifItalic, fontSize: 14, color: colors.textSoft },
}));
