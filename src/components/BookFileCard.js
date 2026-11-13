import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, themedStyles } from '../constants/theme';
import { t } from '../i18n';
import { extensionOf, formatBytes } from '../utils/bookFiles';
import Button from './Button';

const ICONS = { pdf: 'file-pdf-box', epub: 'book-open-page-variant-outline', txt: 'file-document-outline', md: 'language-markdown-outline', docx: 'file-word-outline', doc: 'file-word-outline', html: 'language-html5', htm: 'language-html5' };

// Shows an uploaded book file with Open / Replace / Remove actions.
export default function BookFileCard({ name, size, missing, onOpen, onReplace, onRemove, note }) {
  const ext = extensionOf(name);
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name={ICONS[ext] || 'file-outline'} size={26} color={colors.primaryText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>{name}</Text>
          <Text style={styles.meta}>
            {ext.toUpperCase()} · {formatBytes(size)}
            {missing ? ` · ${t('File missing')}` : ''}
          </Text>
        </View>
      </View>
      {note ? <Text style={styles.note}>{t(note)}</Text> : null}
      <View style={styles.actions}>
        {onOpen ? <Button title="Open" icon="open-in-new" small onPress={onOpen} disabled={missing} style={{ flex: 1 }} /> : null}
        {onReplace ? <Button title="Replace" icon="swap-horizontal" small variant="soft" onPress={onReplace} style={{ flex: 1 }} /> : null}
        {onRemove ? <Pressable onPress={onRemove} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('Remove file')}><MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} /></Pressable> : null}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.sansSemi, fontSize: 14.5, color: colors.text },
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSoft, marginTop: 2 },
  note: { fontFamily: fonts.serifItalic, fontSize: 13, color: colors.textSoft },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  remove: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.softBg, alignItems: 'center', justifyContent: 'center' },
}));
