export const GENRES = [
  'Fantasy',
  'Mystery',
  'Romance',
  'Adventure',
  'Science Fiction',
  'Historical Fiction',
  'Thriller',
  'Young Adult',
  'Fiction',
  'Classics',
];

export const STATUS = {
  WANT: 'Want to Read',
  READING: 'Currently Reading',
  COMPLETED: 'Completed',
  HOLD: 'On Hold',
};

export const STATUSES = [STATUS.WANT, STATUS.READING, STATUS.COMPLETED, STATUS.HOLD];

export const STATUS_SHORT = {
  [STATUS.WANT]: 'Want to Read',
  [STATUS.READING]: 'Reading',
  [STATUS.COMPLETED]: 'Completed',
  [STATUS.HOLD]: 'On Hold',
};

export const SORT_OPTIONS = [
  { key: 'recent', label: 'Recently added' },
  { key: 'alpha', label: 'A – Z' },
  { key: 'rating', label: 'Top rated' },
];

export const MOODS = [
  'Awestruck',
  'Nostalgic',
  'Philosophical',
  'Joyful',
  'Heartbroken',
  'Thrilled',
  'Peaceful',
  'Curious',
];

export const APP_NAME = 'PAGEORIA';
export const TAGLINE = 'Where Every Book Opens a New World.';
export const APP_VERSION = '1.0.0';
