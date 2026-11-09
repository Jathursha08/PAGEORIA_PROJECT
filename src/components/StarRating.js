import React from 'react';
import {Pressable, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, themedStyles } from '../constants/theme';

// Read-only when no onChange is supplied. Tapping the current rating again clears it (unless required).
export default function StarRating({ value = 0, onChange, size = 18, clearable = true, gap = 2 }) {
  const rating = Number(value) || 0;
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half-full' : 'star-outline';
        const icon = <MaterialCommunityIcons name={name} size={size} color={colors.star} />;
        if (!onChange) return <View key={i} style={{ marginRight: gap }}>{icon}</View>;
        return (
          <Pressable
            key={i}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}
            onPress={() => onChange(clearable && rating === i ? 0 : i)}
            style={{ marginRight: gap + 2 }}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({ row: { flexDirection: 'row', alignItems: 'center' } }));
