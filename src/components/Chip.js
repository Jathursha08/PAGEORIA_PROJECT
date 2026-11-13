import React from 'react';
import {Pressable, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, themedStyles } from '../constants/theme';
import { STATUS, STATUS_SHORT } from '../constants/options';
import { t } from '../i18n';

export function FilterChip({ label, count, active, onPress, icon }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.8 }]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={14} color={active ? colors.white : colors.primarySoft} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(label)}</Text>
      {count !== undefined && count !== null ? (
        <Text style={[styles.chipCount, active && { color: 'rgba(255,255,255,0.75)' }]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

const getStatusStyle = () => ({
  [STATUS.WANT]: { bg: colors.goldSoft, fg: colors.goldInk, icon: 'bookmark-outline' },
  [STATUS.READING]: { bg: colors.surfaceTint, fg: colors.primaryText, icon: 'book-open-page-variant-outline' },
  [STATUS.COMPLETED]: { bg: colors.greenSoft, fg: colors.complete, icon: 'check-circle-outline' },
  [STATUS.HOLD]: { bg: colors.holdBg, fg: colors.holdFg, icon: 'pause-circle-outline' },
});

export function StatusBadge({ status, small = false, style }) {
  const map = getStatusStyle();
  const s = map[status] || map[STATUS.WANT];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }, small && styles.badgeSmall, style]}>
      <MaterialCommunityIcons name={s.icon} size={small ? 12 : 14} color={s.fg} />
      <Text style={[styles.badgeText, { color: s.fg }, small && { fontSize: 11 }]}>{t(STATUS_SHORT[status] || status)}</Text>
    </View>
  );
}

export function Tag({ label, tone = 'sage', style, icon }) {
  const tones = {
    sage: { bg: colors.surfaceTint, fg: colors.primaryText },
    gold: { bg: colors.goldSoft, fg: colors.goldInk },
    rose: { bg: colors.roseSoft, fg: colors.roseInk },
    plain: { bg: colors.plainBg, fg: colors.textSoft },
  };
  const tc = tones[tone] || tones.sage;
  return (
    <View style={[styles.badge, styles.badgeSmall, { backgroundColor: tc.bg }, style]}>
      {icon ? <MaterialCommunityIcons name={icon} size={12} color={tc.fg} /> : null}
      <Text style={[styles.badgeText, { color: tc.fg, fontSize: 11.5 }]} numberOfLines={1}>
        {t(label)}
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white },
  chipCount: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textFaint },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
  },
  badgeSmall: { height: 24, paddingHorizontal: 9 },
  badgeText: { fontFamily: fonts.sansSemi, fontSize: 12.5 },
}));
