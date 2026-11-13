import React from 'react';
import {ActivityIndicator, Pressable, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, themedStyles } from '../constants/theme';
import { t } from '../i18n';

const getVariants = () => ({
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.primaryText, border: colors.primarySoft },
  soft: { bg: colors.surfaceTint, fg: colors.primaryText, border: 'transparent' },
  gold: { bg: colors.gold, fg: colors.onGold, border: colors.gold },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.dangerBorder },
  ghost: { bg: 'transparent', fg: colors.primaryText, border: 'transparent' },
});

export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  small = false,
  loading = false,
  disabled = false,
  style,
  full = false,
}) {
  const variants = getVariants();
  const v = variants[variant] || variants.primary;
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(title)}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: v.bg, borderColor: v.border },
        full && { alignSelf: 'stretch' },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <MaterialCommunityIcons name={icon} size={small ? 16 : 19} color={v.fg} /> : null}
          <Text style={[styles.text, small && styles.textSmall, { color: v.fg }]}>{t(title)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  base: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 38, paddingHorizontal: 14, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: fonts.sansSemi, fontSize: 15 },
  textSmall: { fontSize: 13.5 },
}));
