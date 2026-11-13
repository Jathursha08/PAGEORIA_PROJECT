import React from 'react';
import {Text, View} from 'react-native';
import { colors, fonts, themedStyles } from '../constants/theme';

// Simple View-based bar chart. data: [{ label, value, highlight?, faded? }]
export default function BarChart({ data, height = 120, showValues = true, barColor = colors.primarySoft, highlightColor = colors.ochre }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.row}>
      {data.map((d, i) => {
        const h = d.value > 0 ? Math.max(6, (d.value / max) * height) : 4;
        return (
          <View key={`${d.label}-${i}`} style={styles.col}>
            <Text style={styles.value}>{showValues && d.value > 0 ? d.value : showValues ? '–' : ''}</Text>
            <View style={{ height, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
              <View
                style={{
                  width: '72%',
                  maxWidth: 34,
                  height: h,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderBottomLeftRadius: 2,
                  borderBottomRightRadius: 2,
                  backgroundColor: d.value === 0 ? colors.border : d.highlight ? highlightColor : barColor,
                  opacity: d.faded ? 0.45 : 1,
                }}
              />
            </View>
            <Text style={[styles.label, d.highlight && { color: colors.ochre, fontFamily: fonts.sansBold }]}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  col: { flex: 1, alignItems: 'center' },
  value: { fontFamily: fonts.sansSemi, fontSize: 10.5, color: colors.textSoft, marginBottom: 4, minHeight: 14 },
  label: { fontFamily: fonts.sansMedium, fontSize: 10.5, color: colors.textSoft, marginTop: 6 },
}));
