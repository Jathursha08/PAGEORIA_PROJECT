import React from 'react';
import {Pressable, Text, View, useWindowDimensions} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import { STATUS } from '../constants/options';
import { percent } from '../utils/format';
import BookCover from './BookCover';
import ProgressBar from './ProgressBar';
import StarRating from './StarRating';
import { StatusBadge } from './Chip';
import { t } from '../i18n';

function FavouriteButton({ book, onToggle }) {
  if (!onToggle) return null;
  return (
    <Pressable
      onPress={() => onToggle(book)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={book.is_favourite ? t('Remove from favourites') : t('Add to favourites')}
      style={styles.heart}
    >
      <MaterialCommunityIcons
        name={book.is_favourite ? 'heart' : 'heart-outline'}
        size={18}
        color={book.is_favourite ? colors.terracotta : colors.textSoft}
      />
    </Pressable>
  );
}

// Two-column grid card used on the bookshelf
export function BookGridCard({ book, onPress, onToggleFavourite }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((Math.min(width, 640) - 40 - 12) / 2);
  const coverWidth = cardWidth - 24;
  const pct = percent(book.current_page, book.total_pages);
  return (
    <Pressable
      onPress={() => onPress(book)}
      accessibilityRole="button"
      accessibilityLabel={`${book.title} by ${book.author}`}
      style={({ pressed }) => [styles.gridCard, { width: cardWidth }, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
    >
      <View style={{ alignItems: 'center' }}>
        <BookCover book={book} width={coverWidth} />
        {book.status === STATUS.COMPLETED ? (
          <View style={styles.doneBadge}>
            <MaterialCommunityIcons name="check-all" size={12} color={colors.white} />
            <Text style={styles.doneText}>{t('Done')}</Text>
          </View>
        ) : null}
        {book.status === STATUS.WANT ? (
          <View style={[styles.doneBadge, { backgroundColor: colors.gold }]}>
            <MaterialCommunityIcons name="bookmark-outline" size={12} color={colors.onGold} />
            <Text style={[styles.doneText, { color: colors.onGold }]}>{t('Want')}</Text>
          </View>
        ) : null}
        <View style={styles.heartPos}><FavouriteButton book={book} onToggle={onToggleFavourite} /></View>
        {book.status === STATUS.READING ? (
          <View style={styles.progressOverlay}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressText}>{pct}%</Text>
              <Text style={styles.progressText}>{book.current_page}/{book.total_pages}p</Text>
            </View>
            <ProgressBar value={pct} height={4} color={colors.gold} pip={false} style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
          </View>
        ) : null}
      </View>
      <Text style={styles.genre} numberOfLines={1}>{t(book.genre)}</Text>
      <Text style={styles.gridTitle} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.gridAuthor} numberOfLines={1}>{book.author}</Text>
      <View style={styles.metaPill}>
        <View style={styles.metaRating}>
          <MaterialCommunityIcons name="star" size={14} color={book.rating > 0 ? colors.star : colors.borderStrong} />
          <Text style={styles.metaRatingText}>{book.rating > 0 ? Number(book.rating).toFixed(1) : '–'}</Text>
        </View>
        <Text style={styles.metaStatus} numberOfLines={1}>
          {book.status === STATUS.READING ? t('Reading') : book.status === STATUS.COMPLETED ? t('Completed') : book.status === STATUS.HOLD ? t('On Hold') : t('{n} p.', { n: book.total_pages })}
        </Text>
      </View>
    </Pressable>
  );
}

// Full-width row used for the list layout
export function BookListRow({ book, onPress, onToggleFavourite }) {
  const pct = percent(book.current_page, book.total_pages);
  return (
    <Pressable
      onPress={() => onPress(book)}
      accessibilityRole="button"
      accessibilityLabel={`${book.title} by ${book.author}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
    >
      <BookCover book={book} width={62} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.genre} numberOfLines={1}>{t(book.genre)}</Text>
        <Text style={[type.title, { fontFamily: fonts.serif, fontSize: 17, lineHeight: 22 }]} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.gridAuthor} numberOfLines={1}>{book.author}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <StatusBadge status={book.status} small />
          {book.rating > 0 ? <StarRating value={book.rating} size={13} gap={0} /> : null}
        </View>
        {book.status === STATUS.READING ? (
          <View style={{ marginTop: 6 }}>
            <ProgressBar value={pct} height={5} />
            <Text style={[type.small, { marginTop: 3 }]}>{t('{pct}% · p. {a} of {b}', { pct, a: book.current_page, b: book.total_pages })}</Text>
          </View>
        ) : null}
      </View>
      {onToggleFavourite ? <FavouriteButton book={book} onToggle={onToggleFavourite} /> : null}
    </Pressable>
  );
}

// Small cover + caption used in horizontal rails
export function BookRailItem({ book, onPress, width = 112, showRating }) {
  return (
    <Pressable onPress={() => onPress(book)} style={{ width }} accessibilityRole="button" accessibilityLabel={book.title}>
      <BookCover book={book} width={width} />
      {showRating && book.rating > 0 ? (
        <View style={styles.railRating}>
          <MaterialCommunityIcons name="star" size={11} color={colors.star} />
          <Text style={styles.railRatingText}>{Number(book.rating).toFixed(1)}</Text>
        </View>
      ) : null}
      <Text style={styles.railTitle} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.railMeta} numberOfLines={1}>{t(book.genre)}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  gridCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  heartPos: { position: 'absolute', top: 6, right: 6 },
  heart: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  doneBadge: {
    position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: 8, height: 22, borderRadius: 11,
  },
  doneText: { fontFamily: fonts.sansBold, fontSize: 10.5, color: colors.white },
  progressOverlay: { position: 'absolute', left: 8, right: 8, bottom: 8 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressText: { fontFamily: fonts.sansBold, fontSize: 10.5, color: colors.white, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
  genre: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 0.8, color: colors.ochre, textTransform: 'uppercase', marginTop: 10 },
  gridTitle: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 21, color: colors.text, marginTop: 2, minHeight: 42 },
  gridAuthor: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSoft },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.softBg,
    borderRadius: radius.sm + 2, paddingHorizontal: 8, height: 28, marginTop: 8,
  },
  metaRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaRatingText: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.text },
  metaStatus: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textSoft },
  row: {
    flexDirection: 'row', gap: 14, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start', ...shadows.card,
  },
  railRating: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 6, height: 20, borderRadius: 10 },
  railRatingText: { fontFamily: fonts.sansBold, fontSize: 10.5, color: colors.text },
  railTitle: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 18, color: colors.text, marginTop: 8 },
  railMeta: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSoft, marginTop: 1 },
}));
