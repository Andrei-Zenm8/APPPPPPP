import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useStore } from '../src/store';
import { space, useTheme } from '../src/theme';
import { Avatar, Button, Card, Divider, Row, Screen, SectionHeader, Spacer, Stack, T } from '../src/ui';
import { Icon } from '../src/ui/icons';

/**
 * In production the role comes from the account, not a switch. It is exposed
 * here because Apol's value proposition is the *pair* of experiences, and no
 * one evaluating it should need two devices to see both sides.
 */
export default function SettingsScreen() {
  const { state, setRole, selectPatient, reset } = useStore();
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
