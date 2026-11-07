# PAGEORIA — Where Every Book Opens a New World.

A Digital Book Haven for Reading Journeys, Story Reflections and Creative Imagination.
An offline-first React Native (Expo) app. All data lives in a local SQLite database — no APIs, no accounts, no internet.

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go, or press a / i for an emulator
```
Requirements: Node 18+ and the Expo Go app (same SDK version, SDK 58) or an Android/iOS emulator.
If Expo reports a version mismatch: `npx expo install --fix`.

## Stack
Expo SDK 58 · React Native · JavaScript · React Navigation (bottom tabs + native stack) · expo-sqlite ·
expo-image-picker + expo-image-manipulator (optional local covers) · expo-document-picker + expo-file-system + expo-sharing (book files, import/export) · @expo/vector-icons · Playfair Display + Plus Jakarta Sans (bundled fonts, no network).

## Navigation
Bottom tabs: **Home · Bookshelf · Journal · Wishlist · Profile**
Stack screens: Book Details · Add / Edit Book · Reading Tracker · Quotes & Reviews · Challenges (Quests) · Statistics

| # | Screen | File |
|---|--------|------|
| 1 | Home Dashboard | `src/screens/HomeScreen.js` |
| 2 | My Bookshelf | `src/screens/BookshelfScreen.js` |
| 3 | Add / Edit Book | `src/screens/AddEditBookScreen.js` |
| 4 | Book Details | `src/screens/BookDetailsScreen.js` |
| 5 | Reading Tracker | `src/screens/ReadingTrackerScreen.js` |
| 6 | Reading Journal | `src/screens/JournalScreen.js` |
| 7 | Quotes & Reviews | `src/screens/QuotesReviewsScreen.js` |
| 8 | Wishlist & Challenges | `src/screens/WishlistChallengesScreen.js` |
| 9 | Statistics & Profile | `src/screens/StatisticsProfileScreen.js` |

## Database (`src/database`)
- `schema.js` – 8 tables (Books, ReadingSessions, JournalEntries, Quotes, Reviews, Wishlist, ReadingChallenges, UserProfile) + AppMeta, with primary/foreign keys, timestamps and indexes.
- `database.js` – opens one shared connection, creates tables, inserts the default profile, and seeds sample data **once** (only when Books is empty *and* the `sample_data_seeded` flag is absent, so deleting every book never brings the samples back).
- `seedData.js` – 30 original, fictional books (3 per genre across 10 genres) with matching sessions, journal entries, quotes, reviews, wishlist items and challenges. Dates are generated relative to today.
- `databaseServices.js` – every CRUD, search, filter, sort and statistics query. Screens never contain SQL.

### Automatic behaviour
- Logging a session moves the book's current page forward, flips *Want to Read / On Hold* → *Currently Reading*, and marks it *Completed* (with a completion date) on the last page.
- Completed books drive reading-challenge progress (date range + optional genre) automatically.
- Dashboard, tracker totals, streaks and statistics are all computed from stored rows — nothing is hard-coded.
- Deleting a book removes its sessions, quotes and reviews; journal entries are kept (their book link is cleared).
- Book covers are resized and stored inside SQLite as small JPEG data-URIs, so they survive cache clearing and work offline. Without a photo, a book-cloth cover is generated from the title.


## New in 1.1 — Language, Theme, Upload books
Open **Settings** from the ⚙ icon on Home (or Profile → Settings).

- **Language:** English · தமிழ் · සිංහල. Whole UI, messages, validation text, dates and durations are translated. Your own data (book titles, notes, quotes) is never translated. The choice is remembered (AsyncStorage). Translations live in `src/i18n/ta.js` and `si.js` — English text is the key, so any missing line safely falls back to English.
- **Theme:** Follow system · Sage Light · Parchment (sepia) · Midnight Dark. Palettes are in `src/constants/theme.js`; every style is built with `themedStyles()` so the theme can change at runtime. The choice is remembered.
- **Upload books**
  - *Attach a book file* (PDF, EPUB, TXT, MOBI, DOCX…, up to 150 MB) on **Add/Edit Book** or **Book Details → Your copy**. Files are copied into the app's private storage and recorded in SQLite; **Open** hands the file to a reader app via the system sheet. Works offline.
  - *Import many books* from a `.csv` or `.json` file (Bookshelf ⬆ button or Settings). Flexible column names (`title, author, genre, total_pages, current_page, status, rating, description, date_added, favourite`), quoted fields, `,` `;` or tab delimiters. Duplicates (same title + author) and invalid rows are skipped and summarised.
  - *Export my books* (JSON) and *Download CSV template* use the system share sheet.
- Existing installs upgrade automatically: new `file_*` columns are added to `Books` with `ALTER TABLE` on first launch.

Extra manual tests: switch each language/theme and visit every screen · attach a PDF, open it, replace it, remove it · import the CSV template twice (second time everything is skipped as duplicate) · delete a book that has a file.

## Manual test checklist
1. Launch → dashboard shows 30 books / 7 reading / 12 finished. Kill and relaunch: still 30 (no duplicates).
2. Bookshelf: search `Voss`, filter Fantasy, filter Completed, sort A–Z / Top rated, toggle grid/list, tap a heart.
3. Add a book with blank title / 0 pages / current > total → validation messages. Then save a valid one → opens its details.
4. Details: use −10 / +10 / ✓ to update progress; change status; edit; delete (confirmation).
5. Tracker: log a session (end page ≤ total, minutes > 0) → book page, totals, weekly chart and streak update. Edit and delete a session.
6. Journal: create, edit, delete, search, filter by book, newest/oldest.
7. Quotes & Reviews: add/edit/delete, search quotes, filter by book, filter reviews by rating.
8. Wishlist: add, edit, search, **Move to Bookshelf** (opens prefilled form). Quests: create (with presets), edit, delete; finish a book and watch progress rise.
9. Profile: edit name/intro/goal/genre; stats and genre chart reflect your data.
10. Turn on airplane mode — everything still works. Close and reopen — all changes persist.
