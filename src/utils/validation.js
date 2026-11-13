import { isValidISODate, todayISO } from './dates';
import { t } from '../i18n';

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

export const isPositiveInt = (v) => /^\d+$/.test(String(v).trim()) && Number(v) > 0;
export const isNonNegativeInt = (v) => /^\d+$/.test(String(v).trim());

export function validateBook(f) {
  const e = {};
  if (isBlank(f.title)) e.title = t('Please enter the book title.');
  if (isBlank(f.author)) e.author = t('Please enter the author.');
  if (isBlank(f.genre)) e.genre = t('Please choose a genre.');
  if (isBlank(f.total_pages)) e.total_pages = t('Total pages is required.');
  else if (!isPositiveInt(f.total_pages)) e.total_pages = t('Enter a whole number greater than 0.');
  if (!isBlank(f.current_page)) {
    if (!isNonNegativeInt(f.current_page)) e.current_page = t('Enter a whole number (0 or more).');
    else if (!e.total_pages && Number(f.current_page) > Number(f.total_pages))
      e.current_page = t('Current page cannot exceed total pages.');
  }
  if (isBlank(f.status)) e.status = t('Choose a reading status.');
  if (!isValidISODate(f.date_added || '')) e.date_added = t('Use the format YYYY-MM-DD.');
  return e;
}

export function validateSession(f, book) {
  const e = {};
  if (!f.book_id) e.book_id = t('Select the book you read.');
  if (!isValidISODate(f.session_date || '')) e.session_date = t('Use the format YYYY-MM-DD.');
  else if (f.session_date > todayISO()) e.session_date = t('A session cannot be in the future.');
  if (!isNonNegativeInt(f.start_page ?? '')) e.start_page = t('Enter a page number (0 or more).');
  if (!isNonNegativeInt(f.end_page ?? '')) e.end_page = t('Enter a page number.');
  if (!e.start_page && !e.end_page) {
    if (Number(f.end_page) <= Number(f.start_page)) e.end_page = t('Must be greater than the start page.');
    else if (book && Number(f.end_page) > Number(book.total_pages))
      e.end_page = t('This book has only {n} pages.', { n: book.total_pages });
  }
  if (!isPositiveInt(f.duration_minutes ?? '')) e.duration_minutes = t('Enter minutes (1 or more).');
  else if (Number(f.duration_minutes) > 1440) e.duration_minutes = t('That is more than a day!');
  return e;
}

export function validateJournal(f) {
  const e = {};
  if (isBlank(f.title)) e.title = t('Give your entry a title.');
  if (!isValidISODate(f.entry_date || '')) e.entry_date = t('Use the format YYYY-MM-DD.');
  if (isBlank(f.thoughts)) e.thoughts = t('Write a few thoughts first.');
  return e;
}

export function validateQuote(f) {
  const e = {};
  if (isBlank(f.quote_text)) e.quote_text = t('Type the quote you want to keep.');
  if (!f.book_id) e.book_id = t('Select the related book.');
  if (!isValidISODate(f.date_saved || '')) e.date_saved = t('Use the format YYYY-MM-DD.');
  if (!isBlank(f.page_number) && !isPositiveInt(f.page_number)) e.page_number = t('Enter a valid page number.');
  return e;
}

export function validateReview(f) {
  const e = {};
  if (!f.book_id) e.book_id = t('Select the book you are reviewing.');
  if (!(Number(f.rating) >= 1)) e.rating = t('Choose a star rating.');
  if (isBlank(f.title)) e.title = t('Give your review a title.');
  if (isBlank(f.body)) e.body = t('Write your review.');
  if (!isValidISODate(f.date_reviewed || '')) e.date_reviewed = t('Use the format YYYY-MM-DD.');
  return e;
}

export function validateWishlist(f) {
  const e = {};
  if (isBlank(f.title)) e.title = t('Enter the book title.');
  if (isBlank(f.author)) e.author = t('Enter the author.');
  if (isBlank(f.genre)) e.genre = t('Choose a genre.');
  if (!isBlank(f.total_pages) && !isPositiveInt(f.total_pages)) e.total_pages = t('Enter a whole number greater than 0.');
  return e;
}

export function validateChallenge(f) {
  const e = {};
  if (isBlank(f.title)) e.title = t('Name your challenge.');
  if (!isPositiveInt(f.target_books ?? '')) e.target_books = t('Target must be 1 or more books.');
  else if (Number(f.target_books) > 1000) e.target_books = t('Please choose a smaller target.');
  if (!isValidISODate(f.start_date || '')) e.start_date = t('Use the format YYYY-MM-DD.');
  if (!isValidISODate(f.deadline || '')) e.deadline = t('Use the format YYYY-MM-DD.');
  else if (isValidISODate(f.start_date || '') && f.deadline < f.start_date)
    e.deadline = t('Deadline must be after the start date.');
  return e;
}

export function validateProfile(f) {
  const e = {};
  if (isBlank(f.display_name)) e.display_name = t('Please enter your reader name.');
  if (!isBlank(f.yearly_goal) && !isPositiveInt(f.yearly_goal)) e.yearly_goal = t('Enter a whole number.');
  return e;
}
