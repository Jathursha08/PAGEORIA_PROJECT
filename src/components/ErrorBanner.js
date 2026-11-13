import React from 'react';
import {Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, themedStyles } from '../constants/theme';
import Button from './Button';
import { t } from '../i18n';

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} />
      <Text style={styles.text}>{message}</Text>
      {onRetry ? <Button title={t('Retry')} small variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: radius.md, marginVertical: 8 },
  text: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.danger },
}));
