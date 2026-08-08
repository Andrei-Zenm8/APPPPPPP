import type { ISODate } from './types';

/** All date maths in Apol goes through here, in *local* time. Using UTC would
 *  silently shift a patient's "today" across the date line and mark a
 *  completed day as missed. */

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = fromISODate(b).getTime() - fromISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(s: ISODate): number {
  const d = fromISODate(s).getDay();
  return d === 0 ? 7 : d;
}

/** Inclusive range of dates. */
export function range(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The last `n` days ending today (inclusive), oldest first. */
export function lastNDays(n: number, end: ISODate = today()): ISODate[] {
  return range(addDays(end, -(n - 1)), end);
}

const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortWeekday(s: ISODate): string {
  return WEEKDAY[isoWeekday(s) - 1];
}

export function formatDay(s: ISODate): string {
  const d = fromISODate(s);
  return `${WEEKDAY[isoWeekday(s) - 1]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = `${d.getHours()}`.padStart(2, '0');
  const mm = `${d.getMinutes()}`.padStart(2, '0');
  return `${formatDay(toISODate(d))} · ${hh}:${mm}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}

/** "in 3 days" / "tomorrow" / "today" / "6 days ago" */
export function relativeDay(target: ISODate, from: ISODate = today()): string {
  const n = daysBetween(from, target);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
