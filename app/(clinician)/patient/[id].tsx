import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatDay, lastNDays, today } from '../../../src/domain/date';
import {
  adherenceRate,
  adherenceSeries,
  adherenceSeriesForChart,
  currentStreak,
  outcomeSummary,
  nextAppointment,
  programFor,
  readingsFor,
  riskLevel,
  tasksForDay,
  unreadCount,
} from '../../../src/domain/selectors';
import { SKIP_REASONS } from '../../../src/domain/types';
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
import { PrescriptionForm } from '../../../src/ui/PrescriptionForm';
import { MessageThread } from '../../../src/ui/MessageThread';
import { Confirm } from '../../../src/ui/Sheet';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'plan', label: 'Plan' },
  { value: 'log', label: 'Log' },
  { value: 'messages', label: 'Messages' },
] as const;

/** The chart view: everything a specialist needs before a 30-minute visit,
 *  arranged so it can be skimmed in the corridor on a phone. */
export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, addPrescription, discontinuePrescription } = useStore();
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<'overview' | 'plan' | 'log' | 'messages'>('overview');
  const [adding, setAdding] = useState(false);
  const [discontinuing, setDiscontinuing] = useState<string | null>(null);

  const patient = state.patients.find((p) => p.id === id);
  const unread = patient ? unreadCount(state, patient.id, 'clinician') : 0;
  const program = patient ? programFor(state, patient.id) : undefined;

  const data = useMemo(() => {
    if (!patient) return null;
    const month = adherenceSeriesForChart(state, patient.id, 30);
    return {
      month,
      week: adherenceSeries(state, patient.id, 7),
      rate30: adherenceRate(month),
      rate7: adherenceRate(adherenceSeries(state, patient.id, 7)),
      streak: currentStreak(state, patient.id),
      risk: riskLevel(state, patient.id),
      outcome: outcomeSummary(state, patient.id),
      reportedUnable: month.reduce((n, d) => n + d.reportedUnable, 0),
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

  const trend = data.outcome?.trend ?? null;
  const improving = data.outcome?.improving ?? null;
  const readings = data.outcome?.readings ?? [];
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
            {unread > 0 && <Pill label={`${unread} unread`} tone="accent" />}
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
            <Metric label="Reported unable" value={`${data.reportedUnable}`} tone="default" />
          </Row>
          <Spacer h={space.md} />
          <Card>
            <AdherenceBars series={data.month} height={140} />
          </Card>

          {program && (
            <>
              <SectionHeader title={program.primaryMetric.label} />
              <Card>
                {readings.length < 2 ? (
                  <T variant="body" tone="muted">
                    Not enough check-ins recorded yet.
                  </T>
                ) : (
                  <Stack gap={space.md}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Stack gap={2}>
                        <T variant="title">
                          {readings[readings.length - 1].value}
                          {program.primaryMetric.unit}
                        </T>
                        <T variant="caption" tone="faint">
                          latest reading
                        </T>
                      </Stack>
                      {trend && (
                        <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                          <T variant="heading" tone={improving ? 'good' : 'warn'}>
                            {trend.recentDelta > 0 ? '+' : ''}
                            {trend.recentDelta.toFixed(1)}
                            {program.primaryMetric.unit}
                          </T>
                          <T variant="caption" tone="faint">
                            recent · {trend.delta > 0 ? '+' : ''}
                            {trend.delta.toFixed(1)} overall
                          </T>
                        </Stack>
                      )}
                    </Row>
                    <MetricChart
                      readings={readings}
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
              {clinicalRead(data.rate7, data.rate30, improving, data.outcome?.alarm ?? null, program?.primaryMetric)}
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
          <SectionHeader
            title={program?.title ?? 'Program'}
            action={program ? <Button label="Add item" onPress={() => setAdding(true)} /> : undefined}
          />
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
                    {rx.endedOn ? (
                      <View style={{ marginTop: space.sm, alignSelf: 'flex-start' }}>
                        <Pill label={`Discontinued ${formatDay(rx.endedOn)}`} tone="warn" />
                      </View>
                    ) : (
                      <View style={{ marginTop: space.sm, alignSelf: 'flex-start' }}>
                        <Button label="Discontinue" kind="danger" onPress={() => setDiscontinuing(rx.id)} />
                      </View>
                    )}
                  </Stack>
                  {i < scripts.length - 1 && <Divider />}
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {tab === 'log' && <DayLog patientId={patient.id} />}

      {tab === 'messages' && (
        <>
          <SectionHeader title="Thread" />
          <MessageThread patientId={patient.id} role="clinician" />
        </>
      )}

      {program && (
        <PrescriptionForm
          visible={adding}
          programId={program.id}
          onClose={() => setAdding(false)}
          onCreate={addPrescription}
        />
      )}

      <Confirm
        visible={discontinuing !== null}
        title="Discontinue this item?"
        body="It stops appearing on the patient's list from today. Everything they have already logged against it is kept, so past adherence stays accurate."
        confirmLabel="Discontinue"
        onCancel={() => setDiscontinuing(null)}
        onConfirm={() => {
          if (discontinuing) discontinuePrescription(discontinuing);
          setDiscontinuing(null);
        }}
      />

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
          // Rest days are shown, not omitted: a missing date is indistinguishable
          // from missing data, and "nothing was due" is itself an answer.
          if (!tasks.length) {
            return (
              <Card key={date}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="heading" tone="faint">
                    {formatDay(date)}
                  </T>
                  <Pill label="Rest day" />
                </Row>
              </Card>
            );
          }
          const done = tasks.filter((t) => t.entry?.status === 'done').length;
          // Today is still in progress. Grading it, or calling its outstanding
          // items "missed", contradicts how every other surface treats an open
          // day — and would have the clinician chasing a patient at 9am.
          const isToday = date === today();
          return (
            <Card key={date}>
              <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
                <T variant="heading">
                  {formatDay(date)}
                  {isToday ? ' · today' : ''}
                </T>
                <Pill
                  label={`${done}/${tasks.length}`}
                  tone={isToday ? 'neutral' : done === tasks.length ? 'good' : done > 0 ? 'warn' : 'bad'}
                />
              </Row>
              <Stack gap={space.xs}>
                {tasks.map((t) => {
                  const ok = t.entry?.status === 'done';
                  const skipped = t.entry?.status === 'skipped';
                  const reason = SKIP_REASONS.find((r) => r.value === t.entry?.skipReason)?.label;
                  return (
                    <Row key={t.key} gap={space.sm}>
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: ok
                            ? colors.good
                            : skipped
                              ? colors.warn
                              : isToday
                                ? colors.border
                                : colors.bad,
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
                      {/* A reason the patient gave is the point of this screen —
                          it turns "missed" into something a clinician can act on. */}
                      {skipped && <T variant="caption" tone="warn">{reason ?? 'skipped'}</T>}
                      {!ok && !skipped && (
                        <T variant="caption" tone="faint">{isToday ? 'not yet' : 'missed'}</T>
                      )}
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
function clinicalRead(
  week: number | null,
  month: number | null,
  improving: boolean | null,
  alarm: { worseBy: number } | null,
  metric?: { label: string; unit: string },
): string {
  // A deterioration outranks everything else on this screen. A patient who is
  // doing the work and getting worse is the one the caseload ranking is most
  // likely to have hidden, and the one who most needs a call.
  if (alarm) {
    const adhering = week !== null && week >= 0.8;
    return `${metric?.label ?? 'The outcome measure'} has worsened by ${alarm.worseBy.toFixed(1)}${
      metric?.unit ?? ''
    } against this patient's recent baseline${
      adhering
        ? ', while adherence has stayed high. Doing the work and getting worse points at the prescription, a flare, or the diagnosis — review before the next scheduled visit.'
        : ', alongside dropping adherence. Establish which came first: pain that stopped the program, or a program that stopped and let symptoms return.'
    }`;
  }
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
