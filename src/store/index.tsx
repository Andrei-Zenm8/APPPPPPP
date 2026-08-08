import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { today } from '../domain/date';
import type { AppState, Appointment, ISODate, LogEntry, Prescription, Role } from '../domain/types';
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

const STORAGE_KEY = 'apol.state.v1';

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
  recordMeasurement: (args: {
    patientId: string;
    prescriptionId: string;
    metricKey: string;
    date: ISODate;
    value: number;
  }) => void;
  addPrescription: (rx: Omit<Prescription, 'id'>) => void;
  removePrescription: (id: string) => void;
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
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setState(JSON.parse(raw) as AppState);
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

  const toggleTask = useCallback<StoreValue['toggleTask']>((args) => {
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
        const readings = existing.value === undefined
          ? prev.readings
          : prev.readings.filter((r) => !(r.patientId === args.patientId && r.date === args.date && r.value === existing.value));
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
  }, []);

  const recordMeasurement = useCallback<StoreValue['recordMeasurement']>((args) => {
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
      addPrescription: (rx) =>
        setState((p) => ({ ...p, prescriptions: [...p.prescriptions, { ...rx, id: uid('rx') }] })),
      removePrescription: (id) =>
        setState((p) => ({
          ...p,
          prescriptions: p.prescriptions.filter((r) => r.id !== id),
          logs: p.logs.filter((l) => l.prescriptionId !== id),
        })),
      addAppointment: (apt) =>
        setState((p) => ({
          ...p,
          appointments: [...p.appointments, { ...apt, id: uid('apt'), status: 'scheduled' }],
        })),
      cancelAppointment: (id) =>
        setState((p) => ({
          ...p,
          appointments: p.appointments.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)),
        })),
      reset: () => setState(buildSeed()),
    }),
    [state, ready, toggleTask, recordMeasurement],
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
