import React from 'react';
import {Pressable, TextInput, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, themedStyles } from '../constants/theme';
import { t } from '../i18n';

export default function SearchBar({ value, onChangeText, placeholder = 'Search…', style }) {
  return (
    <View style={[styles.wrap, style]}>
      <MaterialCommunityIcons name="magnify" size={21} color={colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t(placeholder)}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={t(placeholder)}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search">
          <MaterialCommunityIcons name="close-circle" size={18} color={colors.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 14.5, color: colors.text, paddingVertical: 0 },
}));
