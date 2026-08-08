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
  // A discontinued prescription stops generating tasks from its end date, but
  // remains due on every day before it — so past adherence is unchanged.
  if (p.endedOn && daysBetween(p.endedOn, date) >= 0) return 0;

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
  /** Tasks the patient explicitly reported they could not do. Tracked apart
   *  from silent misses: the two look identical in a completion rate but mean
   *  opposite things about the patient's engagement. */
  reportedUnable: number;
  /** null when nothing was due — an empty day is not a failed day. */
  rate: number | null;
}

export function adherenceForDay(state: AppState, patientId: string, date: ISODate): DayAdherence {
  const tasks = tasksForDay(state, patientId, date);
  const done = tasks.filter((t) => t.entry?.status === 'done').length;
  const reportedUnable = tasks.filter((t) => t.entry?.status === 'skipped').length;
  return {
    date,
    due: tasks.length,
    done,
    reportedUnable,
    // Adherence stays strict: a reported skip is still work that did not
    // happen, and a clinician reading 90% must be able to trust it means the
    // program was done. Honesty is credited in the streak instead.
    rate: tasks.length ? done / tasks.length : null,
  };
}

export function adherenceSeries(state: AppState, patientId: string, days: number): DayAdherence[] {
  return lastNDays(days).map((d) => adherenceForDay(state, patientId, d));
}

/**
 * The series clipped to the program's own start date.
 *
 * A 90-day window on a six-week program would otherwise render seven weeks of
 * empty pre-treatment bars, which reads as two months of total non-adherence
 * rather than "this had not started yet".
 */
export function adherenceSeriesForChart(state: AppState, patientId: string, days: number): DayAdherence[] {
  const program = programFor(state, patientId);
  const series = adherenceSeries(state, patientId, days);
  if (!program) return series;
  return series.filter((d) => d.date >= program.startsOn);
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
    // Reporting "I couldn't" counts towards the streak even though it does not
    // count towards adherence. The app asks patients to be honest on their
    // worst days; breaking their streak for doing so would make the honest
    // answer the expensive one, and they would simply stop answering.
    const engaged = day.due ? (day.done + day.reportedUnable) / day.due : 1;
    if (engaged >= GOOD_DAY) {
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

export interface Triage {
  level: RiskLevel;
  /** What drove the level, so callers can present the two causes differently
   *  instead of replacing one signal with the other. */
  kind: 'adherence' | 'outcome' | 'none';
  /** One short phrase naming *why* this patient is ranked where they are.
   *  A risk badge without a reason just moves the guesswork downstream. */
  reason: string;
}

/**
 * Triage signal for the clinician's patient list.
 *
 * Adherence is weighted to the last 7 days, because that is the window in
 * which an intervention still changes the outcome — a patient who was perfect
 * last month but has missed four of the last seven days needs the call today.
 *
 * Adherence alone is not enough, though. A patient doing everything asked of
 * them whose pain has just spiked is the *most* urgent person on the list and
 * the one a pure-adherence ranking buries at the bottom, so a deterioration in
 * the outcome measure escalates independently.
 */
export function triage(state: AppState, patientId: string): Triage {
  const week = adherenceRate(adherenceSeries(state, patientId, 7));
  const program = programFor(state, patientId);
  const alarm = program
    ? outcomeAlarm(readingsFor(state, patientId, program.primaryMetric.key), program.primaryMetric.higherIsBetter)
    : null;

  if (alarm && program) {
    const unit = program.primaryMetric.unit;
    return {
      level: 'at-risk',
      kind: 'outcome',
      reason: `${program.primaryMetric.label} worse by ${alarm.worseBy.toFixed(1)}${unit}`,
    };
  }

  if (week === null) return { level: 'on-track', kind: 'none', reason: 'Nothing due yet' };
  const pct = `${Math.round(week * 100)}% this week`;
  if (week >= GOOD_DAY) return { level: 'on-track', kind: 'adherence', reason: pct };
  if (week >= 0.5) return { level: 'slipping', kind: 'adherence', reason: pct };
  return { level: 'at-risk', kind: 'adherence', reason: `Only ${pct}` };
}

export function riskLevel(state: AppState, patientId: string): RiskLevel {
  return triage(state, patientId).level;
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
  let carry = 0;
  for (let i = 0; i < series.length; i++) {
    const slice = series.slice(Math.max(0, i - window + 1), i + 1).filter((d) => d.rate !== null);
    // Carry the previous value through all-rest-day windows rather than
    // dropping the point: a shorter array would silently compress the x-axis
    // and misalign the line with the window it claims to cover.
    if (slice.length) carry = slice.reduce((s, d) => s + (d.rate as number), 0) / slice.length;
    out.push(carry);
  }
  return out;
}

/** Readings inside the last N *days* — not the last N readings. A metric taken
 *  every third day would otherwise show three weeks of data under a "7 days"
 *  heading. */
/**
 * Everything the app says about a patient's outcome measure, computed once
 * from the full series.
 *
 * Trend and alarm must never be derived from whatever chart zoom happens to be
 * open: doing that made one patient's "recent" change read as nothing at 7
 * days, −10° at 30 and −15° at 90 on the same afternoon, and left the patient
 * with no interpretation at all on the same day her clinician was told she was
 * at risk. The window controls what is *plotted*, nothing else.
 */
export function outcomeSummary(state: AppState, patientId: string) {
  const program = programFor(state, patientId);
  if (!program) return null;
  const readings = readingsFor(state, patientId, program.primaryMetric.key);
  const trend = metricTrend(readings);
  return {
    metric: program.primaryMetric,
    readings,
    trend,
    improving: isImproving(trend, program.primaryMetric.higherIsBetter),
    alarm: outcomeAlarm(readings, program.primaryMetric.higherIsBetter),
    latest: readings[readings.length - 1],
  };
}

export function readingsInWindow(readings: MetricReading[], days: number): MetricReading[] {
  const from = addDays(today(), -(days - 1));
  return readings.filter((r) => r.date >= from);
}

export function readingsFor(state: AppState, patientId: string, key: string): MetricReading[] {
  return state.readings
    .filter((r) => r.patientId === patientId && r.key === key)
    .sort((a, b) => a.date.localeCompare(b.date));
}

const mean = (xs: MetricReading[]) => xs.reduce((s, r) => s + r.value, 0) / xs.length;

export interface MetricTrend {
  /** Long-run change: last third minus first third. Resistant to a single
   *  noisy reading in a way first-vs-last is not. */
  delta: number;
  pct: number;
  /** Short-run change: the most recent readings against the ones before them.
   *  Kept separate because the two answer different questions and can point in
   *  opposite directions — which is exactly the case that matters clinically. */
  recentDelta: number;
}

export function metricTrend(readings: MetricReading[]): MetricTrend | null {
  if (readings.length < 4) return null;
  const third = Math.max(1, Math.floor(readings.length / 3));
  const first = mean(readings.slice(0, third));
  const last = mean(readings.slice(-third));

  const win = Math.min(3, Math.max(1, Math.floor(readings.length / 4)));
  const recent = mean(readings.slice(-win));
  const prior = mean(readings.slice(-(win * 2), -win));

  return {
    delta: last - first,
    pct: first === 0 ? 0 : (last - first) / Math.abs(first),
    recentDelta: recent - prior,
  };
}

/**
 * Is the outcome measure currently moving the right way?
 *
 * Deliberately judged on the *recent* slope rather than the whole-series
 * thirds. A patient who has improved for six weeks and then spiked badly today
 * is not "improving" — but a thirds comparison dilutes that spike to nothing
 * and reports green. Telling someone in fresh pain that their numbers look
 * great is the single fastest way to destroy their trust in the app.
 */
export function isImproving(trend: MetricTrend | null, higherIsBetter: boolean): boolean | null {
  if (!trend) return null;
  const signed = higherIsBetter ? trend.recentDelta : -trend.recentDelta;
  if (Math.abs(trend.recentDelta) < 0.5) {
    // Flat recently — fall back to the long-run direction.
    const long = higherIsBetter ? trend.delta : -trend.delta;
    return long > 0;
  }
  return signed > 0;
}

/**
 * A clinically meaningful deterioration in the outcome measure, independent of
 * adherence. Two points on a 0–10 PROM is the usual minimal important
 * difference; for wider-range metrics we scale to the observed spread.
 */
export function outcomeAlarm(
  readings: MetricReading[],
  higherIsBetter: boolean,
): { latest: number; worseBy: number } | null {
  if (readings.length < 4) return null;
  const latest = readings[readings.length - 1];
  const baseline = mean(readings.slice(-6, -1));
  const values = readings.map((r) => r.value);
  const spread = Math.max(...values) - Math.min(...values);
  const threshold = Math.max(1.5, spread * 0.25);

  const worseBy = higherIsBetter ? baseline - latest.value : latest.value - baseline;
  return worseBy >= threshold ? { latest: latest.value, worseBy } : null;
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

export function messagesFor(state: AppState, patientId: string) {
  return state.messages
    .filter((m) => m.patientId === patientId)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

export function unreadCount(state: AppState, patientId: string, role: 'patient' | 'clinician') {
  return state.messages.filter(
    (m) => m.patientId === patientId && m.from !== role && !(role === 'clinician' ? m.readByClinician : m.readByPatient),
  ).length;
}

export function patientsOf(state: AppState, clinicianId: string) {
  return state.patients.filter((p) => p.clinicianId === clinicianId);
}

export function programFor(state: AppState, patientId: string): Program | undefined {
  return state.programs.find((p) => p.patientId === patientId);
}
