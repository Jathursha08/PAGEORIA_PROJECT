import { monthNames, t } from '../i18n';
// Date helpers. All dates in the database are stored as local 'YYYY-MM-DD' strings.
const pad = (n) => String(n).padStart(2, '0');

export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

export const nowISO = () => new Date().toISOString();

export const parseISODate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isValidISODate = (iso) => {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = parseISODate(iso);
  return !!d && toISODate(d) === iso;
};

export const addDays = (iso, n) => {
  const d = parseISODate(iso) || new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

export const daysAgoISO = (n) => addDays(todayISO(), -n);

export const diffDays = (fromISO, toISO) => {
  const a = parseISODate(fromISO);
  const b = parseISODate(toISO);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};


export const formatDate = (iso) => {
  const d = parseISODate(iso);
  if (!d) return '';
  return `${monthNames()[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const formatShortDate = (iso) => {
  const d = parseISODate(iso);
  if (!d) return '';
  return `${monthNames()[d.getMonth()]} ${d.getDate()}`;
};

export const relativeDay = (iso) => {
  const diff = diffDays(iso, todayISO());
  if (diff === 0) return t('Today');
  if (diff === 1) return t('Yesterday');
  if (diff > 1 && diff < 7) return t('{n} days ago', { n: diff });
  return formatDate(iso);
};

// Monday of the week containing the given date
export const startOfWeekISO = (iso = todayISO()) => {
  const d = parseISODate(iso);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return toISODate(d);
};

export const startOfMonthISO = (iso = todayISO()) => `${iso.slice(0, 7)}-01`;
export const startOfYearISO = (iso = todayISO()) => `${iso.slice(0, 4)}-01-01`;
export const endOfYearISO = (iso = todayISO()) => `${iso.slice(0, 4)}-12-31`;
export const endOfMonthISO = (iso = todayISO()) => {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return t('Good morning');
  if (h < 18) return t('Good afternoon');
  return t('Good evening');
};

export const monthLabels = () => monthNames();
