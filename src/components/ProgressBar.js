import React from 'react';
import {View} from 'react-native';
import { colors, themedStyles } from '../constants/theme';

// "Book-spine" progress bar with a small page-marker pip at the current position.
export default function ProgressBar({ value = 0, height = 6, color = colors.primarySoft, style, pip = true }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={[styles.track, { height, borderRadius: height }, style]}>
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: pct >= 100 ? colors.complete : color,
          borderRadius: height,
        }}
      />
      {pip && pct > 3 && pct < 99 ? (
        <View style={[styles.pip, { left: `${pct}%`, height: height + 4, top: -2 }]} />
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  track: { backgroundColor: colors.border, overflow: 'visible', width: '100%' },
  pip: { position: 'absolute', width: 3, marginLeft: -2, backgroundColor: colors.surface, borderRadius: 2, borderWidth: 0.5, borderColor: colors.borderStrong },
}));
