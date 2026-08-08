import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatDay, lastNDays, today } from '../../../src/domain/date';
import {
  adherenceRate,
  adherenceSeries,
  currentStreak,
  metricTrend,
  nextAppointment,
  programFor,
  readingsFor,
  riskLevel,
  tasksForDay,
} from '../../../src/domain/selectors';
import { useStore } from '../../../src/store';
import { radius, space, useTheme } from '../../../src/theme';
import {
  Avatar,
  Button,
  Card,
  Divider,
  EmptyState,
  Pill,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  Spacer,
  Stack,
  T,
} from '../../../src/ui';
import { AdherenceBars, MetricChart } from '../../../src/ui/charts';
import { Icon } from '../../../src/ui/icons';
import { describeSchedule } from '../../(patient)/program';
import { AppointmentCard } from '../../(patient)/visits';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'plan', label: 'Plan' },
  { value: 'log', label: 'Log' },
] as const;

/** The chart view: everything a specialist needs before a 30-minute visit,
 *  arranged so it can be skimmed in the corridor on a phone. */
export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, removePrescription } = useStore();
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<'overview' | 'plan' | 'log'>('overview');

  const patient = state.patients.find((p) => p.id === id);
  const program = patient ? programFor(state, patient.id) : undefined;

  const data = useMemo(() => {
    if (!patient) return null;
    const month = adherenceSeries(state, patient.id, 30);
    return {
      month,
      week: adherenceSeries(state, patient.id, 7),
      rate30: adherenceRate(month),
      rate7: adherenceRate(adherenceSeries(state, patient.id, 7)),
      streak: currentStreak(state, patient.id),
      risk: riskLevel(state, patient.id),
      readings: program ? readingsFor(state, patient.id, program.primaryMetric.key) : [],
      next: nextAppointment(state, patient.id),
    };
  }, [state, patient, program]);

  if (!patient || !data) {
    return (
      <Screen wide>
        <Spacer h={space.xl} />
        <EmptyState title="Patient not found" body="This chart may have been removed." />
      </Screen>
    );
  }

  const trend = metricTrend(data.readings);
  const improving = trend && program ? (program.primaryMetric.higherIsBetter ? trend.delta > 0 : trend.delta < 0) : null;
  const scripts = program ? state.prescriptions.filter((p) => p.programId === program.id) : [];

  return (
    <Screen>
      <Spacer h={space.md} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to caseload"
        onPress={() => router.back()}
        hitSlop={10}
        style={{ alignSelf: 'flex-start' }}
      >
        <Row gap={space.xs}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={16} color={colors.accent} />
          </View>
          <T variant="label" tone="accent">
            Caseload
          </T>
        </Row>
      </Pressable>

      <Spacer h={space.lg} />
      <Row gap={space.md} align="flex-start">
        <Avatar name={patient.name} tint={patient.avatarTint} size={52} />
        <Stack gap={4} style={{ flex: 1 }}>
          <T variant="title">{patient.name}</T>
          <T variant="body" tone="muted">
            {patient.condition}
          </T>
          <Row gap={space.sm} style={{ marginTop: space.xs, flexWrap: 'wrap' }}>
            <Pill
              label={data.risk === 'on-track' ? 'On track' : data.risk === 'slipping' ? 'Slipping' : 'At risk'}
              tone={data.risk === 'on-track' ? 'good' : data.risk === 'slipping' ? 'warn' : 'bad'}
            />
            <Pill label={`Since ${formatDay(patient.startedOn)}`} />
          </Row>
        </Stack>
      </Row>

      <Spacer h={space.lg} />
      <Segmented options={TABS as any} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          <SectionHeader title="Adherence" />
          <Row gap={space.md}>
            <Metric label="Last 7 days" value={pct(data.rate7)} tone={toneFor(data.rate7)} />
            <Metric label="Last 30 days" value={pct(data.rate30)} tone={toneFor(data.rate30)} />
            <Metric label="Streak" value={`${data.streak}d`} tone="default" />
          </Row>
          <Spacer h={space.md} />
          <Card>
            <AdherenceBars series={data.month} height={140} />
          </Card>

          {program && (
            <>
              <SectionHeader title={program.primaryMetric.label} />
              <Card>
                {data.readings.length < 2 ? (
                  <T variant="body" tone="muted">
                    Not enough check-ins recorded yet.
                  </T>
                ) : (
                  <Stack gap={space.md}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Stack gap={2}>
                        <T variant="title">
                          {data.readings[data.readings.length - 1].value}
                          {program.primaryMetric.unit}
                        </T>
                        <T variant="caption" tone="faint">
                          latest reading
                        </T>
                      </Stack>
                      {trend && (
                        <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                          <T variant="heading" tone={improving ? 'good' : 'warn'}>
                            {trend.delta > 0 ? '+' : ''}
                            {trend.delta.toFixed(1)}
                            {program.primaryMetric.unit}
                          </T>
                          <T variant="caption" tone="faint">
                            since program start
                          </T>
                        </Stack>
                      )}
                    </Row>
                    <MetricChart
                      readings={data.readings}
                      unit={program.primaryMetric.unit}
                      target={program.primaryMetric.target}
                      higherIsBetter={program.primaryMetric.higherIsBetter}
                    />
                  </Stack>
                )}
              </Card>
            </>
          )}

          <SectionHeader title="Clinical read" />
          <Card>
            <T variant="body" tone="muted">
              {clinicalRead(data.rate7, data.rate30, improving)}
            </T>
          </Card>

          <SectionHeader title="Next visit" />
          {data.next ? (
            <AppointmentCard appointment={data.next} highlight />
          ) : (
            <EmptyState title="Nothing booked" body="Add an appointment from the Schedule tab." />
          )}
        </>
      )}

      {tab === 'plan' && (
        <>
          <SectionHeader title={program?.title ?? 'Program'} />
          {scripts.length === 0 ? (
            <EmptyState title="No prescriptions" body="This program has no items yet." />
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
                    <T variant="body" tone="muted" style={{ marginTop: space.xs }}>
                      {rx.rationale}
                    </T>
                    <View style={{ marginTop: space.sm, alignSelf: 'flex-start' }}>
                      <Button label="Remove" kind="danger" onPress={() => removePrescription(rx.id)} />
                    </View>
                  </Stack>
                  {i < scripts.length - 1 && <Divider />}
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {tab === 'log' && <DayLog patientId={patient.id} />}

      <View style={{ height: space.xl }} />
    </Screen>
  );
}

/** Day-by-day evidence. When a patient says "I have been doing everything",
 *  this is the screen that opens the real conversation — kindly. */
function DayLog({ patientId }: { patientId: string }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const days = useMemo(() => lastNDays(14).reverse(), []);

  return (
    <>
      <SectionHeader title="Last 14 days" />
      <Stack gap={space.md}>
        {days.map((date) => {
          const tasks = tasksForDay(state, patientId, date);
          if (!tasks.length) return null;
          const done = tasks.filter((t) => t.entry?.status === 'done').length;
          return (
            <Card key={date}>
              <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
                <T variant="heading">
                  {formatDay(date)}
                  {date === today() ? ' · today' : ''}
                </T>
                <Pill
                  label={`${done}/${tasks.length}`}
                  tone={done === tasks.length ? 'good' : done > 0 ? 'warn' : 'bad'}
                />
              </Row>
              <Stack gap={space.xs}>
                {tasks.map((t) => {
                  const ok = t.entry?.status === 'done';
                  return (
                    <Row key={t.key} gap={space.sm}>
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: ok ? colors.good : colors.badSoft,
                        }}
                      />
                      <T variant="body" tone={ok ? 'muted' : 'faint'} style={{ flex: 1 }}>
                        {t.prescription.title}
                      </T>
                      {t.entry?.value !== undefined && (
                        <T variant="caption" tone="accent">
                          {t.entry.value}
                          {t.prescription.metric?.unit}
                        </T>
                      )}
                      {!ok && <T variant="caption" tone="faint">missed</T>}
                    </Row>
                  );
                })}
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: any }) {
  return (
    <Card style={{ flex: 1, paddingVertical: space.lg, paddingHorizontal: space.md, borderRadius: radius.md }}>
      <T variant="title" tone={tone}>
        {value}
      </T>
      <Spacer h={2} />
      <T variant="caption" tone="faint">
        {label}
      </T>
    </Card>
  );
}

const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`);
const toneFor = (r: number | null) => (r === null ? 'muted' : r >= 0.8 ? 'good' : r >= 0.5 ? 'warn' : 'bad');

/** Turns two numbers into the sentence a clinician would actually write in
 *  their notes — including the case where the plan, not the patient, is the
 *  problem. */
function clinicalRead(week: number | null, month: number | null, improving: boolean | null): string {
  if (week === null || month === null) return 'No adherence data recorded yet for this patient.';
  const falling = week < month - 0.12;
  const rising = week > month + 0.12;

  if (week >= 0.8 && improving) return 'Adherence is high and the outcome measure is moving in the intended direction. Continue the current program; consider progressing the load at the next visit.';
  if (week >= 0.8 && improving === false) return 'Adherence is high but the outcome has not shifted. This is a programming problem rather than a compliance one — reconsider dosage, load or diagnosis before adding more items.';
  if (falling) return 'Adherence has dropped sharply in the last week compared with the month. Recent drop-offs usually have a specific cause — pain, a schedule change, or an item the patient cannot actually perform. Worth a short call before the next visit.';
  if (rising) return 'Adherence is improving on the last week. Name it explicitly at the next visit — acknowledged progress is the cheapest reinforcement available.';
  if (week < 0.5) return 'Adherence is low and sustained. Cutting the program to two or three non-negotiable items usually outperforms restating the full plan.';
  return 'Adherence is partial and stable. Identify the single most-skipped item and either fix the barrier or remove it from the program.';
}
