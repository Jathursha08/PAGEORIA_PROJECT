import { t } from '../i18n';

export const formatMinutes = (mins) => {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  if (m < 60) return t('{n} min', { n: m });
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? t('{h}h', { h }) : t('{h}h {m}m', { h, m: r });
};

export const formatNumber = (n) => Number(n || 0).toLocaleString('en-US');

export const percent = (part, total) => {
  const p = Number(part) || 0;
  const whole = Number(total) || 0;
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((p / whole) * 100)));
};

export const roundOne = (n) => Math.round((Number(n) || 0) * 10) / 10;

export const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

export const truncate = (s, n) => {
  const str = String(s || '');
  return str.length > n ? `${str.slice(0, n - 1).trim()}…` : str;
};
