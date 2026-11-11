// Device-file helpers: attach a book file (PDF/EPUB/TXT…) to a book, and import/export book lists.
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { t } from '../i18n';
import { importBooks, getBooks } from '../database/databaseServices';
import { APP_VERSION } from '../constants/options';
import { todayISO } from './dates';
import { bookKey, CSV_TEMPLATE, normalizeImportedBook, parseBooksText } from './bookImport';

export const BOOK_FILE_EXTENSIONS = ['pdf', 'epub', 'txt', 'mobi', 'azw3', 'docx', 'doc', 'rtf', 'md', 'html', 'htm', 'fb2', 'cbz'];
const MAX_BOOK_BYTES = 150 * 1024 * 1024;

const MIME = {
  pdf: 'application/pdf', epub: 'application/epub+zip', txt: 'text/plain', md: 'text/markdown', html: 'text/html', htm: 'text/html',
  mobi: 'application/x-mobipocket-ebook', azw3: 'application/vnd.amazon.ebook', rtf: 'application/rtf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fb2: 'application/x-fictionbook+xml', cbz: 'application/vnd.comicbook+zip',
};

export const extensionOf = (name) => (String(name).split('.').pop() || '').toLowerCase();
export const mimeFor = (name) => MIME[extensionOf(name)] || 'application/octet-stream';

export function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

const booksDirectory = () => new Directory(Paths.document, 'books');

// Opens the system picker. Returns { name, uri, size, mime } or null if cancelled.
export async function pickBookFile() {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const ext = extensionOf(asset.name);
  if (!BOOK_FILE_EXTENSIONS.includes(ext)) {
    throw new Error(t('Unsupported file type. Please choose a PDF, EPUB, TXT, MOBI, DOCX or similar book file.'));
  }
  if ((asset.size || 0) > MAX_BOOK_BYTES) throw new Error(t('That file is too large (limit 150 MB).'));
  return { name: asset.name, uri: asset.uri, size: asset.size || 0, mime: asset.mimeType && asset.mimeType !== 'application/octet-stream' ? asset.mimeType : mimeFor(asset.name) };
}

// Copies a picked file into the app's private storage; returns the values to save on the book row.
export async function storeBookFile(picked, bookId) {
  const dir = booksDirectory();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const stored = `${bookId}-${Date.now()}.${extensionOf(picked.name)}`;
  const dest = new File(dir, stored);
  await new File(picked.uri).copy(dest, { overwrite: true });
  return { file_name: picked.name, file_path: stored, file_size: picked.size || dest.size || 0, file_mime: picked.mime };
}

export function removeStoredFile(storedName) {
  if (!storedName) return;
  try {
    const f = new File(booksDirectory(), storedName);
    if (f.exists) f.delete();
  } catch (e) {
    // ignore – file may already be gone
  }
}

export function storedFileExists(storedName) {
  try {
    return !!storedName && new File(booksDirectory(), storedName).exists;
  } catch (e) {
    return false;
  }
}

// Hands the stored file to another app (PDF reader, EPUB reader…) through the system share/open sheet.
export async function openBookFile(book) {
  if (!storedFileExists(book.file_path)) throw new Error(t('The file could not be found on this device any more.'));
  if (!(await Sharing.isAvailableAsync())) throw new Error(t('Opening files is not available on this device.'));
  const file = new File(booksDirectory(), book.file_path);
  await Sharing.shareAsync(file.uri, { mimeType: book.file_mime || mimeFor(book.file_name), dialogTitle: book.file_name });
}

/* ----------------------------- import / export ----------------------------- */

// Pick a CSV/JSON file and add its books. Returns a summary, or null if cancelled.
export async function importBooksFromFile() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'application/json', 'text/plain', 'application/vnd.ms-excel', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const ext = extensionOf(asset.name);
  if (!['csv', 'json', 'txt', 'tsv'].includes(ext)) throw new Error(t('Please choose a .csv or .json file.'));

  let raw;
  try {
    raw = parseBooksText(await new File(asset.uri).text());
  } catch (e) {
    throw new Error(`${t('Could not read that file.')} ${e.message || ''}`.trim());
  }
  if (raw.length === 0) throw new Error(t('No books were found in that file.'));

  const valid = [];
  let invalid = 0;
  const seen = new Set();
  let duplicatesInFile = 0;
  raw.forEach((r) => {
    const res2 = normalizeImportedBook(r);
    if (res2.error) { invalid += 1; return; }
    const key = bookKey(res2.book.title, res2.book.author);
    if (seen.has(key)) { duplicatesInFile += 1; return; }
    seen.add(key);
    valid.push(res2.book);
  });
  const { imported, duplicates } = await importBooks(valid);
  return { total: raw.length, imported, duplicates: duplicates + duplicatesInFile, invalid, fileName: asset.name };
}

async function writeAndShare(fileName, content, mimeType, dialogTitle) {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  await file.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error(t('Sharing is not available on this device.'));
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

export async function exportBooksAsJson() {
  const books = await getBooks({ sort: 'alpha' });
  const payload = {
    app: 'PAGEORIA',
    version: APP_VERSION,
    exported_at: new Date().toISOString(),
    books: books.map((b) => ({
      title: b.title, author: b.author, genre: b.genre, description: b.description, total_pages: b.total_pages,
      current_page: b.current_page, status: b.status, rating: b.rating, date_added: b.date_added, is_favourite: !!b.is_favourite,
    })),
  };
  await writeAndShare(`pageoria-books-${todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json', t('Export my books'));
  return books.length;
}

export async function shareCsvTemplate() {
  await writeAndShare('pageoria-import-template.csv', CSV_TEMPLATE, 'text/csv', t('Download CSV template'));
}

// Runs the import and shows a friendly summary. Returns the summary or null.
export async function runImportWithSummary(showToast) {
  try {
    const r = await importBooksFromFile();
    if (!r) return null;
    const lines = [t('{n} books added.', { n: r.imported })];
    if (r.duplicates) lines.push(t('{n} skipped (already on your shelf).', { n: r.duplicates }));
    if (r.invalid) lines.push(t('{n} skipped (missing title, author or a valid page count).', { n: r.invalid }));
    Alert.alert(t('Import complete'), lines.join('\n'));
    return r;
  } catch (e) {
    showToast(e.message || t('Import failed.'), 'error');
    return null;
  }
}
