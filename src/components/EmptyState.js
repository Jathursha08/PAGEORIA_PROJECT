import React from 'react';
import {Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, type, themedStyles } from '../constants/theme';
import Button from './Button';
import { t } from '../i18n';

export default function EmptyState({ icon = 'book-open-page-variant-outline', title, message, actionLabel, onAction }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={icon} size={34} color={colors.primarySoft} />
      </View>
      <Text style={styles.title}>{t(title)}</Text>
      {message ? <Text style={styles.message}>{t(message)}</Text> : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} variant="primary" small style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 28 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { ...type.h3, textAlign: 'center' },
  message: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.textSoft, textAlign: 'center', marginTop: 6 },
}));
