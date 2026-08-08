import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { relativeDay } from '../../src/domain/date';
import {
  adherenceRate,
  adherenceSeries,
  nextAppointment,
  patientsOf,
  programFor,
  riskLevel,
  RiskLevel,
} from '../../src/domain/selectors';
import { useStore } from '../../src/store';
import { space, useTheme } from '../../src/theme';
import { Avatar, Card, EmptyState, Pill, Row, Screen, SectionHeader, Spacer, Stack, T } from '../../src/ui';
import { Sparkline } from '../../src/ui/charts';
import { Icon } from '../../src/ui/icons';

const RISK_META: Record<RiskLevel, { label: string; tone: 'good' | 'warn' | 'bad'; rank: number }> = {
  'at-risk': { label: 'At risk', tone: 'bad', rank: 0 },
  slipping: { label: 'Slipping', tone: 'warn', rank: 1 },
  'on-track': { label: 'On track', tone: 'good', rank: 2 },
};

/**
 * The clinician's home screen, and the screen the whole product is really for.
 *
 * It answers one question in under three seconds: *who needs me today?* So the
 * list is sorted by risk, not alphabetically — a caseload of forty patients
 * sorted by name is a list you stop reading.
 */
export default function PatientsScreen() {
  const { state, selectPatient } = useStore();
  const router = useRouter();
  const { colors } = useTheme();

  const rows = useMemo(() => {
    return patientsOf(state, state.currentClinicianId)
      .map((patient) => {
        const risk = riskLevel(state, patient.id);
        const week = adherenceSeries(state, patient.id, 7);
        const month = adherenceSeries(state, patient.id, 30);
        return {
          patient,
          risk,
          weekRate: adherenceRate(week),
          month,
          program: programFor(state, patient.id),
          next: nextAppointment(state, patient.id),
        };
      })
      .sort(
        (a, b) =>
          RISK_META[a.risk].rank - RISK_META[b.risk].rank ||
          (a.weekRate ?? 1) - (b.weekRate ?? 1) ||
          a.patient.name.localeCompare(b.patient.name),
      );
  }, [state]);

  const needsAttention = rows.filter((r) => r.risk !== 'on-track').length;
  const clinician = state.clinicians.find((c) => c.id === state.currentClinicianId);

  return (
    <Screen wide>
      <Spacer h={space.lg} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Stack gap={2}>
          <T variant="caption" tone="faint">
            {clinician?.clinic.toUpperCase()}
          </T>
          <T variant="hero">Caseload</T>
        </Stack>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={10}>
          <Icon name="settings" color={colors.inkFaint} />
        </Pressable>
      </Row>

      <Spacer h={space.lg} />
      <Card>
        <T variant="heading">
          {needsAttention === 0
            ? 'Everyone is on track this week'
            : `${needsAttention} of ${rows.length} ${needsAttention === 1 ? 'patient needs' : 'patients need'} attention`}
        </T>
        <Spacer h={space.xs} />
        <T variant="body" tone="muted">
          Ranked by 7-day adherence — the window where a call still changes the outcome.
        </T>
      </Card>

      <SectionHeader title="Patients" />
      {rows.length === 0 ? (
        <EmptyState title="No patients yet" body="Patients you onboard will appear here." />
      ) : (
        <Stack gap={space.md}>
          {rows.map(({ patient, risk, weekRate, month, program, next }) => (
            <Card
              key={patient.id}
              onPress={() => {
                selectPatient(patient.id);
                router.push(`/patient/${patient.id}`);
              }}
            >
              <Row gap={space.md} align="flex-start">
                <Avatar name={patient.name} tint={patient.avatarTint} size={44} />

                <Stack gap={4} style={{ flex: 1 }}>
                  <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
                    <T variant="heading">{patient.name}</T>
                    <Pill label={RISK_META[risk].label} tone={RISK_META[risk].tone} />
                  </Row>
                  <T variant="body" tone="muted" numberOfLines={1}>
                    {patient.condition}
                  </T>
                  <Row gap={space.md} style={{ marginTop: space.xs, flexWrap: 'wrap' }}>
                    <T variant="caption" tone="faint">
                      {weekRate === null ? 'No data' : `${Math.round(weekRate * 100)}% this week`}
                    </T>
                    {next && (
                      <T variant="caption" tone="faint">
                        Next visit {relativeDay(next.startsAt.slice(0, 10))}
                      </T>
                    )}
                  </Row>
                </Stack>

                <Stack gap={space.xs} style={{ alignItems: 'flex-end' }}>
                  <Sparkline series={month} tone={RISK_META[risk].tone} />
                  <Icon name="chevron" size={16} color={colors.inkFaint} />
                </Stack>
              </Row>
            </Card>
          ))}
        </Stack>
      )}
      <View style={{ height: space.xl }} />
    </Screen>
  );
}
