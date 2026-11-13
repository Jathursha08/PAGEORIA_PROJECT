// Reusable database service layer. Screens never write SQL — they call these functions.
import { getDb } from './database';
import { STATUS } from '../constants/options';
import {
  diffDays,
  nowISO,
  startOfWeekISO,
  addDays,
  todayISO,
  startOfYearISO,
} from '../utils/dates';
import { t } from '../i18n';

const like = (text) => `%${String(text).trim().replace(/[%_]/g, '')}%`;

export const hashIndex = (text, mod = 8) => {
  let h = 0;
  for (let i = 0; i < String(text).length; i += 1) h = (h * 31 + String(text).charCodeAt(i)) >>> 0;
  return h % mod;
};

/* ------------------------------------------------------------------ */
/* BOOKS                                                               */
/* ------------------------------------------------------------------ */

// Keeps status, current page and completion date consistent with each other.
function normalizeBook(input, previous = null) {
  const total = Number(input.total_pages);
  let current = Number(input.current_page) || 0;
  let status = input.status;
  let completedOn = input.date_completed ?? previous?.date_completed ?? null;

  if (status === STATUS.COMPLETED) {
    current = total;
    completedOn = completedOn || todayISO();
  } else if (current >= total) {
    status = STATUS.COMPLETED;
    current = total;
    completedOn = completedOn || todayISO();
  } else {
    completedOn = null;
  }
  return { total, current, status, completedOn };
}

export async function getBooks({ search = '', genre = null, status = null, sort = 'recent', favouritesOnly = false } = {}) {
  const db = await getDb();
  const where = [];
  const params = [];
  if (search.trim()) {
    where.push('(title LIKE ? OR author LIKE ?)');
    params.push(like(search), like(search));
  }
  if (genre) {
    where.push('genre = ?');
    params.push(genre);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (favouritesOnly) where.push('is_favourite = 1');
  const order = {
    recent: 'date_added DESC, id DESC',
    alpha: 'title COLLATE NOCASE ASC',
    rating: 'rating DESC, title COLLATE NOCASE ASC',
  }[sort] || 'date_added DESC, id DESC';
  const sql = `SELECT * FROM Books ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}`;
  return db.getAllAsync(sql, params);
}

export async function getBookById(id) {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM Books WHERE id = ?', [id]);
}

// Lightweight list for pickers
export async function getBooksLite() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id, title, author, genre, total_pages, current_page, status, cover_uri, cover_color
     FROM Books ORDER BY title COLLATE NOCASE ASC`
  );
}

export async function getStatusCounts() {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT status, COUNT(*) AS n FROM Books GROUP BY status');
  const counts = { all: 0 };
  rows.forEach((r) => {
    counts[r.status] = r.n;
    counts.all += r.n;
  });
  return counts;
}

export async function createBook(input) {
  const db = await getDb();
  const now = nowISO();
  const { total, current, status, completedOn } = normalizeBook(input);
  const res = await db.runAsync(
    `INSERT INTO Books (title, author, genre, description, total_pages, current_page, status, rating,
       date_added, date_completed, cover_uri, cover_color, is_favourite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title.trim(), input.author.trim(), input.genre, (input.description || '').trim(),
      total, current, status, Number(input.rating) || 0, input.date_added || todayISO(), completedOn,
      input.cover_uri || null, Number.isInteger(input.cover_color) ? input.cover_color : hashIndex(input.title),
      input.is_favourite ? 1 : 0, now, now,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateBook(id, input) {
  const db = await getDb();
  const previous = await getBookById(id);
  if (!previous) throw new Error(t('This book no longer exists.'));
  const { total, current, status, completedOn } = normalizeBook(input, previous);
  await db.runAsync(
    `UPDATE Books SET title = ?, author = ?, genre = ?, description = ?, total_pages = ?, current_page = ?,
       status = ?, rating = ?, date_added = ?, date_completed = ?, cover_uri = ?, cover_color = ?, updated_at = ?
     WHERE id = ?`,
    [
      input.title.trim(), input.author.trim(), input.genre, (input.description || '').trim(),
      total, current, status, Number(input.rating) || 0, input.date_added, completedOn,
      input.cover_uri || null, Number.isInteger(input.cover_color) ? input.cover_color : previous.cover_color,
      nowISO(), id,
    ]
  );
}

export async function deleteBook(id) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM ReadingSessions WHERE book_id = ?', [id]);
    await db.runAsync('DELETE FROM Quotes WHERE book_id = ?', [id]);
    await db.runAsync('DELETE FROM Reviews WHERE book_id = ?', [id]);
    await db.runAsync('UPDATE JournalEntries SET book_id = NULL WHERE book_id = ?', [id]);
    await db.runAsync('DELETE FROM Books WHERE id = ?', [id]);
  });
}

// Attach (or clear, with null) the uploaded book file recorded for a book.
export async function setBookFile(id, info) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE Books SET file_name = ?, file_path = ?, file_size = ?, file_mime = ?, updated_at = ? WHERE id = ?',
    [info?.file_name ?? null, info?.file_path ?? null, info?.file_size ?? null, info?.file_mime ?? null, nowISO(), id]
  );
}

const importKey = (title, author) => `${String(title).trim().toLowerCase().replace(/\s+/g, ' ')}|${String(author).trim().toLowerCase().replace(/\s+/g, ' ')}`;

// Bulk insert for the CSV/JSON importer. Books already on the shelf (same title + author) are skipped.
export async function importBooks(rows) {
  const db = await getDb();
  const existing = await db.getAllAsync('SELECT title, author FROM Books');
  const seen = new Set(existing.map((b) => importKey(b.title, b.author)));
  let imported = 0;
  let duplicates = 0;
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const key = importKey(row.title, row.author);
      if (seen.has(key)) { duplicates += 1; continue; }
      await createBook(row);
      seen.add(key);
      imported += 1;
    }
  });
  return { imported, duplicates };
}

export async function toggleFavourite(id) {
  const db = await getDb();
  await db.runAsync('UPDATE Books SET is_favourite = 1 - is_favourite, updated_at = ? WHERE id = ?', [nowISO(), id]);
  const row = await db.getFirstAsync('SELECT is_favourite FROM Books WHERE id = ?', [id]);
  return !!row?.is_favourite;
}

// Set the current page directly (progress calibrator). Keeps status consistent.
export async function setBookProgress(id, page) {
  const db = await getDb();
  const book = await getBookById(id);
  if (!book) throw new Error(t('This book no longer exists.'));
  const next = Math.max(0, Math.min(Number(page) || 0, book.total_pages));
  let status = book.status;
  let completedOn = book.date_completed;
  if (next >= book.total_pages) {
    status = STATUS.COMPLETED;
    completedOn = completedOn || todayISO();
  } else {
    if (status === STATUS.COMPLETED) status = STATUS.READING;
    if ((status === STATUS.WANT || status === STATUS.HOLD) && next > 0) status = STATUS.READING;
    completedOn = null;
  }
  await db.runAsync(
    'UPDATE Books SET current_page = ?, status = ?, date_completed = ?, updated_at = ? WHERE id = ?',
    [next, status, completedOn, nowISO(), id]
  );
  return next;
}

/* ------------------------------------------------------------------ */
/* READING SESSIONS                                                    */
/* ------------------------------------------------------------------ */

// After a session, move the book's current page forward when the session ended further along.
async function advanceBookFromSession(db, bookId, endPage, sessionDate) {
  const book = await db.getFirstAsync('SELECT * FROM Books WHERE id = ?', [bookId]);
  if (!book) return;
  let { current_page: current, status, date_completed: completedOn } = book;
  if (endPage > current) current = endPage;
  if (current >= book.total_pages) {
    current = book.total_pages;
    status = STATUS.COMPLETED;
    completedOn = completedOn || sessionDate;
  } else if (status === STATUS.WANT || status === STATUS.HOLD) {
    status = STATUS.READING;
  }
  await db.runAsync(
    'UPDATE Books SET current_page = ?, status = ?, date_completed = ?, updated_at = ? WHERE id = ?',
    [current, status, completedOn, nowISO(), bookId]
  );
}

export async function getSessions({ bookId = null, from = null, limit = null } = {}) {
  const db = await getDb();
  const where = [];
  const params = [];
  if (bookId) {
    where.push('s.book_id = ?');
    params.push(bookId);
  }
  if (from) {
    where.push('s.session_date >= ?');
    params.push(from);
  }
  const sql = `SELECT s.*, b.title AS book_title, b.author AS book_author, b.cover_uri, b.cover_color, b.total_pages
    FROM ReadingSessions s JOIN Books b ON b.id = s.book_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY s.session_date DESC, s.id DESC ${limit ? `LIMIT ${Number(limit)}` : ''}`;
  return db.getAllAsync(sql, params);
}

export async function createSession(input) {
  const db = await getDb();
  const now = nowISO();
  const start = Number(input.start_page);
  const end = Number(input.end_page);
  let id;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO ReadingSessions (book_id, session_date, start_page, end_page, pages_read, duration_minutes, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.book_id, input.session_date, start, end, end - start, Number(input.duration_minutes), (input.notes || '').trim(), now, now]
    );
    id = res.lastInsertRowId;
    await advanceBookFromSession(db, input.book_id, end, input.session_date);
  });
  return id;
}

export async function updateSession(id, input) {
  const db = await getDb();
  const start = Number(input.start_page);
  const end = Number(input.end_page);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE ReadingSessions SET book_id = ?, session_date = ?, start_page = ?, end_page = ?, pages_read = ?,
         duration_minutes = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [input.book_id, input.session_date, start, end, end - start, Number(input.duration_minutes), (input.notes || '').trim(), nowISO(), id]
    );
    await advanceBookFromSession(db, input.book_id, end, input.session_date);
  });
}

export async function deleteSession(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM ReadingSessions WHERE id = ?', [id]);
}

export async function getSessionTotals({ from = null, to = null } = {}) {
  const db = await getDb();
  const where = [];
  const params = [];
  if (from) { where.push('session_date >= ?'); params.push(from); }
  if (to) { where.push('session_date <= ?'); params.push(to); }
  const row = await db.getFirstAsync(
    `SELECT COUNT(*) AS sessions, COALESCE(SUM(pages_read), 0) AS pages, COALESCE(SUM(duration_minutes), 0) AS minutes
     FROM ReadingSessions ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params
  );
  return { sessions: row.sessions, pages: row.pages, minutes: row.minutes };
}

// Pages & minutes for each day Monday → Sunday of the current week
export async function getWeeklyActivity() {
  const db = await getDb();
  const monday = startOfWeekISO();
  const sunday = addDays(monday, 6);
  const rows = await db.getAllAsync(
    `SELECT session_date, SUM(pages_read) AS pages, SUM(duration_minutes) AS minutes
     FROM ReadingSessions WHERE session_date BETWEEN ? AND ? GROUP BY session_date`,
    [monday, sunday]
  );
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = todayISO();
  return labels.map((label, i) => {
    const date = addDays(monday, i);
    const r = rows.find((x) => x.session_date === date);
    return { label, date, pages: r?.pages || 0, minutes: r?.minutes || 0, isToday: date === today, isFuture: date > today };
  });
}

async function getSessionDates(db) {
  const rows = await db.getAllAsync('SELECT DISTINCT session_date FROM ReadingSessions ORDER BY session_date DESC');
  return rows.map((r) => r.session_date);
}

function computeStreaks(datesDesc) {
  if (datesDesc.length === 0) return { current: 0, longest: 0 };
  const today = todayISO();
  let current = 0;
  const gapToToday = diffDays(datesDesc[0], today);
  if (gapToToday <= 1) {
    current = 1;
    for (let i = 1; i < datesDesc.length; i += 1) {
      if (diffDays(datesDesc[i], datesDesc[i - 1]) === 1) current += 1;
      else break;
    }
  }
  let longest = 1;
  let run = 1;
  for (let i = 1; i < datesDesc.length; i += 1) {
    if (diffDays(datesDesc[i], datesDesc[i - 1]) === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else run = 1;
  }
  return { current, longest };
}

export async function getReadingStreak() {
  const db = await getDb();
  return computeStreaks(await getSessionDates(db));
}

/* ------------------------------------------------------------------ */
/* JOURNAL                                                             */
/* ------------------------------------------------------------------ */

export async function getJournalEntries({ search = '', bookId = null, order = 'newest' } = {}) {
  const db = await getDb();
  const where = [];
  const params = [];
  if (search.trim()) {
    where.push(`(j.title LIKE ? OR j.thoughts LIKE ? OR j.favourite_characters LIKE ? OR j.memorable_scenes LIKE ?
      OR j.feelings LIKE ? OR j.reflections LIKE ? OR b.title LIKE ?)`);
    for (let i = 0; i < 7; i += 1) params.push(like(search));
  }
  if (bookId) {
    where.push('j.book_id = ?');
    params.push(bookId);
  }
  const dir = order === 'oldest' ? 'ASC' : 'DESC';
  return db.getAllAsync(
    `SELECT j.*, b.title AS book_title, b.author AS book_author, b.genre AS book_genre, b.cover_uri, b.cover_color
     FROM JournalEntries j LEFT JOIN Books b ON b.id = j.book_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY j.entry_date ${dir}, j.id ${dir}`,
    params
  );
}

export async function createJournalEntry(input) {
  const db = await getDb();
  const now = nowISO();
  const res = await db.runAsync(
    `INSERT INTO JournalEntries (book_id, title, entry_date, thoughts, favourite_characters, memorable_scenes, feelings, reflections, mood, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.book_id || null, input.title.trim(), input.entry_date, input.thoughts.trim(), (input.favourite_characters || '').trim(),
      (input.memorable_scenes || '').trim(), (input.feelings || '').trim(), (input.reflections || '').trim(), input.mood || '', now, now]
  );
  return res.lastInsertRowId;
}

export async function updateJournalEntry(id, input) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE JournalEntries SET book_id = ?, title = ?, entry_date = ?, thoughts = ?, favourite_characters = ?,
       memorable_scenes = ?, feelings = ?, reflections = ?, mood = ?, updated_at = ? WHERE id = ?`,
    [input.book_id || null, input.title.trim(), input.entry_date, input.thoughts.trim(), (input.favourite_characters || '').trim(),
      (input.memorable_scenes || '').trim(), (input.feelings || '').trim(), (input.reflections || '').trim(), input.mood || '', nowISO(), id]
  );
}

export async function deleteJournalEntry(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM JournalEntries WHERE id = ?', [id]);
}

export async function getJournalStats() {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) AS entries, COUNT(DISTINCT book_id) AS books FROM JournalEntries'
  );
  const mood = await db.getFirstAsync(
    `SELECT mood, COUNT(*) AS n FROM JournalEntries WHERE mood <> '' GROUP BY mood ORDER BY n DESC, mood LIMIT 1`
  );
  return { entries: row.entries, books: row.books, topMood: mood?.mood || '—' };
}

/* ------------------------------------------------------------------ */
/* QUOTES                                                              */
/* ------------------------------------------------------------------ */

export async function getQuotes({ search = '', bookId = null } = {}) {
  const db = await getDb();
  const where = [];
  const params = [];
  if (search.trim()) {
    where.push('(q.quote_text LIKE ? OR q.author LIKE ? OR q.note LIKE ? OR b.title LIKE ?)');
    for (let i = 0; i < 4; i += 1) params.push(like(search));
  }
  if (bookId) {
    where.push('q.book_id = ?');
    params.push(bookId);
  }
  return db.getAllAsync(
    `SELECT q.*, b.title AS book_title, b.author AS book_author, b.cover_uri, b.cover_color
     FROM Quotes q JOIN Books b ON b.id = q.book_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY q.date_saved DESC, q.id DESC`,
    params
  );
}

export async function getQuoteBooks() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT b.id, b.title, COUNT(q.id) AS n FROM Books b JOIN Quotes q ON q.book_id = b.id
     GROUP BY b.id ORDER BY b.title COLLATE NOCASE`
  );
}

export async function createQuote(input) {
  const db = await getDb();
  const now = nowISO();
  const res = await db.runAsync(
    `INSERT INTO Quotes (book_id, quote_text, author, note, page_number, date_saved, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.book_id, input.quote_text.trim(), (input.author || '').trim(), (input.note || '').trim(),
      input.page_number ? Number(input.page_number) : null, input.date_saved, now, now]
  );
  return res.lastInsertRowId;
}

export async function updateQuote(id, input) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE Quotes SET book_id = ?, quote_text = ?, author = ?, note = ?, page_number = ?, date_saved = ?, updated_at = ? WHERE id = ?`,
    [input.book_id, input.quote_text.trim(), (input.author || '').trim(), (input.note || '').trim(),
      input.page_number ? Number(input.page_number) : null, input.date_saved, nowISO(), id]
  );
}

export async function deleteQuote(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM Quotes WHERE id = ?', [id]);
}

export async function getRandomQuote() {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT q.*, b.title AS book_title FROM Quotes q JOIN Books b ON b.id = q.book_id ORDER BY q.id`
  );
  if (rows.length === 0) return null;
  // Stable "quote of the day": same quote all day, changes tomorrow
  const day = Math.floor(Date.now() / 86400000);
  return rows[day % rows.length];
}

/* ------------------------------------------------------------------ */
/* REVIEWS                                                             */
/* ------------------------------------------------------------------ */

export async function getReviews({ rating = null, bookId = null } = {}) {
  const db = await getDb();
  const where = [];
  const params = [];
  if (rating) {
    where.push('r.rating = ?');
    params.push(Number(rating));
  }
  if (bookId) {
    where.push('r.book_id = ?');
    params.push(bookId);
  }
  return db.getAllAsync(
    `SELECT r.*, b.title AS book_title, b.author AS book_author, b.cover_uri, b.cover_color, b.total_pages
     FROM Reviews r JOIN Books b ON b.id = r.book_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY r.date_reviewed DESC, r.id DESC`,
    params
  );
}

export async function createReview(input) {
  const db = await getDb();
  const now = nowISO();
  let id;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO Reviews (book_id, rating, title, body, date_reviewed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.book_id, Number(input.rating), input.title.trim(), input.body.trim(), input.date_reviewed, now, now]
    );
    id = res.lastInsertRowId;
    // If the book has no personal rating yet, use this review's rating.
    await db.runAsync('UPDATE Books SET rating = ? WHERE id = ? AND rating = 0', [Number(input.rating), input.book_id]);
  });
  return id;
}

export async function updateReview(id, input) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE Reviews SET book_id = ?, rating = ?, title = ?, body = ?, date_reviewed = ?, updated_at = ? WHERE id = ?`,
    [input.book_id, Number(input.rating), input.title.trim(), input.body.trim(), input.date_reviewed, nowISO(), id]
  );
}

export async function deleteReview(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM Reviews WHERE id = ?', [id]);
}

export async function getReviewCounts() {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT rating, COUNT(*) AS n FROM Reviews GROUP BY rating');
  const counts = { all: 0 };
  rows.forEach((r) => {
    counts[r.rating] = r.n;
    counts.all += r.n;
  });
  return counts;
}

/* ------------------------------------------------------------------ */
/* WISHLIST                                                            */
/* ------------------------------------------------------------------ */

export async function getWishlist({ search = '' } = {}) {
  const db = await getDb();
  const params = [];
  let where = '';
  if (search.trim()) {
    where = 'WHERE title LIKE ? OR author LIKE ? OR genre LIKE ? OR reason LIKE ?';
    for (let i = 0; i < 4; i += 1) params.push(like(search));
  }
  return db.getAllAsync(`SELECT * FROM Wishlist ${where} ORDER BY created_at DESC, id DESC`, params);
}

export async function createWishlistItem(input) {
  const db = await getDb();
  const now = nowISO();
  const res = await db.runAsync(
    `INSERT INTO Wishlist (title, author, genre, reason, total_pages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.title.trim(), input.author.trim(), input.genre, (input.reason || '').trim(),
      input.total_pages ? Number(input.total_pages) : null, now, now]
  );
  return res.lastInsertRowId;
}

export async function updateWishlistItem(id, input) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE Wishlist SET title = ?, author = ?, genre = ?, reason = ?, total_pages = ?, updated_at = ? WHERE id = ?`,
    [input.title.trim(), input.author.trim(), input.genre, (input.reason || '').trim(),
      input.total_pages ? Number(input.total_pages) : null, nowISO(), id]
  );
}

export async function deleteWishlistItem(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM Wishlist WHERE id = ?', [id]);
}

export async function getWishlistItem(id) {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM Wishlist WHERE id = ?', [id]);
}

// Creates the book and removes the wishlist entry in one transaction.
export async function moveWishlistItemToBookshelf(wishlistId, bookInput) {
  const db = await getDb();
  let bookId;
  await db.withTransactionAsync(async () => {
    bookId = await createBook(bookInput);
    await db.runAsync('DELETE FROM Wishlist WHERE id = ?', [wishlistId]);
  });
  return bookId;
}

/* ------------------------------------------------------------------ */
/* READING CHALLENGES                                                  */
/* ------------------------------------------------------------------ */

export async function getChallenges() {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT c.*,
       (SELECT COUNT(*) FROM Books b
         WHERE b.status = 'Completed' AND b.date_completed IS NOT NULL
           AND b.date_completed >= c.start_date AND b.date_completed <= c.deadline
           AND (c.genre IS NULL OR c.genre = '' OR b.genre = c.genre)) AS progress
     FROM ReadingChallenges c ORDER BY c.deadline ASC, c.id ASC`
  );
  const today = todayISO();
  return rows.map((c) => {
    const done = c.progress >= c.target_books;
    return {
      ...c,
      percent: Math.min(100, Math.round((c.progress / c.target_books) * 100)),
      isCompleted: done,
      isExpired: !done && c.deadline < today,
      daysLeft: Math.max(0, diffDays(today, c.deadline)),
      remaining: Math.max(0, c.target_books - c.progress),
    };
  });
}

export async function createChallenge(input) {
  const db = await getDb();
  const now = nowISO();
  const res = await db.runAsync(
    `INSERT INTO ReadingChallenges (title, target_books, genre, start_date, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.title.trim(), Number(input.target_books), input.genre || null, input.start_date, input.deadline, now, now]
  );
  return res.lastInsertRowId;
}

export async function updateChallenge(id, input) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ReadingChallenges SET title = ?, target_books = ?, genre = ?, start_date = ?, deadline = ?, updated_at = ? WHERE id = ?`,
    [input.title.trim(), Number(input.target_books), input.genre || null, input.start_date, input.deadline, nowISO(), id]
  );
}

export async function deleteChallenge(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM ReadingChallenges WHERE id = ?', [id]);
}

/* ------------------------------------------------------------------ */
/* PROFILE                                                             */
/* ------------------------------------------------------------------ */

export async function getProfile() {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM UserProfile WHERE id = 1');
}

export async function updateProfile(input) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE UserProfile SET display_name = ?, intro = ?, favourite_genre = ?, yearly_goal = ?, updated_at = ? WHERE id = 1`,
    [input.display_name.trim(), (input.intro || '').trim(), input.favourite_genre || '', Number(input.yearly_goal) || 12, nowISO()]
  );
}

/* ------------------------------------------------------------------ */
/* DASHBOARD & STATISTICS (all calculated from stored records)        */
/* ------------------------------------------------------------------ */

export async function getHomeData() {
  const db = await getDb();
  const counts = await getStatusCounts();
  const totals = await getSessionTotals();
  const streak = computeStreaks(await getSessionDates(db));
  const reading = await db.getAllAsync(
    `SELECT b.*, (SELECT MAX(session_date) FROM ReadingSessions s WHERE s.book_id = b.id) AS last_read
     FROM Books b WHERE b.status = ? ORDER BY last_read DESC, b.updated_at DESC`,
    [STATUS.READING]
  );
  const recent = await db.getAllAsync('SELECT * FROM Books ORDER BY date_added DESC, id DESC LIMIT 8');
  const favourites = await db.getAllAsync('SELECT * FROM Books WHERE is_favourite = 1 ORDER BY updated_at DESC LIMIT 10');
  const wishlist = await db.getFirstAsync('SELECT COUNT(*) AS n FROM Wishlist');
  const pageSums = await db.getFirstAsync(
    'SELECT COALESCE(SUM(current_page), 0) AS cur, COALESCE(SUM(total_pages), 0) AS tot FROM Books WHERE status = ?',
    [STATUS.READING]
  );
  const challenges = await getChallenges();
  const activeChallenge = challenges.find((c) => !c.isCompleted && !c.isExpired) || challenges[0] || null;
  const profile = await getProfile();
  const quote = await getRandomQuote();
  return {
    profile,
    counts,
    totalBooks: counts.all || 0,
    readingCount: counts[STATUS.READING] || 0,
    completedCount: counts[STATUS.COMPLETED] || 0,
    sessions: totals.sessions,
    pagesRead: totals.pages,
    minutesRead: totals.minutes,
    streak: streak.current,
    readingProgress: pageSums.tot > 0 ? Math.round((pageSums.cur / pageSums.tot) * 100) : 0,
    reading,
    recent,
    favourites,
    wishlistCount: wishlist.n,
    activeChallenge,
    quote,
  };
}

export async function getStatistics(year = new Date().getFullYear()) {
  const db = await getDb();
  const counts = await getStatusCounts();
  const totals = await getSessionTotals();
  const streaks = computeStreaks(await getSessionDates(db));
  const wishlist = await db.getFirstAsync('SELECT COUNT(*) AS n FROM Wishlist');
  const avg = await db.getFirstAsync('SELECT AVG(rating) AS a, COUNT(*) AS n FROM Books WHERE rating > 0');

  const favGenre = await db.getFirstAsync(
    `SELECT genre, COUNT(*) AS n, SUM(status = 'Completed') AS done FROM Books
     GROUP BY genre ORDER BY done DESC, n DESC, genre ASC LIMIT 1`
  );
  const genreRows = await db.getAllAsync('SELECT genre, COUNT(*) AS n FROM Books GROUP BY genre ORDER BY n DESC, genre ASC');

  const monthPages = await db.getAllAsync(
    `SELECT CAST(substr(session_date, 6, 2) AS INTEGER) AS m, SUM(pages_read) AS pages, SUM(duration_minutes) AS minutes
     FROM ReadingSessions WHERE substr(session_date, 1, 4) = ? GROUP BY m`,
    [String(year)]
  );
  const monthBooks = await db.getAllAsync(
    `SELECT CAST(substr(date_completed, 6, 2) AS INTEGER) AS m, COUNT(*) AS n
     FROM Books WHERE status = 'Completed' AND date_completed IS NOT NULL AND substr(date_completed, 1, 4) = ? GROUP BY m`,
    [String(year)]
  );
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    pages: monthPages.find((r) => r.m === i + 1)?.pages || 0,
    minutes: monthPages.find((r) => r.m === i + 1)?.minutes || 0,
    books: monthBooks.find((r) => r.m === i + 1)?.n || 0,
  }));

  const yearPages = await db.getAllAsync(
    `SELECT substr(session_date, 1, 4) AS y, SUM(pages_read) AS pages, SUM(duration_minutes) AS minutes
     FROM ReadingSessions GROUP BY y`
  );
  const yearBooks = await db.getAllAsync(
    `SELECT substr(date_completed, 1, 4) AS y, COUNT(*) AS n FROM Books
     WHERE status = 'Completed' AND date_completed IS NOT NULL GROUP BY y`
  );
  const years = Array.from(new Set([...yearPages.map((r) => r.y), ...yearBooks.map((r) => r.y), String(year)])).sort();
  const yearly = years.map((y) => ({
    year: y,
    pages: yearPages.find((r) => r.y === y)?.pages || 0,
    minutes: yearPages.find((r) => r.y === y)?.minutes || 0,
    books: yearBooks.find((r) => r.y === y)?.n || 0,
  }));

  const challenges = await getChallenges();
  const completedChallenges = challenges.filter((c) => c.isCompleted).length;
  const booksThisYear = yearBooks.find((r) => r.y === String(year))?.n || 0;
  const profile = await getProfile();
  const velocity = totals.minutes > 0 ? Math.round((totals.pages / totals.minutes) * 60) : 0;

  return {
    profile,
    year,
    totalBooks: counts.all || 0,
    completed: counts[STATUS.COMPLETED] || 0,
    reading: counts[STATUS.READING] || 0,
    onHold: counts[STATUS.HOLD] || 0,
    wantToRead: counts[STATUS.WANT] || 0,
    wishlist: wishlist.n,
    pagesRead: totals.pages,
    minutesRead: totals.minutes,
    sessions: totals.sessions,
    averageRating: avg.n > 0 ? avg.a : 0,
    ratedBooks: avg.n,
    favouriteGenre: favGenre?.genre || '—',
    genres: genreRows,
    monthly,
    yearly,
    streak: streaks.current,
    longestStreak: streaks.longest,
    velocity,
    challengesTotal: challenges.length,
    challengesCompleted: completedChallenges,
    booksThisYear,
    yearStart: startOfYearISO(),
  };
}
