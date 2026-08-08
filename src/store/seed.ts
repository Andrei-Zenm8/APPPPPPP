import { addDays, today, toISODate } from '../domain/date';
import type { AppState, LogEntry, MetricReading } from '../domain/types';

/**
 * Demo data. Apol is useless to evaluate on an empty database — adherence,
 * streaks and trends only mean something with weeks of history behind them —
 * so a first run seeds one clinician with three patients at deliberately
 * different points on the risk scale.
 */

const start = addDays(today(), -42);

function at(daysFromToday: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildSeed(): AppState {
  const state: AppState = {
    role: 'patient',
    currentPatientId: 'pat-maya',
    currentClinicianId: 'cli-1',
    clinicians: [
      { id: 'cli-1', name: 'Dr. Ana Petrescu', discipline: 'Physiotherapy', clinic: 'Northside Rehab' },
    ],
    patients: [
      {
        id: 'pat-maya',
        clinicianId: 'cli-1',
        name: 'Maya Rendel',
        condition: 'Post-op ACL reconstruction — week 6',
        startedOn: start,
        avatarTint: '#0E7C7B',
      },
      {
        id: 'pat-tom',
        clinicianId: 'cli-1',
        name: 'Tomas Iliev',
        condition: 'Chronic lower-back pain',
        startedOn: start,
        avatarTint: '#B5761A',
      },
      {
        id: 'pat-sara',
        clinicianId: 'cli-1',
        name: 'Sara Novak',
        condition: 'Rotator cuff tendinopathy',
        startedOn: start,
        avatarTint: '#7A4FB8',
      },
    ],
    programs: [
      {
        id: 'prog-maya',
        patientId: 'pat-maya',
        clinicianId: 'cli-1',
        title: 'ACL rehab · phase 2',
        startsOn: start,
        endsOn: addDays(today(), 40),
        primaryMetric: { key: 'pain', label: 'Knee pain', unit: '/10', target: 2, higherIsBetter: false },
      },
      {
        id: 'prog-tom',
        patientId: 'pat-tom',
        clinicianId: 'cli-1',
        title: 'Lumbar stabilisation',
        startsOn: start,
        endsOn: null,
        primaryMetric: { key: 'pain', label: 'Back pain', unit: '/10', target: 3, higherIsBetter: false },
      },
      {
        id: 'prog-sara',
        patientId: 'pat-sara',
        clinicianId: 'cli-1',
        title: 'Shoulder loading protocol',
        startsOn: start,
        endsOn: null,
        primaryMetric: { key: 'rom', label: 'Shoulder abduction', unit: '°', target: 160, higherIsBetter: true },
      },
    ],
    prescriptions: [
      {
        id: 'rx-1',
        programId: 'prog-maya',
        kind: 'exercise',
        title: 'Terminal knee extension',
        dose: '3 × 15',
        rationale: 'Restores the last 10° of extension — the single biggest predictor of a normal gait.',
        timeOfDay: 'morning',
        schedule: { type: 'daily', timesPerDay: 1 },
      },
      {
        id: 'rx-2',
        programId: 'prog-maya',
        kind: 'exercise',
        title: 'Stationary bike',
        dose: '15 min, light resistance',
        rationale: 'Keeps the joint moving and pumps swelling out without loading the graft.',
        timeOfDay: 'evening',
        schedule: { type: 'daily', timesPerDay: 1 },
      },
      {
        id: 'rx-3',
        programId: 'prog-maya',
        kind: 'supplement',
        title: 'Vitamin D3',
        dose: '2000 IU',
        rationale: 'Your last panel came back at 18 ng/mL. Low D slows collagen remodelling.',
        timeOfDay: 'morning',
        schedule: { type: 'daily', timesPerDay: 1 },
      },
      {
        id: 'rx-4',
        programId: 'prog-maya',
        kind: 'exercise',
        title: 'Single-leg balance',
        dose: '3 × 45 s',
        rationale: 'Rebuilds proprioception, which is what actually prevents a re-tear.',
        timeOfDay: 'midday',
        schedule: { type: 'weekdays', days: [1, 3, 5] },
      },
      {
        id: 'rx-5',
        programId: 'prog-maya',
        kind: 'measurement',
        title: 'Rate your knee pain',
        rationale: 'One number a day is how we tell whether the loading is too much or too little.',
        timeOfDay: 'evening',
        schedule: { type: 'daily', timesPerDay: 1 },
        metric: { key: 'pain', label: 'Knee pain', unit: '/10', min: 0, max: 10 },
      },
      {
        id: 'rx-6',
        programId: 'prog-maya',
        kind: 'habit',
        title: 'Ice after loading sessions',
        dose: '10 min',
        rationale: 'Controls the swelling that stops the quad from firing properly the next day.',
        timeOfDay: 'evening',
        schedule: { type: 'daily', timesPerDay: 1 },
      },
      {
        id: 'rx-7',
        programId: 'prog-tom',
        kind: 'exercise',
        title: 'Dead bug',
        dose: '3 × 10 each side',
        rationale: 'Trains the deep core to brace without loading the spine into flexion.',
        timeOfDay: 'morning',
        schedule: { type: 'daily', timesPerDay: 1 },
      },
      {
        id: 'rx-8',
        programId: 'prog-tom',
        kind: 'habit',
        title: 'Stand and walk for 3 min',
        rationale: 'Sitting past 45 minutes is what reproduces your pain — this interrupts it.',
        timeOfDay: 'anytime',
        schedule: { type: 'daily', timesPerDay: 3 },
      },
      {
        id: 'rx-9',
        programId: 'prog-tom',
        kind: 'measurement',
        title: 'Rate your back pain',
        rationale: 'Tracks whether the walking breaks are actually working.',
        timeOfDay: 'evening',
        schedule: { type: 'daily', timesPerDay: 1 },
        metric: { key: 'pain', label: 'Back pain', unit: '/10', min: 0, max: 10 },
      },
      {
        id: 'rx-10',
        programId: 'prog-sara',
        kind: 'exercise',
        title: 'Banded external rotation',
        dose: '3 × 12',
        rationale: 'Loads the cuff tendon in the range it has to tolerate at work.',
        timeOfDay: 'morning',
        schedule: { type: 'weekdays', days: [1, 2, 4, 6] },
      },
      {
        id: 'rx-11',
        programId: 'prog-sara',
        kind: 'measurement',
        title: 'Measure shoulder abduction',
        rationale: 'Degrees, taken against the door frame marks. Our objective progress line.',
        timeOfDay: 'evening',
        schedule: { type: 'interval', everyNDays: 3 },
        metric: { key: 'rom', label: 'Shoulder abduction', unit: '°', min: 60, max: 180 },
      },
    ],
    logs: [],
    readings: [],
    appointments: [
      {
        id: 'apt-1',
        patientId: 'pat-maya',
        clinicianId: 'cli-1',
        startsAt: at(3, 10, 30),
        durationMin: 45,
        location: 'Northside Rehab · Room 2',
        kind: 'in-person',
        note: 'Bring shorts — we are re-measuring extension and hop symmetry.',
        status: 'scheduled',
      },
      {
        id: 'apt-2',
        patientId: 'pat-tom',
        clinicianId: 'cli-1',
        startsAt: at(1, 9, 0),
        durationMin: 30,
        location: 'Video call',
        kind: 'video',
        note: 'Review the sitting-break log together.',
        status: 'scheduled',
      },
      {
        id: 'apt-3',
        patientId: 'pat-sara',
        clinicianId: 'cli-1',
        startsAt: at(6, 14, 0),
        durationMin: 30,
        location: 'Northside Rehab · Room 1',
        kind: 'in-person',
        status: 'scheduled',
      },
      {
        id: 'apt-4',
        patientId: 'pat-maya',
        clinicianId: 'cli-1',
        startsAt: at(24, 10, 30),
        durationMin: 45,
        location: 'Northside Rehab · Room 2',
        kind: 'in-person',
        status: 'scheduled',
      },
    ],
  };

  seedHistory(state);
  return state;
}

/**
 * Fabricates six weeks of plausible history. Each patient gets a different
 * adherence profile so the clinician list has a genuine on-track / slipping /
 * at-risk spread, and pain curves are correlated with adherence — which is the
 * whole thesis the product is trying to make visible.
 */
function seedHistory(state: AppState) {
  const rand = mulberry32(20260808);
  const profiles: Record<string, { base: number; drift: number }> = {
    'pat-maya': { base: 0.93, drift: 0.0 },
    'pat-tom': { base: 0.78, drift: -0.32 },
    'pat-sara': { base: 0.55, drift: -0.15 },
  };

  const logs: LogEntry[] = [];
  const readings: MetricReading[] = [];

  for (const patient of state.patients) {
    const program = state.programs.find((p) => p.patientId === patient.id)!;
    const scripts = state.prescriptions.filter((p) => p.programId === program.id);
    const profile = profiles[patient.id];

    for (let offset = -42; offset <= 0; offset++) {
      const date = addDays(today(), offset);
      // Recency-weighted probability: drift applies most strongly to recent days.
      const recency = (offset + 42) / 42;
      const p = clamp(profile.base + profile.drift * recency * recency, 0.05, 0.99);

      for (const rx of scripts) {
        const n = occurrences(rx, date, program.startsOn);
        for (let i = 0; i < n; i++) {
          // Today is deliberately left partly unlogged so the patient has
          // something real to tick off on first open.
          if (offset === 0 && rand() < 0.65) continue;
          if (rand() > p) continue;

          const isMetric = rx.kind === 'measurement';
          let value: number | undefined;
          if (isMetric && rx.metric) {
            value = metricValue(rx.metric.key, program.primaryMetric.higherIsBetter, recency, p, rand);
            readings.push({
              id: `rd-${patient.id}-${rx.id}-${date}`,
              patientId: patient.id,
              key: rx.metric.key,
              date,
              value,
            });
          }

          logs.push({
            id: `lg-${patient.id}-${rx.id}-${date}-${i}`,
            patientId: patient.id,
            prescriptionId: rx.id,
            date,
            occurrence: i,
            status: 'done',
            value,
            loggedAt: new Date(`${date}T18:00:00`).toISOString(),
          });
        }
      }
    }
  }

  state.logs = logs;
  state.readings = readings;
}

/** Pain falls as adherence holds; range of motion climbs. Noise keeps the
 *  charts from looking synthetic. */
function metricValue(
  key: string,
  higherIsBetter: boolean,
  recency: number,
  adherence: number,
  rand: () => number,
): number {
  const noise = (rand() - 0.5) * 1.2;
  if (key === 'rom') return Math.round(clamp(96 + 46 * recency * adherence + noise * 4, 60, 180));
  const improvement = 5.5 * recency * adherence;
  return Math.round(clamp(7.4 - improvement + noise, 0, 10));
}

function occurrences(
  rx: AppState['prescriptions'][number],
  date: string,
  programStart: string,
): number {
  const d = new Date(`${date}T00:00:00`);
  const weekday = d.getDay() === 0 ? 7 : d.getDay();
  switch (rx.schedule.type) {
    case 'daily':
      return rx.schedule.timesPerDay;
    case 'weekdays':
      return rx.schedule.days.includes(weekday) ? 1 : 0;
    case 'interval': {
      const days = Math.round(
        (d.getTime() - new Date(`${programStart}T00:00:00`).getTime()) / 86_400_000,
      );
      return days % rx.schedule.everyNDays === 0 ? 1 : 0;
    }
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Deterministic PRNG so the demo looks identical on every device. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const _internal = { toISODate };
