import React from 'react';
import {Pressable, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, themedStyles } from '../constants/theme';
import { t } from '../i18n';

export default function SegmentedTabs({ tabs, value, onChange, style }) {
  return (
    <View style={[styles.wrap, style]}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, active && styles.tabActive]}
          >
            {tab.icon ? <MaterialCommunityIcons name={tab.icon} size={17} color={active ? colors.white : colors.primarySoft} /> : null}
            <Text style={[styles.text, active && styles.textActive]}>{t(tab.label)}</Text>
            {tab.count !== undefined ? (
              <View style={[styles.count, active && { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                <Text style={[styles.countText, active && { color: colors.white }]}>{tab.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { flexDirection: 'row', backgroundColor: colors.segmentBg, borderRadius: radius.lg, padding: 4, gap: 4 },
  tab: { flex: 1, height: 44, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabActive: { backgroundColor: colors.primary },
  text: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.primaryText },
  textActive: { color: colors.white },
  count: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textSoft },
}));
