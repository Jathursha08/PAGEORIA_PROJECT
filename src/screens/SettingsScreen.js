import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, palettes, radius, shadows, themedStyles, type } from '../constants/theme';
import { APP_VERSION } from '../constants/options';
import { LANGUAGES, t } from '../i18n';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { exportBooksAsJson, runImportWithSummary, shareCsvTemplate } from '../utils/bookFiles';
import Button from '../components/Button';
import { Page } from '../components/ScreenScroll';
import ScreenHeader from '../components/ScreenHeader';

const THEMES = [
  { key: 'system', label: 'Follow system', hint: 'Matches your phone’s light or dark mode' },
  { key: 'sage', label: 'Sage Light', hint: 'Warm cream and sage — the classic look' },
  { key: 'parchment', label: 'Parchment', hint: 'Sepia pages, easy on the eyes' },
  { key: 'midnight', label: 'Midnight Dark', hint: 'Dark library for night reading' },
];

function Swatch({ themeKey }) {
  const p = themeKey === 'system' ? null : palettes[themeKey];
  if (!p) {
    return (
      <View style={styles.swatchWrap}>
        <View style={[styles.half, { backgroundColor: palettes.sage.background, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }]} />
        <View style={[styles.half, { backgroundColor: palettes.midnight.background, borderTopRightRadius: 10, borderBottomRightRadius: 10 }]} />
      </View>
    );
  }
  return (
    <View style={[styles.swatchWrap, { backgroundColor: p.background, borderColor: p.borderStrong }]}>
      <View style={[styles.chip, { backgroundColor: p.surface, borderColor: p.border }]} />
      <View style={[styles.dot, { backgroundColor: p.primary }]} />
      <View style={[styles.dotSmall, { backgroundColor: p.gold }]} />
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const { language, themeMode, setLanguage, setThemeMode } = useSettings();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(null);

  const run = async (key, fn, okMessage) => {
    setBusy(key);
    try {
      const result = await fn();
      if (okMessage && result) showToast(okMessage(result));
    } catch (e) {
      showToast(e.message || t('Something went wrong.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Page>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        eyebrow="PREFERENCES"
        title="Settings"
        subtitle="Make PAGEORIA feel like yours."
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, paddingTop: 6, gap: 16 }}>
        {/* Language */}
        <View style={styles.card}>
          <View style={styles.head}>
            <MaterialCommunityIcons name="translate" size={22} color={colors.primaryText} />
            <Text style={type.h3}>{t('Language')}</Text>
          </View>
          <Text style={[type.small, { marginBottom: 6 }]}>{t('Choose the language of the whole app. Your books and notes stay exactly as you wrote them.')}</Text>
          {LANGUAGES.map((l) => {
            const active = language === l.code;
            return (
              <Pressable key={l.code} onPress={() => setLanguage(l.code)} accessibilityRole="radio" accessibilityState={{ selected: active }} style={[styles.row, active && styles.rowActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{l.native}</Text>
                  <Text style={type.small}>{l.english}</Text>
                </View>
                <MaterialCommunityIcons name={active ? 'check-circle' : 'circle-outline'} size={24} color={active ? colors.primaryText : colors.borderStrong} />
              </Pressable>
            );
          })}
        </View>

        {/* Theme */}
        <View style={styles.card}>
          <View style={styles.head}>
            <MaterialCommunityIcons name="palette-outline" size={22} color={colors.primaryText} />
            <Text style={type.h3}>{t('Theme')}</Text>
          </View>
          {THEMES.map((th) => {
            const active = themeMode === th.key;
            return (
              <Pressable key={th.key} onPress={() => setThemeMode(th.key)} accessibilityRole="radio" accessibilityState={{ selected: active }} style={[styles.row, active && styles.rowActive]}>
                <Swatch themeKey={th.key} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{t(th.label)}</Text>
                  <Text style={type.small}>{t(th.hint)}</Text>
                </View>
                <MaterialCommunityIcons name={active ? 'check-circle' : 'circle-outline'} size={24} color={active ? colors.primaryText : colors.borderStrong} />
              </Pressable>
            );
          })}
        </View>

        {/* Library upload / export */}
        <View style={styles.card}>
          <View style={styles.head}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={22} color={colors.primaryText} />
            <Text style={type.h3}>{t('Upload books')}</Text>
          </View>
          <Text style={type.bodySoft}>
            {t('Add many books at once from a .csv or .json file. Books already on your shelf are skipped. Columns: title, author, genre, total_pages, current_page, status, rating, description.')}
          </Text>
          <Button title="Import books from file" icon="file-upload-outline" loading={busy === 'import'} onPress={() => run('import', () => runImportWithSummary(showToast))} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Export my books" icon="export-variant" variant="soft" small style={{ flex: 1 }} loading={busy === 'export'} onPress={() => run('export', exportBooksAsJson, (n) => t('{n} books exported.', { n }))} />
            <Button title="Download CSV template" icon="file-delimited-outline" variant="soft" small style={{ flex: 1 }} loading={busy === 'tpl'} onPress={() => run('tpl', async () => { await shareCsvTemplate(); return null; })} />
          </View>
          <View style={styles.tip}>
            <MaterialCommunityIcons name="paperclip" size={18} color={colors.goldInk} />
            <Text style={styles.tipText}>{t('To attach a PDF or EPUB to one book, open the book and tap “Upload book file”.')}</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.about}>
          <Text style={styles.brand}>PAGEORIA</Text>
          <Text style={type.small}>{t('Version {v}', { v: APP_VERSION })}</Text>
          <Text style={styles.tag}>{t('Where Every Book Opens a New World.')}</Text>
          <Text style={[type.small, { marginTop: 6 }]}>{t('Everything is stored on this device. No account and no internet needed.')}</Text>
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = themedStyles(() => ({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10, ...shadows.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  rowActive: { borderColor: colors.primarySoft, backgroundColor: colors.surfaceTint },
  rowTitle: { fontFamily: fonts.sansSemi, fontSize: 15.5, color: colors.text },
  swatchWrap: { width: 54, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden' },
  half: { flex: 1, height: '100%' },
  chip: { width: 20, height: 24, borderRadius: 5, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotSmall: { width: 6, height: 6, borderRadius: 3 },
  tip: { flexDirection: 'row', gap: 8, backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: 10, alignItems: 'flex-start' },
  tipText: { flex: 1, fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: colors.goldInk },
  about: { alignItems: 'center', paddingVertical: 12, gap: 2 },
  brand: { fontFamily: fonts.serifBold, fontSize: 18, letterSpacing: 3, color: colors.primaryText },
  tag: { fontFamily: fonts.serifItalic, fontSize: 14, color: colors.textSoft, marginTop: 4 },
}));
