import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatDay, relativeDay } from '../../src/domain/date';
import { programFor } from '../../src/domain/selectors';
import type { Prescription, Schedule } from '../../src/domain/types';
import { useCurrentPatient, useStore } from '../../src/store';
import { space, useTheme } from '../../src/theme';
import { Card, Divider, EmptyState, Pill, Row, Screen, SectionHeader, Segmented, Spacer, Stack, T } from '../../src/ui';

const KINDS = [
  { value: 'all', label: 'All' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'medication', label: 'Meds' },
  { value: 'habit', label: 'Habits' },
] as const;

/** The patient's full plan, in the clinician's own words. Read-only by
 *  design: nobody edits their own prescription. */
export default function ProgramScreen() {
  const { state } = useStore();
  const patient = useCurrentPatient();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<(typeof KINDS)[number]['value']>('all');

  const program = programFor(state, patient.id);
  const clinician = state.clinicians.find((c) => c.id === patient.clinicianId);

  const scripts = useMemo(() => {
    if (!program) return [];
    return state.prescriptions
      .filter((p) => p.programId === program.id)
      .filter((p) =>
        filter === 'all'
          ? true
          : filter === 'medication'
            ? p.kind === 'medication' || p.kind === 'supplement'
            : p.kind === filter,
      );
  }, [state.prescriptions, program, filter]);

  if (!program) {
    return (
      <Screen>
        <Spacer h={space.xl} />
        <EmptyState title="No program yet" body="Your specialist has not published a plan for you yet." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Spacer h={space.lg} />
      <T variant="hero">{program.title}</T>
      <Spacer h={space.sm} />
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        <Pill label={`Started ${formatDay(program.startsOn)}`} />
        {program.endsOn && <Pill label={`Review ${relativeDay(program.endsOn)}`} tone="accent" />}
      </Row>

      {clinician && (
        <>
          <SectionHeader title="Prescribed by" />
          <Card>
            <T variant="heading">{clinician.name}</T>
            <T variant="body" tone="muted">
              {clinician.discipline} · {clinician.clinic}
            </T>
          </Card>
        </>
      )}

      <SectionHeader title="Your plan" />
      <Segmented options={KINDS as any} value={filter} onChange={setFilter} />
      <Spacer h={space.md} />

      {scripts.length === 0 ? (
        <EmptyState title="Nothing here" body="No items of this type are part of your program." />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: space.lg }}>
          {scripts.map((rx, i) => (
            <View key={rx.id}>
              <Stack gap={space.xs} style={{ paddingVertical: space.lg }}>
                <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
                  <T variant="heading">{rx.title}</T>
                  {!!rx.dose && <Pill label={rx.dose} tone="accent" />}
                </Row>
                <T variant="caption" tone="faint">
                  {describeSchedule(rx.schedule)} · {rx.timeOfDay}
                </T>
                <Spacer h={space.xs} />
                <T variant="body" tone="muted">
                  {rx.rationale}
                </T>
              </Stack>
              {i < scripts.length - 1 && <Divider />}
            </View>
          ))}
        </Card>
      )}

      <SectionHeader title="What we are steering" />
      <Card>
        <T variant="heading">{program.primaryMetric.label}</T>
        <Spacer h={space.xs} />
        <T variant="body" tone="muted">
          {program.primaryMetric.target !== undefined
            ? `Target: ${program.primaryMetric.higherIsBetter ? 'at least' : 'at or below'} ${
                program.primaryMetric.target
              }${program.primaryMetric.unit}. Every daily check-in moves this line.`
            : 'Tracked from your daily check-ins.'}
        </T>
      </Card>
    </Screen>
  );
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function describeSchedule(s: Schedule): string {
  switch (s.type) {
    case 'daily':
      return s.timesPerDay === 1 ? 'Every day' : `${s.timesPerDay}× every day`;
    case 'weekdays':
      return s.days.length === 7 ? 'Every day' : s.days.map((d) => WEEKDAYS[d - 1]).join(', ');
    case 'interval':
      return s.everyNDays === 1 ? 'Every day' : `Every ${s.everyNDays} days`;
  }
}
