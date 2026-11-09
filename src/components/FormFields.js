import React, { useState } from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius, themedStyles } from '../constants/theme';
import { addDays, isValidISODate, todayISO } from '../utils/dates';
import BookCover from './BookCover';
import { t } from '../i18n';

export function FieldLabel({ children, required }) {
  return (
    <Text style={styles.label}>
      {typeof children === 'string' ? t(children) : children}
      {required ? <Text style={{ color: colors.terracotta }}> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorRow}>
      <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function TextField({
  label, value, onChangeText, error, required, multiline, placeholder, keyboardType, hint, minHeight, maxLength,
  autoCapitalize = 'sentences', style, inputStyle, editable = true,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      {label ? <FieldLabel required={required}>{label}</FieldLabel> : null}
      <TextInput
        value={value === null || value === undefined ? '' : String(value)}
        onChangeText={onChangeText}
        placeholder={placeholder ? t(placeholder) : placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        editable={editable}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={label}
        style={[
          styles.input,
          multiline && { minHeight: minHeight || 100, paddingTop: 12, lineHeight: 22 },
          focused && styles.inputFocused,
          !!error && styles.inputError,
          !editable && { opacity: 0.6 },
          inputStyle,
        ]}
      />
      {hint && !error ? <Text style={styles.hint}>{t(hint)}</Text> : null}
      <FieldError message={error} />
    </View>
  );
}

// Single-choice chips (genres, statuses, moods...)
export function SelectChips({ label, options, value, onChange, error, required, allowClear = false, clearLabel = 'None' }) {
  return (
    <View>
      {label ? <FieldLabel required={required}>{label}</FieldLabel> : null}
      <View style={styles.chipWrap}>
        {allowClear ? (
          <Pressable onPress={() => onChange('')} style={[styles.chip, !value && styles.chipActive]}>
            <Text style={[styles.chipText, !value && styles.chipTextActive]}>{t(clearLabel)}</Text>
          </Pressable>
        ) : null}
        {options.map((opt) => {
          const v = typeof opt === 'string' ? opt : opt.value;
          const l = typeof opt === 'string' ? opt : opt.label;
          const active = value === v;
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(active && allowClear ? '' : v)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(l)}</Text>
            </Pressable>
          );
        })}
      </View>
      <FieldError message={error} />
    </View>
  );
}

// Typed YYYY-MM-DD date with quick −day / +day / Today controls (no extra libraries needed).
export function DateField({ label, value, onChange, error, required, maxToday = false }) {
  const valid = isValidISODate(value || '');
  const step = (n) => {
    const base = valid ? value : todayISO();
    let next = addDays(base, n);
    if (maxToday && next > todayISO()) next = todayISO();
    onChange(next);
  };
  return (
    <View>
      {label ? <FieldLabel required={required}>{label}</FieldLabel> : null}
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <View style={[styles.dateInputWrap, !!error && styles.inputError]}>
            <MaterialCommunityIcons name="calendar-month-outline" size={19} color={colors.primarySoft} />
            <TextInput
              value={value || ''}
              onChangeText={onChange}
              placeholder={t('YYYY-MM-DD')}
              placeholderTextColor={colors.textFaint}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              accessibilityLabel={label}
              style={styles.dateInput}
            />
          </View>
        </View>
        <Pressable style={styles.dateBtn} onPress={() => step(-1)} accessibilityLabel="Previous day">
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primaryText} />
        </Pressable>
        <Pressable style={styles.dateBtn} onPress={() => step(1)} accessibilityLabel="Next day">
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primaryText} />
        </Pressable>
        <Pressable style={[styles.dateBtn, { paddingHorizontal: 12 }]} onPress={() => onChange(todayISO())}>
          <Text style={styles.todayText}>{t('Today')}</Text>
        </Pressable>
      </View>
      <FieldError message={error} />
    </View>
  );
}

// Inline book picker: tap to expand, search, choose.
export function BookSelectField({ label = 'Book', books, value, onChange, error, required, placeholder = 'Choose a book', allowNone = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = books.find((b) => b.id === value) || null;
  const q = query.trim().toLowerCase();
  const matches = books
    .filter((b) => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
    .slice(0, 7);

  return (
    <View>
      {label ? <FieldLabel required={required}>{label}</FieldLabel> : null}
      <Pressable
        onPress={() => !disabled && setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.selectBox, open && styles.inputFocused, !!error && styles.inputError, disabled && { opacity: 0.6 }]}
      >
        {selected ? (
          <>
            <BookCover book={selected} width={28} />
            <View style={{ flex: 1 }}>
              <Text style={styles.selTitle} numberOfLines={1}>{selected.title}</Text>
              <Text style={styles.selSub} numberOfLines={1}>{selected.author}</Text>
            </View>
          </>
        ) : (
          <Text style={[styles.selTitle, { color: colors.textFaint, flex: 1 }]}>{t(placeholder)}</Text>
        )}
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textSoft} />
      </Pressable>
      {open ? (
        <View style={styles.dropdown}>
          <View style={styles.dropSearch}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('Search your shelf…')}
              placeholderTextColor={colors.textFaint}
              style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.text, paddingVertical: 8 }}
            />
          </View>
          {allowNone ? (
            <Pressable style={styles.option} onPress={() => { onChange(null); setOpen(false); setQuery(''); }}>
              <Text style={[styles.selTitle, { color: colors.textSoft }]}>{t('No related book')}</Text>
            </Pressable>
          ) : null}
          {matches.map((b) => (
            <Pressable
              key={b.id}
              style={[styles.option, b.id === value && { backgroundColor: colors.surfaceTint }]}
              onPress={() => { onChange(b); setOpen(false); setQuery(''); }}
            >
              <BookCover book={b} width={26} />
              <View style={{ flex: 1 }}>
                <Text style={styles.selTitle} numberOfLines={1}>{b.title}</Text>
                <Text style={styles.selSub} numberOfLines={1}>{b.author}</Text>
              </View>
              {b.id === value ? <MaterialCommunityIcons name="check" size={18} color={colors.primaryText} /> : null}
            </Pressable>
          ))}
          {matches.length === 0 ? <Text style={[styles.hint, { padding: 12 }]}>{t('No books match “{query}”.', { query })}</Text> : null}
          {books.length > 7 && !q ? <Text style={[styles.hint, { paddingHorizontal: 12, paddingBottom: 10 }]}>{t('Type to search all {n} books.', { n: books.length })}</Text> : null}
        </View>
      ) : null}
      <FieldError message={error} />
    </View>
  );
}

// Tap-to-pick cover with remove button, and placeholder colour swatches.
export function CoverImageField({ book, onPick, onRemove, busy }) {
  return (
    <View style={styles.coverRow}>
      <BookCover book={book} width={96} />
      <View style={{ flex: 1, gap: 8 }}>
        <Pressable onPress={onPick} style={styles.coverBtn} accessibilityRole="button">
          <MaterialCommunityIcons name="image-plus" size={18} color={colors.primaryText} />
          <Text style={styles.coverBtnText}>{busy ? t('Preparing…') : book.cover_uri ? t('Change cover') : t('Choose cover from device')}</Text>
        </Pressable>
        {book.cover_uri ? (
          <Pressable onPress={onRemove} style={[styles.coverBtn, { borderColor: colors.dangerBorder }]} accessibilityRole="button">
            <MaterialCommunityIcons name="image-remove" size={18} color={colors.danger} />
            <Text style={[styles.coverBtnText, { color: colors.danger }]}>{t('Remove cover')}</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>{t('Optional. Without a photo, a book-cloth cover is created from the title.')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  label: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textSoft, marginBottom: 6 },
  input: {
    minHeight: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, fontFamily: fonts.sans, fontSize: 15, color: colors.text,
  },
  inputFocused: { borderColor: colors.primarySoft, shadowColor: colors.ochre, shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  inputError: { borderColor: colors.danger },
  hint: { fontFamily: fonts.sans, fontSize: 12, color: colors.textFaint, marginTop: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errorText: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.danger, flexShrink: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
  },
  dateInput: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 15, color: colors.text, paddingVertical: 0 },
  dateBtn: { height: 48, minWidth: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceTint },
  todayText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.primaryText },
  selectBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
  },
  selTitle: { fontFamily: fonts.sansSemi, fontSize: 14.5, color: colors.text },
  selSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSoft },
  dropdown: { marginTop: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  dropSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  coverRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  coverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.surface,
  },
  coverBtnText: { fontFamily: fonts.sansSemi, fontSize: 13.5, color: colors.primaryText },
}));
