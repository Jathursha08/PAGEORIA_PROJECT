// Pure helpers for importing a book list from a CSV or JSON file (no React Native imports, easy to test).
import { GENRES, STATUS } from '../constants/options';
import { isValidISODate, todayISO } from './dates';

// RFC-4180 style CSV parser (quotes, escaped quotes, commas/semicolons/tabs, CRLF, BOM).
export function parseCsv(text) {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && counts[ch] !== undefined) counts[ch] += 1;
  }
  const delimiter = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || ',';

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const ALIASES = {
  title: ['title', 'book', 'book title', 'name'],
  author: ['author', 'authors', 'writer', 'by'],
  genre: ['genre', 'category', 'bookshelves'],
  description: ['description', 'summary', 'about', 'synopsis'],
  total_pages: ['total_pages', 'total pages', 'totalpages', 'pages', 'page count', 'number of pages'],
  current_page: ['current_page', 'current page', 'currentpage', 'page', 'progress', 'pages read'],
  status: ['status', 'reading status', 'state', 'exclusive shelf'],
  rating: ['rating', 'my rating', 'stars'],
  date_added: ['date_added', 'date added', 'added', 'date'],
  is_favourite: ['is_favourite', 'favourite', 'favorite', 'fav'],
};

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

function canonicalKey(header) {
  const h = norm(header).replace(/[_-]/g, ' ');
  for (const [key, list] of Object.entries(ALIASES)) {
    if (list.some((a) => a.replace(/[_-]/g, ' ') === h)) return key;
  }
  return null;
}

function objectsFromCsv(rows) {
  if (rows.length < 2) return [];
  const keys = rows[0].map(canonicalKey);
  return rows.slice(1).map((r) => {
    const o = {};
    keys.forEach((k, i) => { if (k && o[k] === undefined) o[k] = r[i]; });
    return o;
  });
}

function objectsFromJson(data) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.books) ? data.books : Array.isArray(data?.items) ? data.items : null;
  if (!list) throw new Error('JSON must be a list of books, or an object with a "books" list.');
  return list.map((item) => {
    const o = {};
    Object.entries(item || {}).forEach(([k, v]) => {
      const key = canonicalKey(k);
      if (key && o[key] === undefined) o[key] = v;
    });
    return o;
  });
}

// Returns a list of raw book objects with canonical keys.
export function parseBooksText(text) {
  const trimmed = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!trimmed) throw new Error('The file is empty.');
  if (trimmed[0] === '[' || trimmed[0] === '{') return objectsFromJson(JSON.parse(trimmed));
  return objectsFromCsv(parseCsv(trimmed));
}

const GENRE_SYNONYMS = {
  'sci-fi': 'Science Fiction', scifi: 'Science Fiction', 'sci fi': 'Science Fiction', 'science-fiction': 'Science Fiction',
  historical: 'Historical Fiction', 'historical-fiction': 'Historical Fiction', ya: 'Young Adult', 'young-adult': 'Young Adult',
  romantic: 'Romance', classic: 'Classics', suspense: 'Thriller', crime: 'Mystery', detective: 'Mystery', fantasies: 'Fantasy',
};

export function matchGenre(raw) {
  const g = norm(raw);
  if (!g) return 'Fiction';
  const direct = GENRES.find((x) => x.toLowerCase() === g);
  if (direct) return direct;
  if (GENRE_SYNONYMS[g]) return GENRE_SYNONYMS[g];
  const partial = GENRES.find((x) => g.includes(x.toLowerCase()));
  return partial || 'Fiction';
}

export function matchStatus(raw, currentPage = 0) {
  const s = norm(raw);
  if (!s) return currentPage > 0 ? STATUS.READING : STATUS.WANT;
  if (/(complete|finish|done|^read$)/.test(s)) return STATUS.COMPLETED;
  if (/(reading|current|progress)/.test(s)) return STATUS.READING;
  if (/(hold|pause|paused)/.test(s)) return STATUS.HOLD;
  if (/(want|tbr|wish|to-read|to read|plan)/.test(s)) return STATUS.WANT;
  return STATUS.WANT;
}

const toInt = (v) => {
  const s = String(v ?? '').replace(/[, ]/g, '').trim();
  return /^\d+$/.test(s) ? Number(s) : NaN;
};

export const DEFAULT_IMPORT_PAGES = 300;

// Returns { book } for a valid row or { error } with a short reason.
export function normalizeImportedBook(raw) {
  const title = String(raw.title ?? '').trim();
  const author = String(raw.author ?? '').trim();
  if (!title) return { error: 'missing title' };
  if (!author) return { error: 'missing author' };

  let total = DEFAULT_IMPORT_PAGES;
  if (String(raw.total_pages ?? '').trim() !== '') {
    total = toInt(raw.total_pages);
    if (!(total > 0)) return { error: 'invalid page count' };
  }
  let current = 0;
  if (String(raw.current_page ?? '').trim() !== '') {
    current = toInt(raw.current_page);
    if (Number.isNaN(current)) current = 0;
  }
  current = Math.min(current, total);

  let rating = Number(String(raw.rating ?? '').replace(',', '.'));
  if (!Number.isFinite(rating)) rating = 0;
  rating = Math.max(0, Math.min(5, Math.round(rating * 2) / 2));

  const added = String(raw.date_added ?? '').trim().slice(0, 10);
  const fav = norm(raw.is_favourite);

  return {
    book: {
      title,
      author,
      genre: matchGenre(raw.genre),
      description: String(raw.description ?? '').trim(),
      total_pages: total,
      current_page: current,
      status: matchStatus(raw.status, current),
      rating,
      date_added: isValidISODate(added) ? added : todayISO(),
      is_favourite: fav === '1' || fav === 'true' || fav === 'yes',
    },
  };
}

export const bookKey = (title, author) => `${norm(title)}|${norm(author)}`;

export const CSV_TEMPLATE =
  'title,author,genre,total_pages,current_page,status,rating,description\n' +
  '"The Lantern Keeper","Mira Hollis",Fantasy,320,0,Want to Read,0,"A lighthouse keeper discovers lamps that remember."\n' +
  '"Salt and Starlight","Jonas Ferreira",Adventure,410,410,Completed,4,"A sailing voyage across an unmapped sea."\n';
