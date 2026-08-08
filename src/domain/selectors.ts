import { addDays, daysBetween, isoWeekday, lastNDays, today } from './date';
import type {
  AppState,
  Appointment,
  ISODate,
  LogEntry,
  MetricReading,
  Prescription,
  Program,
  TaskInstance,
} from './types';

/** Is this prescription due on this date, and how many times? */
export function occurrencesOn(p: Prescription, date: ISODate, program: Program): number {
  if (daysBetween(program.startsOn, date) < 0) return 0;
  if (program.endsOn && daysBetween(date, program.endsOn) < 0) return 0;

  switch (p.schedule.type) {
    case 'daily':
      return p.schedule.timesPerDay;
    case 'weekdays':
      return p.schedule.days.includes(isoWeekday(date)) ? 1 : 0;
    case 'interval': {
      const offset = daysBetween(program.startsOn, date);
      return offset % p.schedule.everyNDays === 0 ? 1 : 0;
    }
  }
}

const TIME_ORDER = { morning: 0, midday: 1, evening: 2, anytime: 3 } as const;

/** Everything the patient owes on a given day, with any log already attached. */
export function tasksForDay(state: AppState, patientId: string, date: ISODate): TaskInstance[] {
  const programs = state.programs.filter((pr) => pr.patientId === patientId);
  const byKey = new Map<string, LogEntry>();
  for (const l of state.logs) {
    if (l.patientId === patientId && l.date === date) {
      byKey.set(`${l.prescriptionId}:${l.occurrence}`, l);
    }
  }

  const out: TaskInstance[] = [];
  for (const program of programs) {
    const scripts = state.prescriptions.filter((p) => p.programId === program.id);
    for (const p of scripts) {
      const n = occurrencesOn(p, date, program);
      for (let i = 0; i < n; i++) {
        out.push({
          key: `${p.id}:${i}:${date}`,
          prescription: p,
          date,
          occurrence: i,
          entry: byKey.get(`${p.id}:${i}`),
        });
      }
    }
  }

  return out.sort(
    (a, b) =>
      TIME_ORDER[a.prescription.timeOfDay] - TIME_ORDER[b.prescription.timeOfDay] ||
      a.prescription.title.localeCompare(b.prescription.title) ||
      a.occurrence - b.occurrence,
  );
}

export interface DayAdherence {
  date: ISODate;
  due: number;
  done: number;
  /** null when nothing was due — an empty day is not a failed day. */
  rate: number | null;
}

export function adherenceForDay(state: AppState, patientId: string, date: ISODate): DayAdherence {
  const tasks = tasksForDay(state, patientId, date);
  const done = tasks.filter((t) => t.entry?.status === 'done').length;
  return { date, due: tasks.length, done, rate: tasks.length ? done / tasks.length : null };
}

export function adherenceSeries(state: AppState, patientId: string, days: number): DayAdherence[] {
  return lastNDays(days).map((d) => adherenceForDay(state, patientId, d));
}

/** Mean adherence over a window, ignoring days with nothing due. */
export function adherenceRate(series: DayAdherence[]): number | null {
  const scored = series.filter((d) => d.rate !== null) as Required<DayAdherence>[];
  if (!scored.length) return null;
  return scored.reduce((s, d) => s + (d.rate as number), 0) / scored.length;
}

/**
 * The bar a day has to clear to count towards a streak, and the bar used for
 * triage. One number, used everywhere, so "good week" means the same thing on
 * the patient's screen and the clinician's.
 */
export const GOOD_DAY = 0.8;

/**
 * Consecutive days ending today that cleared {@link GOOD_DAY}.
 *
 * Requiring a *perfect* day would be the obvious rule and is the wrong one: on
 * a six-item program a single forgotten item resets the count to zero, so a
 * patient running at 93% adherence sees a streak of 0 and learns the number is
 * unwinnable. A streak is a motivational device — it has to be reachable on a
 * realistically imperfect day or it does the opposite of its job.
 *
 * Today is exempt until it clears the bar: a day still in progress is skipped,
 * never counted as a failure, or every streak would read zero each morning.
 */
export function currentStreak(state: AppState, patientId: string): number {
  let streak = 0;
  let cursor = today();
  for (let i = 0; i < 400; i++) {
    const day = adherenceForDay(state, patientId, cursor);
    if (day.rate === null) {
      // Nothing was due — a rest day neither earns nor breaks a streak.
      cursor = addDays(cursor, -1);
      continue;
    }
    if (day.rate >= GOOD_DAY) {
      streak++;
    } else if (i === 0) {
      // Today is still open: neither credit nor penalty.
    } else {
      break;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export type RiskLevel = 'on-track' | 'slipping' | 'at-risk';

/**
 * Triage signal for the clinician's patient list. Weighted to the last 7 days
 * because that is the window in which an intervention still changes the
 * outcome; a patient who was perfect last month but has missed four of the
 * last seven days needs the call today.
 */
export function riskLevel(state: AppState, patientId: string): RiskLevel {
  const week = adherenceRate(adherenceSeries(state, patientId, 7));
  if (week === null) return 'on-track';
  if (week >= GOOD_DAY) return 'on-track';
  if (week >= 0.5) return 'slipping';
  return 'at-risk';
}

/**
 * Trailing mean of the adherence series.
 *
 * Raw daily adherence on a short program is close to binary, so a 30-day daily
 * line is visual noise — it looks alarming for a patient who is doing well and
 * identical for one who is not. Smoothing over a week turns it back into the
 * thing a clinician actually wants from a sparkline: direction of travel.
 */
export function smoothedAdherence(series: DayAdherence[], window = 7): number[] {
  const out: number[] = [];
  for (let i = 0; i < series.length; i++) {
    const slice = series.slice(Math.max(0, i - window + 1), i + 1).filter((d) => d.rate !== null);
    if (!slice.length) continue;
    out.push(slice.reduce((s, d) => s + (d.rate as number), 0) / slice.length);
  }
  return out;
}

export function readingsFor(state: AppState, patientId: string, key: string): MetricReading[] {
  return state.readings
    .filter((r) => r.patientId === patientId && r.key === key)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Change between the first and last third of the series — resistant to a
 *  single noisy reading in a way a first-vs-last comparison is not. */
export function metricTrend(readings: MetricReading[]): { delta: number; pct: number } | null {
  if (readings.length < 4) return null;
  const third = Math.max(1, Math.floor(readings.length / 3));
  const mean = (xs: MetricReading[]) => xs.reduce((s, r) => s + r.value, 0) / xs.length;
  const first = mean(readings.slice(0, third));
  const last = mean(readings.slice(-third));
  return { delta: last - first, pct: first === 0 ? 0 : (last - first) / Math.abs(first) };
}

export function upcomingAppointments(state: AppState, filter: { patientId?: string; clinicianId?: string }) {
  const now = Date.now();
  return state.appointments
    .filter((a) => a.status === 'scheduled' && new Date(a.startsAt).getTime() >= now - 3_600_000)
    .filter((a) => (filter.patientId ? a.patientId === filter.patientId : true))
    .filter((a) => (filter.clinicianId ? a.clinicianId === filter.clinicianId : true))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function nextAppointment(state: AppState, patientId: string): Appointment | undefined {
  return upcomingAppointments(state, { patientId })[0];
}

export function patientsOf(state: AppState, clinicianId: string) {
  return state.patients.filter((p) => p.clinicianId === clinicianId);
}

export function programFor(state: AppState, patientId: string): Program | undefined {
  return state.programs.find((p) => p.patientId === patientId);
}
