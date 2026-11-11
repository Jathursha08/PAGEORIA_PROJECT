import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import { TAGLINE } from '../constants/options';
import { getHomeData } from '../database/databaseServices';
import { useFocusData } from '../utils/hooks';
import { formatNumber, initials, percent, truncate } from '../utils/format';
import { formatDate, greeting, todayISO } from '../utils/dates';
import { useToast } from '../context/ToastContext';
import BookCover from '../components/BookCover';
import { BookRailItem } from '../components/BookCards';
import Button from '../components/Button';
import { Tag } from '../components/Chip';
import ErrorBanner from '../components/ErrorBanner';
import LoadingView from '../components/LoadingView';
import ProgressBar from '../components/ProgressBar';
import { Page } from '../components/ScreenScroll';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { t } from '../i18n';

function QuickAction({ icon, label, onPress, tone = 'sage' }) {
  const bg = tone === 'gold' ? colors.gold : colors.surfaceTint;
  const fg = tone === 'gold' ? colors.onGold : colors.primaryText;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.qaItem}>
      <View style={[styles.qaCircle, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={24} color={fg} />
      </View>
      <Text style={styles.qaLabel} numberOfLines={2}>{t(label)}</Text>
    </Pressable>
  );
}

function ShortcutCard({ icon, title, subtitle, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.85 }]}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primarySoft} />
      <View style={{ flex: 1 }}>
        <Text style={styles.shortcutTitle}>{t(title)}</Text>
        <Text style={type.small} numberOfLines={1}>{t(subtitle)}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textFaint} />
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFocusData(getHomeData, []);

  if (loading && !data) return <LoadingView />;
  if (!data) {
    return (
      <Page style={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <ErrorBanner message={error || 'Could not load your library.'} onRetry={reload} />
      </Page>
    );
  }

  const firstName = (data.profile?.display_name || 'Reader').split(' ')[0];
  const openBook = (book) => navigation.navigate('BookDetails', { bookId: book.id });
  const lastReading = data.reading[0];

  const continueReading = () => {
    if (lastReading) navigation.navigate('ReadingTracker', { bookId: lastReading.id, openForm: true, stamp: Date.now() });
    else {
      showToast(t('No book in progress yet — pick one from your shelf.'), 'error');
      navigation.navigate('Bookshelf');
    }
  };

  const c = data.activeChallenge;

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}>
        {/* Brand bar */}
        <View style={styles.brandBar}>
          <View style={styles.brandLeft}>
            <View style={styles.logoMark}>
              <MaterialCommunityIcons name="book-open-page-variant" size={20} color={colors.white} />
            </View>
            <View>
              <Text style={styles.brand}>{t('PAGEORIA')}</Text>
              <Text style={styles.brandSub}>{t('DIGITAL BOOK HAVEN')}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => navigation.navigate('Settings')} accessibilityRole="button" accessibilityLabel={t('Settings')} style={styles.gear}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={colors.primaryText} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel={t('Profile')} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(data.profile?.display_name)}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.pad}>
          {/* Welcome */}
          <Text style={styles.eyebrow}>{formatDate(todayISO())}</Text>
          <Text style={styles.hello}>{greeting()}, {firstName}</Text>
          <Text style={styles.tagline}>{TAGLINE}</Text>

          <View style={styles.streakCard}>
            <View style={styles.streakIcon}>
              <MaterialCommunityIcons name="fire" size={22} color={colors.terracotta} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakTitle}>
                {data.streak > 0 ? t('{n}-day reading streak', { n: data.streak }) : t('Start a new reading streak')}
              </Text>
              <Text style={type.small}>
                {data.readingCount > 0
                  ? t(data.readingCount === 1 ? '{n} book in hand · {p}% through them' : '{n} books in hand · {p}% through them', { n: data.readingCount, p: data.readingProgress })
                  : 'Log a session today to begin your streak.'}
              </Text>
            </View>
          </View>

          {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

          {/* Stats (all computed from the database) */}
          <View style={styles.statGrid}>
            <StatCard label={t('Shelved')} value={formatNumber(data.totalBooks)} caption={t('Total volumes')} icon="bookshelf" />
            <StatCard label={t('In hand')} value={formatNumber(data.readingCount)} caption={t('Currently reading')} icon="book-open-variant" />
          </View>
          <View style={styles.statGrid}>
            <StatCard label={t('Finished')} value={formatNumber(data.completedCount)} caption={t('Books completed')} icon="check-circle-outline" tint={colors.complete} tintBg={colors.greenSoft} />
            <StatCard label={t('Sessions')} value={formatNumber(data.sessions)} caption={t('Reading sessions')} icon="timer-sand" tint={colors.ochre} tintBg={colors.goldSoft} />
          </View>
          <View style={styles.statGrid}>
            <StatCard label={t('Traversed')} value={formatNumber(data.pagesRead)} caption={t('Pages explored')} icon="file-document-outline" />
            <StatCard label={t('Streak')} value={`${data.streak}`} caption={data.streak === 1 ? 'Day in a row' : 'Days in a row'} icon="fire" tint={colors.terracotta} tintBg={colors.roseSoft} />
          </View>

          {/* Quick actions */}
          <SectionHeader title={t('Desk Implements')} subtitle={t('Touch to engage')} style={{ marginTop: 22 }} />
          <View style={styles.qaRow}>
            <QuickAction icon="book-plus-outline" label={t('Add a New Book')} onPress={() => navigation.navigate('AddEditBook')} />
            <QuickAction icon="book-open-page-variant-outline" label={t('Continue Reading')} onPress={continueReading} />
            <QuickAction icon="feather" label={t('Write a Journal Entry')} onPress={() => navigation.navigate('Journal', { openNew: true, stamp: Date.now() })} />
            <QuickAction icon="bookshelf" label={t('Explore My Library')} onPress={() => navigation.navigate('Bookshelf')} tone="gold" />
          </View>

          {/* Currently reading */}
          <SectionHeader
            title={t('Currently Immersed')}
            subtitle={data.reading.length ? 'Active desk leaves & marginalia' : 'Nothing in progress yet'}
            actionLabel={data.reading.length ? t('{n} active', { n: data.reading.length }) : undefined}
            onAction={() => navigation.navigate('Bookshelf')}
            style={{ marginTop: 22 }}
          />
          {data.reading.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={type.bodySoft}>{t('Mark a book as “Currently Reading” and it will appear here with its progress.')}</Text>
              <Button title={t('Browse my bookshelf')} small variant="soft" onPress={() => navigation.navigate('Bookshelf')} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            </View>
          ) : (
            data.reading.slice(0, 3).map((book) => {
              const pct = percent(book.current_page, book.total_pages);
              return (
                <Pressable key={book.id} onPress={() => openBook(book)} style={styles.immersed} accessibilityRole="button" accessibilityLabel={book.title}>
                  <View style={styles.immersedStripe} />
                  <BookCover book={book} width={76} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.immersedTop}>
                      <Tag label={book.genre} />
                      <Text style={styles.pctText}>{t('{n}% done', { n: pct })}</Text>
                    </View>
                    <Text style={styles.immersedTitle} numberOfLines={2}>{book.title}</Text>
                    <Text style={type.bodySoft} numberOfLines={1}>{book.author}</Text>
                    <ProgressBar value={pct} style={{ marginTop: 10 }} />
                    <View style={styles.immersedBottom}>
                      <Text style={type.small}>{t('p. {a} of {b} · {c} left', { a: book.current_page, b: book.total_pages, c: book.total_pages - book.current_page })}</Text>
                      <Pressable
                        onPress={() => navigation.navigate('ReadingTracker', { bookId: book.id, openForm: true, stamp: Date.now() })}
                        style={styles.continueBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Log session for ${book.title}`}
                      >
                        <Text style={styles.continueText}>{t('Continue')}</Text>
                        <MaterialCommunityIcons name="arrow-right" size={14} color={colors.white} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* Challenge */}
          {c ? (
            <Pressable onPress={() => navigation.navigate('Challenges')} style={styles.challenge} accessibilityRole="button" accessibilityLabel="Open reading challenges">
              <View style={styles.challengeTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.challengeEyebrow}>{c.isCompleted ? t('QUEST COMPLETE') : t('READING CHALLENGE')}</Text>
                  <Text style={styles.challengeTitle}>{c.title}</Text>
                </View>
                <Text style={styles.challengePct}>{c.percent}%</Text>
              </View>
              <Text style={styles.challengeSub}>{t('{a} of {b} books completed', { a: c.progress, b: c.target_books })}</Text>
              <ProgressBar value={c.percent} height={8} color={colors.gold} pip={false} style={{ backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 10 }} />
              <Text style={styles.challengeFoot}>
                {c.isCompleted ? t('Beautifully done!') : c.isExpired ? t('Deadline passed') : t('{a} to go · {b} days left', { a: c.remaining, b: c.daysLeft })}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => navigation.navigate('Challenges')} style={styles.emptyBox} accessibilityRole="button">
              <Text style={type.title}>{t('Set your first reading challenge')}</Text>
              <Text style={type.bodySoft}>{t('Create a goal like “Read 12 books this year”.')}</Text>
            </Pressable>
          )}

          {/* Recently added */}
          <SectionHeader title={t('Recently Added')} subtitle={t('Fresh arrivals on your shelf')} actionLabel={t('View all')} onAction={() => navigation.navigate('Bookshelf')} style={{ marginTop: 22 }} />
          {data.recent.length === 0 ? (
            <Text style={type.bodySoft}>{t('Your shelf is empty. Add your first book to begin.')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {data.recent.map((b) => <BookRailItem key={b.id} book={b} onPress={openBook} />)}
            </ScrollView>
          )}

          {/* Favourites */}
          <SectionHeader title={t('Treasured Favourites')} subtitle={t('Timeless editions in your alcove')} style={{ marginTop: 22 }} />
          {data.favourites.length === 0 ? (
            <Text style={type.bodySoft}>{t('Tap the heart on any book to keep it close here.')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {data.favourites.map((b) => <BookRailItem key={b.id} book={b} onPress={openBook} showRating />)}
            </ScrollView>
          )}

          {/* Shortcuts to the remaining screens */}
          <SectionHeader title={t('Wander the Sanctuary')} style={{ marginTop: 22 }} />
          <View style={{ gap: 10 }}>
            <ShortcutCard icon="timer-outline" title={t('Reading Tracker')} subtitle={t('Log sessions & see your weekly rhythm')} onPress={() => navigation.navigate('ReadingTracker')} />
            <ShortcutCard icon="format-quote-close" title={t('Quotes & Reviews')} subtitle={t('Your favourite lines and critiques')} onPress={() => navigation.navigate('QuotesReviews')} />
            <ShortcutCard icon="trophy-outline" title={t('Reading Quests')} subtitle={t('Goals, deadlines and progress')} onPress={() => navigation.navigate('Challenges')} />
            <ShortcutCard icon="chart-box-outline" title={t('Statistics')} subtitle={t('Literary analytics from your records')} onPress={() => navigation.navigate('Statistics')} />
          </View>

          {/* Quote of the day */}
          {data.quote ? (
            <View style={styles.quoteCard}>
              <Text style={styles.quoteEyebrow}>{t('FROM YOUR COMMONPLACE BOOK')}</Text>
              <Text style={styles.quoteText}>“{truncate(data.quote.quote_text, 180)}”</Text>
              <Text style={styles.quoteBy}>— {data.quote.author || t('Unknown')} · {data.quote.book_title}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = themedStyles(() => ({
  brandBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: fonts.serifBold, fontSize: 19, letterSpacing: 2, color: colors.primaryText },
  brandSub: { fontFamily: fonts.sansBold, fontSize: 8.5, letterSpacing: 1.6, color: colors.ochre, marginTop: -1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface, ...shadows.card },
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.serifBold, fontSize: 14, color: colors.onGold },
  pad: { paddingHorizontal: 20 },
  eyebrow: { ...type.label, color: colors.ochre, marginTop: 6 },
  hello: { ...type.display, marginTop: 4 },
  tagline: { fontFamily: fonts.serifItalic, fontSize: 15.5, color: colors.textSoft, marginTop: 2 },
  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceTint, borderRadius: radius.lg,
    padding: 14, marginTop: 16, marginBottom: 14,
  },
  streakIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  streakTitle: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.text, marginBottom: 1 },
  statGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  qaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  qaItem: { flex: 1, alignItems: 'center', gap: 8 },
  qaCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontFamily: fonts.sansMedium, fontSize: 11.5, lineHeight: 15, color: colors.text, textAlign: 'center' },
  emptyBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, marginTop: 4 },
  immersed: {
    flexDirection: 'row', gap: 14, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, paddingLeft: 18,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: 'hidden', ...shadows.lifted,
  },
  immersedStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: colors.primary },
  immersedTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctText: { fontFamily: fonts.sansBold, fontSize: 11.5, color: colors.ochre },
  immersedTitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 24, color: colors.text, marginTop: 6 },
  immersedBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  continueBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, height: 32, borderRadius: radius.md },
  continueText: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.white },
  challenge: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: 20, marginTop: 10, ...shadows.lifted },
  challengeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  challengeEyebrow: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 1.2, color: colors.gold },
  challengeTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.white, marginTop: 3 },
  challengePct: { fontFamily: fonts.serif, fontSize: 30, color: colors.gold },
  challengeSub: { fontFamily: fonts.sansMedium, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  challengeFoot: { fontFamily: fonts.sans, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 10 },
  rail: { gap: 14, paddingRight: 20, paddingBottom: 4 },
  shortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  shortcutTitle: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.text },
  quoteCard: { backgroundColor: colors.parchment, borderRadius: radius.lg, padding: 20, marginTop: 24, borderLeftWidth: 3, borderLeftColor: colors.ochre },
  quoteEyebrow: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.2, color: colors.ochre },
  quoteText: { fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 28, color: colors.text, marginTop: 8 },
  quoteBy: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.textSoft, marginTop: 10 },
}));
