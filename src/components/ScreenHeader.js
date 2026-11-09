import React from 'react';
import {Pressable, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, type, themedStyles } from '../constants/theme';
import { t } from '../i18n';

export function IconButton({ icon, onPress, color = colors.primaryText, size = 22, active, label, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || icon}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, active && { backgroundColor: colors.roseSoft }, pressed && { opacity: 0.7 }, style]}
    >
      <MaterialCommunityIcons name={icon} size={size} color={color} />
    </Pressable>
  );
}

// Editorial page heading with optional back arrow and right-hand actions.
export default function ScreenHeader({ eyebrow, title, subtitle, onBack, right, backLabel }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      {onBack || right ? (
        <View style={styles.topRow}>
          {onBack ? (
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primaryText} />
              <Text style={styles.backText}>{t(backLabel || 'Back')}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <View style={styles.rightRow}>{right}</View>
        </View>
      ) : null}
      {eyebrow ? <Text style={styles.eyebrow}>{t(eyebrow)}</Text> : null}
      <Text style={styles.title}>{t(title)}</Text>
      {subtitle ? <Text style={styles.subtitle}>{t(subtitle)}</Text> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { paddingHorizontal: 20, paddingBottom: 10, backgroundColor: colors.background },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceTint,
    paddingHorizontal: 12, height: 36, borderRadius: 18,
  },
  backText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.primaryText },
  eyebrow: { ...type.label, color: colors.ochre, marginBottom: 4 },
  title: { ...type.h1 },
  subtitle: { fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 22, color: colors.textSoft, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
}));
