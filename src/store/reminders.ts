import { Platform } from 'react-native';
import type { Appointment, Prescription, ReminderSettings } from '../domain/types';

/**
 * Scheduled reminders.
 *
 * An adherence tracker with no cue is a contradiction: it asks the patient to
 * remember to open the app that exists because they forget things. Reminders
 * are the mechanism that makes the rest of the product work, so they are on by
 * default and scoped to the buckets the patient actually has items in — a nudge
 * for an empty evening trains people to ignore the next one.
 *
 * `expo-notifications` is imported lazily and every call is wrapped: on web
 * (and in Expo Go on Android, where scheduling is unsupported) the module is
 * absent or throws, and a missing reminder must never take the app down with
 * it.
 */

const BUCKET_COPY: Record<string, { title: string; body: string }> = {
  morning: { title: 'Morning items', body: 'Your first items for today are ready to log.' },
  midday: { title: 'Midday check', body: 'A couple of things are due around now.' },
  evening: { title: 'Evening check-in', body: 'Log today before you turn in — it takes a few seconds.' },
};

type NotificationsModule = typeof import('expo-notifications');

async function load(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export async function requestPermission(): Promise<boolean> {
  const N = await load();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await N.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/**
 * Rebuilds the whole schedule from scratch.
 *
 * Cancelling everything and re-adding is deliberate: incremental updates would
 * need identity tracking per notification, and the failure mode there is a
 * patient receiving reminders for a prescription that was discontinued weeks
 * ago — worse than a brief gap.
 */
export async function syncReminders(args: {
  settings: ReminderSettings;
  prescriptions: Prescription[];
  appointments: Appointment[];
}): Promise<void> {
  const N = await load();
  if (!N) return;

  try {
    await N.cancelAllScheduledNotificationsAsync();
    if (!args.settings.enabled) return;
    if (!(await requestPermission())) return;

    const buckets = new Set(args.prescriptions.filter((p) => !p.endedOn).map((p) => p.timeOfDay));

    for (const bucket of ['morning', 'midday', 'evening'] as const) {
      if (!buckets.has(bucket)) continue;
      const copy = BUCKET_COPY[bucket];
      await N.scheduleNotificationAsync({
        content: { title: copy.title, body: copy.body },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DAILY,
          hour: args.settings[bucket],
          minute: 0,
        },
      });
    }

    for (const apt of args.appointments) {
      if (apt.status !== 'scheduled') continue;
      const when = new Date(apt.startsAt).getTime() - args.settings.appointmentLeadHours * 3_600_000;
      if (when <= Date.now()) continue;
      await N.scheduleNotificationAsync({
        content: {
          title: 'Appointment tomorrow',
          body: `${apt.location} · ${new Date(apt.startsAt).toLocaleString()}`,
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(when) },
      });
    }
  } catch {
    // A device that refuses to schedule is not a reason to break the app.
  }
}

/** True where reminders can actually fire, so the UI can say so honestly
 *  rather than offering a switch that does nothing. */
export const remindersSupported = Platform.OS !== 'web';
