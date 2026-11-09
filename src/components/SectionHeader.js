import React from 'react';
import {Pressable, Text, View} from 'react-native';
import { colors, fonts, type, themedStyles } from '../constants/theme';
import { t } from '../i18n';

export default function SectionHeader({ title, subtitle, actionLabel, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t(title)}</Text>
        {subtitle ? <Text style={styles.subtitle}>{t(subtitle)}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.action}>{t(actionLabel)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 },
  title: { ...type.h2 },
  subtitle: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.textSoft, marginTop: 1 },
  action: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.8, color: colors.ochre, textTransform: 'uppercase', paddingBottom: 3 },
}));
