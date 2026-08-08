import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatDay, formatDateTime, relativeDay, today as todayISO } from '../../src/domain/date';
import {
  adherenceSeries,
  currentStreak,
  nextAppointment,
  programFor,
  tasksForDay,
} from '../../src/domain/selectors';
import { SKIP_REASONS, type SkipReason, type TaskInstance } from '../../src/domain/types';
import { useCurrentPatient, useStore } from '../../src/store';
import { radius, space, useTheme } from '../../src/theme';
import { Button, Card, Divider, Pill, Row, Screen, SectionHeader, Spacer, Stack, T } from '../../src/ui';
import { ProgressRing } from '../../src/ui/charts';
import { Icon } from '../../src/ui/icons';
import { ScalePicker } from '../../src/ui/ScalePicker';
import { Sheet } from '../../src/ui/Sheet';
import { TaskRow } from '../../src/ui/TaskRow';

const GROUPS = [
  { key: 'morning', label: 'Morning' },
  { key: 'midday', label: 'Midday' },
  { key: 'evening', label: 'Evening' },
  { key: 'anytime', label: 'Anytime' },
] as const;

export default function TodayScreen() {
  const { state, toggleTask, recordMeasurement, skipTask } = useStore();
  const patient = useCurrentPatient();
  const router = useRouter();
  const { colors } = useTheme();
  const date = todayISO();
  const [measuring, setMeasuring] = useState<TaskInstance | null>(null);
  const [skipping, setSkipping] = useState<TaskInstance | null>(null);

  const tasks = useMemo(() => tasksForDay(state, patient.id, date), [state, patient.id, date]);
  const done = tasks.filter((t) => t.entry?.status === 'done').length;
  const streak = useMemo(() => currentStreak(state, patient.id), [state, patient.id]);
  const week = useMemo(() => adherenceSeries(state, patient.id, 7), [state, patient.id]);
  const appointment = nextAppointment(state, patient.id);
  const program = programFor(state, patient.id);

  const rate = tasks.length ? done / tasks.length : 0;
  const remaining = tasks.length - done;

  return (
    <Screen>
      <Spacer h={space.lg} />

      <Row style={{ justifyContent: 'space-between' }}>
        <Stack gap={2}>
          <T variant="caption" tone="faint">
            {formatDay(date).toUpperCase()}
          </T>
          <T variant="hero">{greeting(patient.name)}</T>
        </Stack>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          hitSlop={10}
        >
          <Icon name="settings" color={colors.inkFaint} />
        </Pressable>
      </Row>

      <Spacer h={space.lg} />

      {/* Status card: the one screen the patient sees every morning. */}
      <Card>
        <Row gap={space.lg}>
          <ProgressRing value={rate} sublabel={`${done}/${tasks.length}`} inProgress />
          <Stack gap={space.xs} style={{ flex: 1 }}>
            <T variant="heading">
              {tasks.length === 0
                ? 'Nothing scheduled today'
                : remaining === 0
                  ? 'Day complete — every item logged'
                  : `${remaining} ${remaining === 1 ? 'item' : 'items'} left today`}
            </T>
            <T variant="body" tone="muted">
              {program?.title ?? patient.condition}
            </T>
            {streak > 0 && (
              <Row gap={space.xs} style={{ marginTop: space.xs }}>
                <Icon name="flame" size={16} color={colors.warn} filled />
                <T variant="label" tone="warn">
                  {streak}-day streak
                </T>
              </Row>
            )}
          </Stack>
        </Row>

        <Spacer h={space.lg} />
        <Divider />
        <Spacer h={space.md} />

        <Row gap={space.sm} style={{ justifyContent: 'space-between' }}>
          {week.map((d, i) => {
            const isToday = i === week.length - 1;
            return (
              <Stack key={d.date} gap={4} style={{ alignItems: 'center', flex: 1 }}>
                <View
                  style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      d.rate === null
                        ? colors.border
                        : d.rate >= 0.8
                          ? colors.good
                          : isToday
                            ? colors.accentSoft
                            : d.rate >= 0.5
                              ? colors.warn
                              : d.rate > 0
                                ? colors.bad
                                : colors.surfaceAlt,
                  }}
                />
                <T variant="caption" tone={isToday ? 'accent' : 'faint'}>
                  {formatDay(d.date).slice(0, 1)}
                </T>
              </Stack>
            );
          })}
        </Row>
      </Card>

      {appointment && (
        <>
          <SectionHeader title="Next visit" />
          <Card onPress={() => router.push('/visits')}>
            <Row gap={space.md}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: radius.md,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={appointment.kind === 'video' ? 'video' : 'calendar'} size={20} color={colors.accent} />
              </View>
              <Stack gap={2} style={{ flex: 1 }}>
                <T variant="heading">{formatDateTime(appointment.startsAt)}</T>
                <T variant="body" tone="muted">
                  {appointment.location} · {relativeDay(appointment.startsAt.slice(0, 10))}
                </T>
              </Stack>
              <Icon name="chevron" size={18} color={colors.inkFaint} />
            </Row>
          </Card>
        </>
      )}

      {GROUPS.map((g) => {
        const group = tasks.filter((t) => t.prescription.timeOfDay === g.key);
        if (!group.length) return null;
        const groupDone = group.filter((t) => t.entry?.status === 'done').length;
        return (
          <View key={g.key}>
            <SectionHeader
              title={g.label}
              action={<Pill label={`${groupDone}/${group.length}`} tone={groupDone === group.length ? 'good' : 'neutral'} />}
            />
            <Card padded={false} style={{ paddingHorizontal: space.lg }}>
              {group.map((task, i) => (
                <View key={task.key} style={i === group.length - 1 ? { marginBottom: -1 } : undefined}>
                  <TaskRow
                    task={task}
                    onToggle={() =>
                      toggleTask({
                        patientId: patient.id,
                        prescriptionId: task.prescription.id,
                        date,
                        occurrence: task.occurrence,
                      })
                    }
                    onMeasure={() => setMeasuring(task)}
                    onSkip={() => setSkipping(task)}
                  />
                </View>
              ))}
            </Card>
          </View>
        );
      })}

      {tasks.length === 0 && (
        <>
          <Spacer h={space.lg} />
          <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
            <T variant="heading">Rest day</T>
            <Spacer h={space.xs} />
            <T variant="body" tone="muted" style={{ textAlign: 'center' }}>
              Nothing is scheduled for you today. Recovery is part of the program.
            </T>
          </Card>
        </>
      )}

      <MeasurementSheet
        task={measuring}
        onClose={() => setMeasuring(null)}
        onSubmit={(value) => {
          if (!measuring?.prescription.metric) return;
          recordMeasurement({
            patientId: patient.id,
            prescriptionId: measuring.prescription.id,
            metricKey: measuring.prescription.metric.key,
            date,
            value,
          });
          setMeasuring(null);
        }}
      />

      <SkipSheet
        task={skipping}
        onClose={() => setSkipping(null)}
        onSubmit={(reason) => {
          if (!skipping) return;
          skipTask({
            patientId: patient.id,
            prescriptionId: skipping.prescription.id,
            date,
            occurrence: skipping.occurrence,
            reason,
          });
          setSkipping(null);
        }}
      />
    </Screen>
  );
}

function greeting(name: string) {
  const h = new Date().getHours();
  const first = name.split(' ')[0];
  if (h < 12) return `Good morning, ${first}`;
  if (h < 18) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}


function MeasurementSheet({
  task,
  onClose,
  onSubmit,
}: {
  task: TaskInstance | null;
  onClose: () => void;
  onSubmit: (value: number) => void;
}) {
  const [value, setValue] = useState<number | null>(null);
  const metric = task?.prescription.metric;

  // Reset the pending value each time the sheet opens for a different task.
  React.useEffect(() => {
    setValue(task?.entry?.value ?? null);
  }, [task?.key]);

  if (!task || !metric) return null;

  return (
    <Sheet
      visible
      onClose={onClose}
      title={task.prescription.title}
      subtitle={task.prescription.rationale}
      footer={
        <Row gap={space.sm}>
          <Button label="Cancel" kind="ghost" onPress={onClose} />
          <View style={{ flex: 1 }}>
            <Button
              label={value === null ? 'Pick a value' : `Log ${value}${metric.unit}`}
              disabled={value === null}
              full
              onPress={() => value !== null && onSubmit(value)}
            />
          </View>
        </Row>
      }
    >
      <ScalePicker
        min={metric.min}
        max={metric.max}
        value={value}
        unit={metric.unit}
        lowLabel={metric.key === 'pain' ? 'No pain' : `${metric.min}${metric.unit}`}
        highLabel={metric.key === 'pain' ? 'Worst imaginable' : `${metric.max}${metric.unit}`}
        onChange={setValue}
      />
    </Sheet>
  );
}

/**
 * "I couldn't do this, and here's why."
 *
 * The copy matters as much as the mechanism: a patient who is in too much pain
 * to train must not feel they are confessing to a failure, or they will simply
 * leave the item unticked and the clinician learns nothing. A recorded reason
 * is the single most actionable thing this app can send upstream.
 */
function SkipSheet({
  task,
  onClose,
  onSubmit,
}: {
  task: TaskInstance | null;
  onClose: () => void;
  onSubmit: (reason: SkipReason) => void;
}) {
  const { colors } = useTheme();
  if (!task) return null;

  return (
    <Sheet
      visible
      onClose={onClose}
      title={`Couldn't do ${task.prescription.title.toLowerCase()}?`}
      subtitle="That is useful information, not a failure. Your specialist sees the reason and can adjust the plan."
      footer={<Button label="Never mind" kind="ghost" full onPress={onClose} />}
    >
      <Stack gap={space.sm}>
        {SKIP_REASONS.map((r) => (
          <Pressable
            key={r.value}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            onPress={() => onSubmit(r.value)}
            style={({ pressed }) => ({
              paddingVertical: space.md,
              paddingHorizontal: space.lg,
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.accentSoft : colors.surfaceAlt,
              minHeight: 48,
              justifyContent: 'center',
            })}
          >
            <T variant="heading">{r.label}</T>
          </Pressable>
        ))}
      </Stack>
    </Sheet>
  );
}
