import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useStore } from '../src/store';
import { space, useTheme } from '../src/theme';
import { Avatar, Button, Card, Divider, Row, Screen, SectionHeader, Segmented, Spacer, Stack, T } from '../src/ui';
import { remindersSupported } from '../src/store/reminders';
import { Icon } from '../src/ui/icons';

/** Sensible hour choices per bucket — a full 24-hour picker is more control
 *  than anyone wants for a reminder. */
const HOURS = { morning: [7, 8, 9, 10], midday: [12, 13, 14], evening: [18, 19, 20, 21] } as const;

/**
 * In production the role comes from the account, not a switch. It is exposed
 * here because Apol's value proposition is the *pair* of experiences, and no
 * one evaluating it should need two devices to see both sides.
 */
export default function SettingsScreen() {
  const { state, setRole, selectPatient, reset, setReminders } = useStore();
  const router = useRouter();
  const { colors } = useTheme();

  const go = (role: 'patient' | 'clinician') => {
    setRole(role);
    router.replace(role === 'clinician' ? '/patients' : '/today');
  };

  return (
    <Screen>
      <Spacer h={space.md} />
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
        <Row gap={space.xs}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={16} color={colors.accent} />
          </View>
          <T variant="label" tone="accent">
            Back
          </T>
        </Row>
      </Pressable>

      <Spacer h={space.lg} />
      <T variant="hero">Settings</T>

      <SectionHeader title="View the app as" />
      <Card>
        <Stack gap={space.md}>
          <Row gap={space.md}>
            <View style={{ flex: 1 }}>
              <Button label="Patient" full kind={state.role === 'patient' ? 'primary' : 'secondary'} onPress={() => go('patient')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Clinician" full kind={state.role === 'clinician' ? 'primary' : 'secondary'} onPress={() => go('clinician')} />
            </View>
          </Row>
          <T variant="caption" tone="faint">
            Both roles read the same data. Anything a patient logs shows up on the clinician's chart immediately.
          </T>
        </Stack>
      </Card>

      <SectionHeader title="Signed in as patient" />
      <Card padded={false} style={{ paddingHorizontal: space.lg }}>
        {state.patients.map((p, i) => (
          <View key={p.id}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: p.id === state.currentPatientId }}
              onPress={() => selectPatient(p.id)}
              style={{ paddingVertical: space.md }}
            >
              <Row gap={space.md}>
                <Avatar name={p.name} tint={p.avatarTint} size={36} />
                <Stack gap={2} style={{ flex: 1 }}>
                  <T variant="heading">{p.name}</T>
                  <T variant="caption" tone="faint" numberOfLines={1}>
                    {p.condition}
                  </T>
                </Stack>
                {p.id === state.currentPatientId && <Icon name="check" size={18} color={colors.accent} />}
              </Row>
            </Pressable>
            {i < state.patients.length - 1 && <Divider />}
          </View>
        ))}
      </Card>

      <SectionHeader title="Reminders" />
      <Card>
        <Stack gap={space.lg}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Stack gap={2} style={{ flex: 1 }}>
              <T variant="heading">Daily nudges</T>
              <T variant="caption" tone="faint">
                {remindersSupported
                  ? 'One reminder per part of the day you actually have items in.'
                  : 'Notifications are not available in the browser — install the app to receive them.'}
              </T>
            </Stack>
            <Button
              label={state.reminders.enabled ? 'On' : 'Off'}
              kind={state.reminders.enabled ? 'primary' : 'secondary'}
              disabled={!remindersSupported}
              onPress={() => setReminders({ ...state.reminders, enabled: !state.reminders.enabled })}
            />
          </Row>

          {state.reminders.enabled && remindersSupported && (
            <>
              {(['morning', 'midday', 'evening'] as const).map((bucket) => (
                <Stack key={bucket} gap={space.sm}>
                  <T variant="caption" tone="faint">
                    {bucket.toUpperCase()}
                  </T>
                  <Segmented
                    options={HOURS[bucket].map((h) => ({ value: String(h), label: `${h}:00`.padStart(5, '0') }))}
                    value={String(state.reminders[bucket])}
                    onChange={(v) => setReminders({ ...state.reminders, [bucket]: Number(v) })}
                  />
                </Stack>
              ))}
              <Stack gap={space.sm}>
                <T variant="caption" tone="faint">
                  BEFORE AN APPOINTMENT
                </T>
                <Segmented
                  options={[
                    { value: '2', label: '2 hours' },
                    { value: '24', label: '1 day' },
                    { value: '48', label: '2 days' },
                  ]}
                  value={String(state.reminders.appointmentLeadHours)}
                  onChange={(v) => setReminders({ ...state.reminders, appointmentLeadHours: Number(v) })}
                />
              </Stack>
            </>
          )}
        </Stack>
      </Card>

      <SectionHeader title="Demo data" />
      <Card>
        <Stack gap={space.md}>
          <T variant="body" tone="muted">
            Apol stores everything on this device. Resetting rebuilds six weeks of sample history and discards anything you have logged.
          </T>
          <View style={{ alignSelf: 'flex-start' }}>
            <Button label="Reset demo data" kind="danger" onPress={reset} />
          </View>
        </Stack>
      </Card>

      <SectionHeader title="About" />
      <Card>
        <T variant="body" tone="muted">
          Apol {`1.0.0 · ${Platform.OS}`}
        </T>
      </Card>
    </Screen>
  );
}
