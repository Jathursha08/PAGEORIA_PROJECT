import React, { useEffect, useMemo, useRef, useState } from 'react';
import {Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverPalettes, fonts, themedStyles } from '../constants/theme';
import { GENRES, STATUS, STATUSES } from '../constants/options';
import {
  createBook, deleteBook, getBookById, hashIndex, moveWishlistItemToBookshelf, setBookFile, updateBook,
} from '../database/databaseServices';
import { todayISO } from '../utils/dates';
import { validateBook } from '../utils/validation';
import { pickCoverImage } from '../utils/coverImage';
import { openBookFile, pickBookFile, removeStoredFile, storeBookFile, storedFileExists } from '../utils/bookFiles';
import BookFileCard from '../components/BookFileCard';
import { confirmDelete } from '../utils/confirm';
import { useToast } from '../context/ToastContext';
import Button from '../components/Button';
import { CoverImageField, DateField, FieldLabel, SelectChips, TextField } from '../components/FormFields';
import LoadingView from '../components/LoadingView';
import { Page } from '../components/ScreenScroll';
import ScreenHeader from '../components/ScreenHeader';
import StarRating from '../components/StarRating';
import { t } from '../i18n';

const emptyForm = (prefill = {}) => ({
  title: prefill.title || '',
  author: prefill.author || '',
  genre: prefill.genre || '',
  description: prefill.description || '',
  total_pages: prefill.total_pages ? String(prefill.total_pages) : '',
  current_page: '',
  status: STATUS.WANT,
  rating: 0,
  date_added: todayISO(),
  cover_uri: null,
  cover_color: null,
  file: null,
});

export default function AddEditBookScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { bookId, prefill, wishlistId } = route.params || {};
  const isEdit = !!bookId;

  const [form, setForm] = useState(() => emptyForm(prefill));
  const [initial, setInitial] = useState(() => JSON.stringify(emptyForm(prefill)));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const originalFilePath = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    (async () => {
      try {
        const b = await getBookById(bookId);
        if (!active) return;
        if (!b) {
          showToast(t('That book could not be found.'), 'error');
          navigation.goBack();
          return;
        }
        const loaded = {
          title: b.title, author: b.author, genre: b.genre, description: b.description,
          total_pages: String(b.total_pages), current_page: String(b.current_page), status: b.status,
          rating: b.rating, date_added: b.date_added, cover_uri: b.cover_uri, cover_color: b.cover_color,
          file: b.file_path ? { existing: true, name: b.file_name, size: b.file_size, mime: b.file_mime, file_path: b.file_path } : null,
        };
        originalFilePath.current = b.file_path || null;
        setForm(loaded);
        setInitial(JSON.stringify(loaded));
      } catch (e) {
        showToast(t('Could not load this book.'), 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookId, isEdit, navigation, showToast]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const previewBook = useMemo(
    () => ({
      title: form.title || t('Untitled Book'),
      author: form.author || t('Author'),
      cover_uri: form.cover_uri,
      cover_color: Number.isInteger(form.cover_color) ? form.cover_color : hashIndex(form.title || 'Untitled'),
    }),
    [form.title, form.author, form.cover_uri, form.cover_color]
  );

  const dirty = JSON.stringify(form) !== initial;

  const handleCancel = () => {
    if (!dirty) return navigation.goBack();
    Alert.alert(t('Discard changes?'), t('Your unsaved edits will be lost.'), [
      { text: t('Keep editing'), style: 'cancel' },
      { text: t('Discard'), style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const handlePickCover = async () => {
    try {
      setCoverBusy(true);
      const uri = await pickCoverImage();
      if (uri) setForm((f) => ({ ...f, cover_uri: uri }));
    } catch (e) {
      showToast(e.message || 'Could not choose that image.', 'error');
    } finally {
      setCoverBusy(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const picked = await pickBookFile();
      if (picked) setForm((f) => ({ ...f, file: { ...picked, isNew: true } }));
    } catch (e) {
      showToast(e.message || t('Could not choose that file.'), 'error');
    }
  };

  const handleOpenFile = async () => {
    try {
      await openBookFile({ file_path: form.file.file_path, file_name: form.file.name, file_mime: form.file.mime });
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Copies a newly picked file into private storage (or removes it) after the book row is saved.
  const syncFile = async (id) => {
    try {
      if (form.file?.isNew) {
        const info = await storeBookFile(form.file, id);
        await setBookFile(id, info);
        if (originalFilePath.current) removeStoredFile(originalFilePath.current);
      } else if (!form.file && originalFilePath.current) {
        await setBookFile(id, null);
        removeStoredFile(originalFilePath.current);
      }
    } catch (e) {
      showToast(t('Book saved, but the file could not be attached.'), 'error');
    }
  };

  const handleSave = async () => {
    const found = validateBook(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showToast(t('Please fix the highlighted fields.'), 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, cover_color: Number.isInteger(form.cover_color) ? form.cover_color : hashIndex(form.title) };
      if (isEdit) {
        await updateBook(bookId, payload);
        await syncFile(bookId);
        showToast(t('Book updated'));
        navigation.goBack();
      } else if (wishlistId) {
        const id = await moveWishlistItemToBookshelf(wishlistId, payload);
        await syncFile(id);
        showToast(t('Moved to your bookshelf'));
        navigation.replace('BookDetails', { bookId: id });
      } else {
        const id = await createBook(payload);
        await syncFile(id);
        showToast(t('Book added to your shelf'));
        navigation.replace('BookDetails', { bookId: id });
      }
    } catch (e) {
      showToast(e.message || 'Could not save the book.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () =>
    confirmDelete({
      title: t('Delete this book?'),
      message: t('Its reading sessions, quotes and reviews will be removed too. Journal entries are kept. This cannot be undone.'),
      onConfirm: async () => {
        try {
          await deleteBook(bookId);
          removeStoredFile(originalFilePath.current);
          showToast(t('Book deleted'));
          navigation.popToTop();
        } catch (e) {
          showToast(t('Could not delete the book.'), 'error');
        }
      },
    });

  if (loading) return <LoadingView label={t('Opening the book…')} />;

  return (
    <Page>
      <ScreenHeader
        onBack={handleCancel}
        backLabel={isEdit ? 'Cancel' : 'Back'}
        eyebrow={isEdit ? 'EDIT EDITION' : wishlistId ? 'FROM YOUR WISHLIST' : 'NEW EDITION'}
        title={isEdit ? 'Edit Book' : 'Add a New Book'}
        subtitle={isEdit ? 'Refine the details of this volume.' : 'Place a new volume on your shelf.'}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CoverImageField
            book={previewBook}
            busy={coverBusy}
            onPick={handlePickCover}
            onRemove={() => setForm((f) => ({ ...f, cover_uri: null }))}
          />

          {!form.cover_uri ? (
            <View>
              <FieldLabel>{t('Placeholder cover colour')}</FieldLabel>
              <View style={styles.swatches}>
                {coverPalettes.map((p, i) => {
                  const active = previewBook.cover_color === i;
                  return (
                    <Pressable
                      key={p.bg}
                      onPress={() => set('cover_color')(i)}
                      accessibilityLabel={`Cover colour ${i + 1}`}
                      style={[styles.swatch, { backgroundColor: p.bg }, active && styles.swatchActive]}
                    />
                  );
                })}
              </View>
            </View>
          ) : null}

          <View>
            <FieldLabel>Book file (optional)</FieldLabel>
            {form.file ? (
              <BookFileCard
                name={form.file.name}
                size={form.file.size}
                missing={form.file.existing && !storedFileExists(form.file.file_path)}
                note={form.file.isNew ? 'This file will be copied into PAGEORIA when you save.' : undefined}
                onOpen={form.file.existing ? handleOpenFile : undefined}
                onReplace={handlePickFile}
                onRemove={() => setForm((f) => ({ ...f, file: null }))}
              />
            ) : (
              <Button title="Upload book file" icon="file-upload-outline" variant="secondary" onPress={handlePickFile} />
            )}
            <Text style={styles.hint}>{t('PDF, EPUB, TXT, MOBI, DOCX… stored privately on this device.')}</Text>
          </View>

          <TextField label={t('Book title')} required value={form.title} onChangeText={set('title')} error={errors.title} placeholder={t('e.g. The Cartographer of Lost Stars')} />
          <TextField label={t('Author')} required value={form.author} onChangeText={set('author')} error={errors.author} placeholder={t('Author name')} />
          <SelectChips label={t('Genre')} required options={GENRES} value={form.genre} onChange={set('genre')} error={errors.genre} />
          <TextField label={t('Description')} value={form.description} onChangeText={set('description')} multiline placeholder={t('What is this book about, in your own words?')} />

          <View style={styles.twoCol}>
            <TextField style={{ flex: 1 }} label={t('Total pages')} required keyboardType="number-pad" value={form.total_pages} onChangeText={set('total_pages')} error={errors.total_pages} placeholder={t('e.g. 412')} />
            <TextField style={{ flex: 1 }} label={t('Current page')} keyboardType="number-pad" value={form.current_page} onChangeText={set('current_page')} error={errors.current_page} placeholder={t('0')} />
          </View>

          <View>
            <SelectChips label={t('Reading status')} required options={STATUSES} value={form.status} onChange={set('status')} error={errors.status} />
            {form.status === STATUS.COMPLETED ? <Text style={styles.hint}>{t('Completed books are moved to their final page automatically.')}</Text> : null}
          </View>

          <View>
            <FieldLabel>{t('Personal rating')}</FieldLabel>
            <StarRating value={form.rating} onChange={set('rating')} size={32} />
          </View>

          <DateField label={t('Date added')} required value={form.date_added} onChange={set('date_added')} error={errors.date_added} />

          {isEdit ? <Button title={t('Delete this book')} icon="trash-can-outline" variant="danger" onPress={handleDelete} /> : null}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button title={t('Cancel')} variant="secondary" onPress={handleCancel} style={{ flex: 1 }} />
          <Button title={isEdit ? 'Save changes' : 'Save book'} icon="check" onPress={handleSave} loading={saving} style={{ flex: 1.5 }} />
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = themedStyles(() => ({
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30, gap: 18 },
  twoCol: { flexDirection: 'row', gap: 12 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: colors.gold, transform: [{ scale: 1.12 }] },
  hint: { fontFamily: fonts.sans, fontSize: 12, color: colors.textFaint, marginTop: 6 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
}));
