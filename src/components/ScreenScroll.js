import React from 'react';
import {RefreshControl, ScrollView, View} from 'react-native';
import { colors, themedStyles } from '../constants/theme';

// Standard scrolling page body (keeps content clear of the bottom tab bar)
export default function ScreenScroll({ children, onRefresh, refreshing = false, bottomPad = 110, style, contentStyle, keyboardShouldPersistTaps = 'handled' }) {
  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[{ paddingHorizontal: 20, paddingBottom: bottomPad, paddingTop: 6 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primarySoft} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Page({ children, style }) {
  return <View style={[styles.page, style]}>{children}</View>;
}

const styles = themedStyles(() => ({
  scroll: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, backgroundColor: colors.background },
}));
