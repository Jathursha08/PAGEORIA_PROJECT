import React from 'react';
import {Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, type, themedStyles } from '../constants/theme';
import { t } from '../i18n';

export default function StatCard({ label, value, caption, icon, tint = colors.primarySoft, tintBg = colors.surfaceTint, style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <Text style={styles.label}>{t(label)}</Text>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: tintBg }]}>
            <MaterialCommunityIcons name={icon} size={17} color={tint} />
          </View>
        ) : null}
      </View>
      <Text style={styles.value} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      {caption ? <Text style={styles.caption} numberOfLines={1}>{t(caption)}</Text> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    flex: 1, minWidth: 140, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...type.label, fontSize: 10.5 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36, color: colors.text, marginTop: 6 },
  caption: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.textSoft },
}));
