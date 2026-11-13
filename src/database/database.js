import * as SQLite from 'expo-sqlite';
import { BOOK_COLUMN_MIGRATIONS, CREATE_SCHEMA_SQL, DB_NAME } from './schema';
import { nowISO } from '../utils/dates';

let dbPromise = null;

// A single shared connection for the whole app.
export function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      return db;
    });
  }
  return dbPromise;
}

let initPromise = null;

// Creates tables and a default profile, without inserting sample books or other demo data.
export function initDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await getDb();
      await db.execAsync(CREATE_SCHEMA_SQL);

      // Upgrade databases created by an older version of the app.
      const columns = await db.getAllAsync('PRAGMA table_info(Books)');
      const existing = new Set(columns.map((c) => c.name));
      for (const [name, type] of BOOK_COLUMN_MIGRATIONS) {
        if (!existing.has(name)) await db.execAsync(`ALTER TABLE Books ADD COLUMN ${name} ${type}`);
      }

      const now = nowISO();
      await db.runAsync(
        `INSERT OR IGNORE INTO UserProfile (id, display_name, intro, favourite_genre, yearly_goal, created_at, updated_at)
         VALUES (1, 'Reader', '', '', 15, ?, ?)`,
        [now, now]
      );

      return true;
    })().catch((err) => {
      initPromise = null; // allow retry
      throw err;
    });
  }
  return initPromise;
}
