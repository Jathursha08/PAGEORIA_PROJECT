import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadows, type, themedStyles } from '../constants/theme';
import Button from './Button';
import { t } from '../i18n';

// Bottom-sheet style modal used for every create/edit form in the app.
export default function FormModal({
  visible, title, subtitle, onClose, onSave, saveLabel = 'Save', saving = false,
  onDelete, deleteLabel = 'Delete', children,
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close form" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav} pointerEvents="box-none">
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t(title)}</Text>
                {subtitle ? <Text style={styles.subtitle}>{t(subtitle)}</Text> : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialCommunityIcons name="close" size={24} color={colors.textSoft} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
            >
              {children}
            </ScrollView>
            <View style={styles.footer}>
              {onDelete ? (
                <Button title={t(deleteLabel)} icon="trash-can-outline" variant="danger" onPress={onDelete} style={{ flex: 1 }} />
              ) : (
                <Button title={t('Cancel')} variant="secondary" onPress={onClose} style={{ flex: 1 }} />
              )}
              <Button title={t(saveLabel)} icon="check" onPress={onSave} loading={saving} style={{ flex: 1.4 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  kav: { width: '100%', maxHeight: '92%' },
  sheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '100%', ...shadows.lifted,
  },
  grabber: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  title: { ...type.h2 },
  subtitle: { fontFamily: fonts.serifItalic, fontSize: 13.5, color: colors.textSoft, marginTop: 2 },
  body: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 14 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
}));
