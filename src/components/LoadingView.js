import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import { colors, fonts, themedStyles } from '../constants/theme';
import { t } from '../i18n';

export default function LoadingView({ label = 'Opening your library…' }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.primarySoft} />
      <Text style={styles.text}>{t(label)}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, backgroundColor: colors.background },
  text: { fontFamily: fonts.serifItalic, fontSize: 15, color: colors.textSoft },
}));
