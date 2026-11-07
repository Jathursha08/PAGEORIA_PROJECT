// Tiny offline i18n. English text is the key; other languages map English -> translation.
// Missing translations fall back to English, so the app never shows blank text.
import ta from './ta';
import si from './si';

export const LANGUAGES = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'si', native: 'සිංහල', english: 'Sinhala' },
];

const dictionaries = { ta, si };

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ta: ['ஜன', 'பிப்', 'மார்', 'ஏப்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக', 'செப்', 'அக்', 'நவ', 'டிச'],
  si: ['ජන', 'පෙබ', 'මාර්', 'අප්‍රේ', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'],
};

let current = 'en';

export const getLanguage = () => current;
export const setLanguage = (code) => {
  current = LANGUAGES.some((l) => l.code === code) ? code : 'en';
};

export const monthNames = () => MONTHS[current] || MONTHS.en;

// t('Hello {name}', { name: 'Aurelia' })
export function t(key, params) {
  const table = dictionaries[current];
  let text = (table && table[key]) || key;
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, name) => (params[name] !== undefined ? String(params[name]) : match));
  }
  return text;
}

// Chooses between a singular and plural key: tp(3, '{n} book', '{n} books')
export const tp = (n, one, other) => t(n === 1 ? one : other, { n });
