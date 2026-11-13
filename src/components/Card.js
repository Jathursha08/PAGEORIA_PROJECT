import React from 'react';
import {Pressable, View} from 'react-native';
import { colors, radius, shadows, themedStyles } from '../constants/theme';

export default function Card({ children, onPress, style, tone = 'default', accessibilityLabel }) {
  const toneStyle = tone === 'tint' ? { backgroundColor: colors.surfaceTint, borderColor: 'transparent' } : null;
  const content = [styles.card, toneStyle, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [...content, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={content}>{children}</View>;
}

const styles = themedStyles(() => ({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, ...shadows.card },
}));
