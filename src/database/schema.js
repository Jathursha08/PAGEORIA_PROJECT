// PAGEORIA — SQLite schema. Dates are stored as 'YYYY-MM-DD' text; timestamps as ISO strings.

export const DB_NAME = 'pageoria.db';

export const CREATE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS Books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  total_pages INTEGER NOT NULL CHECK (total_pages > 0),
  current_page INTEGER NOT NULL DEFAULT 0 CHECK (current_page >= 0),
  status TEXT NOT NULL DEFAULT 'Want to Read',
  rating REAL NOT NULL DEFAULT 0,
  date_added TEXT NOT NULL,
  date_completed TEXT,
  cover_uri TEXT,
  cover_color INTEGER NOT NULL DEFAULT 0,
  is_favourite INTEGER NOT NULL DEFAULT 0,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_mime TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ReadingSessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  session_date TEXT NOT NULL,
  start_page INTEGER NOT NULL,
  end_page INTEGER NOT NULL,
  pages_read INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES Books (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS JournalEntries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER,
  title TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  thoughts TEXT NOT NULL DEFAULT '',
  favourite_characters TEXT NOT NULL DEFAULT '',
  memorable_scenes TEXT NOT NULL DEFAULT '',
  feelings TEXT NOT NULL DEFAULT '',
  reflections TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES Books (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  quote_text TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  page_number INTEGER,
  date_saved TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES Books (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  date_reviewed TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES Books (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  total_pages INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ReadingChallenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  target_books INTEGER NOT NULL CHECK (target_books > 0),
  genre TEXT,
  start_date TEXT NOT NULL,
  deadline TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS UserProfile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL,
  intro TEXT NOT NULL DEFAULT '',
  favourite_genre TEXT NOT NULL DEFAULT '',
  yearly_goal INTEGER NOT NULL DEFAULT 12,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS AppMeta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_book ON ReadingSessions (book_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON ReadingSessions (session_date);
CREATE INDEX IF NOT EXISTS idx_journal_book ON JournalEntries (book_id);
CREATE INDEX IF NOT EXISTS idx_quotes_book ON Quotes (book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_book ON Reviews (book_id);
`;

// Columns added after the first release. Older installs get them through ALTER TABLE (see database.js).
export const BOOK_COLUMN_MIGRATIONS = [
  ['file_name', 'TEXT'],
  ['file_path', 'TEXT'],
  ['file_size', 'INTEGER'],
  ['file_mime', 'TEXT'],
];
