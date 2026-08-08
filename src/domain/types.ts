/**
 * Apol domain model.
 *
 * The central idea: a clinician authors a *Program* made of *Prescriptions*.
 * A prescription is anything the patient must repeatedly do — take a
 * supplement, do an exercise set, avoid a food, answer a check-in question.
 * Every prescription generates dated *Tasks*; the patient completes them,
 * producing *LogEntry* records. Adherence, streaks and outcome trends are all
 * derived from those two tables, never stored — so history can never drift out
 * of sync with what the patient actually did.
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string;

export type Role = 'patient' | 'clinician';

export type Discipline =
  | 'Physiotherapy'
  | 'Nutrition'
  | 'Psychiatry'
  | 'Endocrinology'
  | 'Dermatology'
  | 'General';

export interface Clinician {
  id: string;
  name: string;
  discipline: Discipline;
  clinic: string;
}

export interface Patient {
  id: string;
  clinicianId: string;
  name: string;
  /** Free-text reason for care, shown at the top of the clinician's chart. */
  condition: string;
  startedOn: ISODate;
  avatarTint: string;
}

export type PrescriptionKind = 'medication' | 'supplement' | 'exercise' | 'habit' | 'measurement';

/** Which days a prescription is due. */
export type Schedule =
  | { type: 'daily'; timesPerDay: number }
  /** ISO weekday numbers, 1 = Monday … 7 = Sunday. */
  | { type: 'weekdays'; days: number[] }
  /** Every N days counted from the program start date. */
  | { type: 'interval'; everyNDays: number };

export interface Prescription {
  id: string;
  programId: string;
  kind: PrescriptionKind;
  title: string;
  /** e.g. '500 mg', '3 × 12 reps', '20 min'. Rendered next to the title. */
  dose?: string;
  /** The clinician's reason. Shown to the patient — adherence rises when
   *  people understand *why*, so this is a required field in the UI. */
  rationale: string;
  timeOfDay: 'morning' | 'midday' | 'evening' | 'anytime';
  schedule: Schedule;
  /** For 'measurement' prescriptions: what the patient records. */
  metric?: { key: string; label: string; unit: string; min: number; max: number };
  /** Date the clinician stopped prescribing this. Discontinuing sets a date
   *  rather than deleting the row, so past adherence stays truthful — deleting
   *  a prescription would silently rewrite every week the patient did do it. */
  endedOn?: ISODate;
}

export interface Program {
  id: string;
  patientId: string;
  clinicianId: string;
  title: string;
  startsOn: ISODate;
  endsOn: ISODate | null;
  /** Outcome the whole program is steering — charted on both sides of the app. */
  primaryMetric: { key: string; label: string; unit: string; target?: number; higherIsBetter: boolean };
}

/** Fixed set, because free text alone is unanalysable across a caseload —
 *  the note field carries the specifics. */
export type SkipReason = 'pain' | 'no-time' | 'no-equipment' | 'forgot' | 'unwell' | 'other';

export const SKIP_REASONS: { value: SkipReason; label: string }[] = [
  { value: 'pain', label: 'Too painful' },
  { value: 'no-time', label: 'No time' },
  { value: 'no-equipment', label: "Didn't have what I need" },
  { value: 'unwell', label: 'Felt unwell' },
  { value: 'forgot', label: 'Forgot' },
  { value: 'other', label: 'Something else' },
];

export interface LogEntry {
  id: string;
  patientId: string;
  prescriptionId: string;
  date: ISODate;
  /** Index within the day for multi-dose prescriptions (0-based). */
  occurrence: number;
  status: 'done' | 'skipped';
  /** Why a skipped task was skipped. The most clinically useful field in the
   *  whole schema: "missed" is noise, "couldn't — too painful" is a finding. */
  skipReason?: SkipReason;
  /** Recorded value for measurement prescriptions. */
  value?: number;
  note?: string;
  loggedAt: ISODateTime;
}

/** Patient-reported outcome for the program's primary metric. */
export interface MetricReading {
  id: string;
  patientId: string;
  key: string;
  date: ISODate;
  value: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  clinicianId: string;
  startsAt: ISODateTime;
  durationMin: number;
  location: string;
  kind: 'in-person' | 'video' | 'phone';
  note?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

/** A derived, undated instance of a prescription on a given day. */
export interface TaskInstance {
  key: string;
  prescription: Prescription;
  date: ISODate;
  occurrence: number;
  entry?: LogEntry;
}

/** A message between a patient and their clinician. Deliberately scoped to a
 *  single thread per patient: a specialist with forty patients needs one
 *  inbox, not forty conversations to name and find. */
export interface Message {
  id: string;
  patientId: string;
  from: Role;
  body: string;
  sentAt: ISODateTime;
  readByClinician: boolean;
  readByPatient: boolean;
}

export interface ReminderSettings {
  enabled: boolean;
  /** Local 24h hour for each bucket's nudge. */
  morning: number;
  midday: number;
  evening: number;
  /** Hours before an appointment to remind. */
  appointmentLeadHours: number;
}

export interface AppState {
  role: Role;
  clinicians: Clinician[];
  patients: Patient[];
  programs: Program[];
  prescriptions: Prescription[];
  logs: LogEntry[];
  readings: MetricReading[];
  appointments: Appointment[];
  messages: Message[];
  reminders: ReminderSettings;
  /** Who is signed in on the patient side / selected on the clinician side. */
  currentPatientId: string;
  currentClinicianId: string;
}
