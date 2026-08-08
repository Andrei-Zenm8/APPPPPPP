import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { today } from '../domain/date';
import type {
  AppState,
  Appointment,
  ISODate,
  LogEntry,
  Message,
  Prescription,
  ReminderSettings,
  Role,
  SkipReason,
} from '../domain/types';
import { buildSeed } from './seed';

/**
 * Single source of truth for the whole app.
 *
 * Deliberately a plain context + reducer-ish API rather than a state library:
 * every mutation here is a domain event ("the patient completed a task"), and
 * all reads are derived on the fly by `src/domain/selectors`. That keeps the
 * persisted shape small enough to swap for a real backend later — the store's
 * public surface is the API contract.
 */

const STORAGE_KEY = 'apol.state.v2';
/** Set once the user has logged anything of their own; gates the demo refresh. */
const TOUCHED_KEY = 'apol.touched.v1';

interface StoreValue {
  state: AppState;
  ready: boolean;
  setRole: (role: Role) => void;
  selectPatient: (patientId: string) => void;
  /** Toggle a task between done and not-logged. Idempotent per (rx, day, occurrence). */
  toggleTask: (args: {
    patientId: string;
    prescriptionId: string;
    date: ISODate;
    occurrence: number;
    value?: number;
    note?: string;
  }) => void;
  /** Record an explicit "couldn't do this, and here's why". */
  skipTask: (args: {
    patientId: string;
    prescriptionId: string;
    date: ISODate;
    occurrence: number;
    reason: SkipReason;
    note?: string;
  }) => void;
  recordMeasurement: (args: {
    patientId: string;
    prescriptionId: string;
    metricKey: string;
    date: ISODate;
    value: number;
  }) => void;
  addPrescription: (rx: Omit<Prescription, 'id'>) => void;
  /** Stops a prescription from today forward without touching its history. */
  discontinuePrescription: (id: string) => void;
  sendMessage: (args: { patientId: string; from: Role; body: string }) => void;
  markThreadRead: (patientId: string, role: Role) => void;
  setReminders: (r: ReminderSettings) => void;
  addAppointment: (apt: Omit<Appointment, 'id' | 'status'>) => void;
  cancelAppointment: (id: string) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => buildSeed());
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // Hydrate once. A failed read is not fatal — the seed already in state is a
  // perfectly valid starting point, so the app opens either way.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [raw, touched] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(TOUCHED_KEY),
        ]);
        if (!cancelled && raw) {
          const stored = JSON.parse(raw) as AppState;
          // The seed is anchored to the day it was built. Restoring it a week
          // later would show adherence collapsing to zero with no explanation,
          // so untouched demo data is rebuilt against today instead. Anything
          // the user has actually logged is never discarded this way.
          const stale = stored.logs.every((l) => l.date < today());
          setState(touched !== '1' && stale ? buildSeed() : stored);
        }
      } catch {
        // fall through to seed
      } finally {
        if (!cancelled) {
          hydrated.current = true;
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist after hydration only, so an early write can never clobber the
  // stored state with the seed.
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  /** Any mutation counts as the user making the data theirs. */
  const markTouched = useCallback(() => {
    AsyncStorage.setItem(TOUCHED_KEY, '1').catch(() => {});
  }, []);

  const toggleTask = useCallback<StoreValue['toggleTask']>((args) => {
    markTouched();
    setState((prev) => {
      const existing = prev.logs.find(
        (l) =>
          l.patientId === args.patientId &&
          l.prescriptionId === args.prescriptionId &&
          l.date === args.date &&
          l.occurrence === args.occurrence,
      );

      if (existing) {
        const logs = prev.logs.filter((l) => l.id !== existing.id);
        // Un-ticking a measurement must also retract the reading it produced,
        // or the progress chart keeps a data point the patient took back.
        // Un-ticking a measurement retracts the reading it produced, matched on
        // the prescription's own metric key — matching on value alone would
        // delete the wrong metric when two share a value on the same day.
        const metricKey = prev.prescriptions.find((r) => r.id === args.prescriptionId)?.metric?.key;
        const readings =
          existing.value === undefined || !metricKey
            ? prev.readings
            : prev.readings.filter(
                (r) => !(r.patientId === args.patientId && r.key === metricKey && r.date === args.date),
              );
        return { ...prev, logs, readings };
      }

      const entry: LogEntry = {
        id: uid('lg'),
        patientId: args.patientId,
        prescriptionId: args.prescriptionId,
        date: args.date,
        occurrence: args.occurrence,
        status: 'done',
        value: args.value,
        note: args.note,
        loggedAt: new Date().toISOString(),
      };
      return { ...prev, logs: [...prev.logs, entry] };
    });
  }, [markTouched]);

  const recordMeasurement = useCallback<StoreValue['recordMeasurement']>((args) => {
    markTouched();
    setState((prev) => {
      const logs = prev.logs.filter(
        (l) => !(l.patientId === args.patientId && l.prescriptionId === args.prescriptionId && l.date === args.date),
      );
      const readings = prev.readings.filter(
        (r) => !(r.patientId === args.patientId && r.key === args.metricKey && r.date === args.date),
      );
      return {
        ...prev,
        logs: [
          ...logs,
          {
            id: uid('lg'),
            patientId: args.patientId,
            prescriptionId: args.prescriptionId,
            date: args.date,
            occurrence: 0,
            status: 'done',
            value: args.value,
            loggedAt: new Date().toISOString(),
          },
        ],
        readings: [
          ...readings,
          { id: uid('rd'), patientId: args.patientId, key: args.metricKey, date: args.date, value: args.value },
        ],
      };
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      ready,
      setRole: (role) => setState((p) => ({ ...p, role })),
      selectPatient: (currentPatientId) => setState((p) => ({ ...p, currentPatientId })),
      toggleTask,
      recordMeasurement,
      skipTask: (args) => {
        markTouched();
        setState((p) => ({
          ...p,
          logs: [
            ...p.logs.filter(
              (l) =>
                !(
                  l.patientId === args.patientId &&
                  l.prescriptionId === args.prescriptionId &&
                  l.date === args.date &&
                  l.occurrence === args.occurrence
                ),
            ),
            {
              id: uid('lg'),
              patientId: args.patientId,
              prescriptionId: args.prescriptionId,
              date: args.date,
              occurrence: args.occurrence,
              status: 'skipped',
              skipReason: args.reason,
              note: args.note,
              loggedAt: new Date().toISOString(),
            },
          ],
        }));
      },
      addPrescription: (rx) => {
        markTouched();
        setState((p) => ({ ...p, prescriptions: [...p.prescriptions, { ...rx, id: uid('rx') }] }));
      },
      discontinuePrescription: (id) => {
        markTouched();
        // Ends the prescription from today rather than deleting it. Deleting
        // would erase every log attached to it and silently rewrite the
        // patient's past adherence — a clinical record must not do that.
        setState((p) => ({
          ...p,
          prescriptions: p.prescriptions.map((r) => (r.id === id ? { ...r, endedOn: today() } : r)),
        }));
      },
      sendMessage: ({ patientId, from, body }) => {
        markTouched();
        const msg: Message = {
          id: uid('msg'),
          patientId,
          from,
          body,
          sentAt: new Date().toISOString(),
          readByClinician: from === 'clinician',
          readByPatient: from === 'patient',
        };
        setState((p) => ({ ...p, messages: [...p.messages, msg] }));
      },
      markThreadRead: (patientId, role) =>
        setState((p) => ({
          ...p,
          messages: p.messages.map((m) =>
            m.patientId === patientId
              ? role === 'clinician'
                ? { ...m, readByClinician: true }
                : { ...m, readByPatient: true }
              : m,
          ),
        })),
      setReminders: (reminders) => {
        markTouched();
        setState((p) => ({ ...p, reminders }));
      },
      addAppointment: (apt) => {
        markTouched();
        setState((p) => ({
          ...p,
          appointments: [...p.appointments, { ...apt, id: uid('apt'), status: 'scheduled' }],
        }));
      },
      cancelAppointment: (id) => {
        markTouched();
        setState((p) => ({
          ...p,
          appointments: p.appointments.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)),
        }));
      },
      reset: () => {
        AsyncStorage.removeItem(TOUCHED_KEY).catch(() => {});
        setState(buildSeed());
      },
    }),
    [state, ready, toggleTask, recordMeasurement, markTouched],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Convenience: the patient whose chart is currently open. */
export function useCurrentPatient() {
  const { state } = useStore();
  return state.patients.find((p) => p.id === state.currentPatientId) ?? state.patients[0];
}

export { today };
