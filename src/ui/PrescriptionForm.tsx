import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { Prescription, PrescriptionKind, Schedule } from '../domain/types';
import { radius, space, type as typeScale, useTheme } from '../theme';
import { Button, Row, Segmented, Spacer, Stack, T } from './index';
import { Sheet } from './Sheet';

const KINDS: { value: PrescriptionKind; label: string }[] = [
  { value: 'exercise', label: 'Exercise' },
  { value: 'medication', label: 'Medication' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'habit', label: 'Habit' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The clinician's authoring flow.
 *
 * Rationale is a *required* field, not an optional note. Understanding why an
 * item was prescribed is the strongest single predictor of whether a patient
 * keeps doing it, so the product refuses to create a prescription that cannot
 * explain itself — the constraint is the feature.
 */
export function PrescriptionForm({
  visible,
  programId,
  onClose,
  onCreate,
}: {
  visible: boolean;
  programId: string;
  onClose: () => void;
  onCreate: (rx: Omit<Prescription, 'id'>) => void;
}) {
  const [kind, setKind] = useState<PrescriptionKind>('exercise');
  const [title, setTitle] = useState('');
  const [dose, setDose] = useState('');
  const [rationale, setRationale] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<Prescription['timeOfDay']>('morning');
  const [mode, setMode] = useState<'daily' | 'weekdays'>('daily');
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [days, setDays] = useState<number[]>([1, 3, 5]);

  const reset = () => {
    setKind('exercise');
    setTitle('');
    setDose('');
    setRationale('');
    setTimeOfDay('morning');
    setMode('daily');
    setTimesPerDay(1);
    setDays([1, 3, 5]);
  };

  const valid = title.trim().length > 1 && rationale.trim().length > 4 && (mode === 'daily' || days.length > 0);

  const submit = () => {
    const schedule: Schedule =
      mode === 'daily' ? { type: 'daily', timesPerDay } : { type: 'weekdays', days: [...days].sort() };
    onCreate({
      programId,
      kind,
      title: title.trim(),
      dose: dose.trim() || undefined,
      rationale: rationale.trim(),
      timeOfDay,
      schedule,
    });
    reset();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add to program"
      subtitle="The patient sees this exactly as you write it."
      footer={
        <Row gap={space.sm}>
          <Button label="Cancel" kind="ghost" onPress={onClose} />
          <View style={{ flex: 1 }}>
            <Button label="Add to program" full disabled={!valid} onPress={submit} />
          </View>
        </Row>
      }
    >
      <Stack gap={space.lg}>
        <Field label="TYPE">
          <Segmented options={KINDS} value={kind} onChange={setKind} />
        </Field>

        <Field label="WHAT TO DO">
          <Input value={title} onChangeText={setTitle} placeholder="Terminal knee extension" />
        </Field>

        <Field label="DOSE OR AMOUNT (OPTIONAL)">
          <Input value={dose} onChangeText={setDose} placeholder="3 × 15, or 500 mg" />
        </Field>

        <Field
          label="WHY IT MATTERS"
          hint="Required — patients who know the reason are far more likely to keep going."
        >
          <Input
            value={rationale}
            onChangeText={setRationale}
            placeholder="Restores the last 10° of extension, which is what normalises your gait."
            multiline
          />
        </Field>

        <Field label="WHEN">
          <Segmented
            options={[
              { value: 'morning', label: 'Morning' },
              { value: 'midday', label: 'Midday' },
              { value: 'evening', label: 'Evening' },
              { value: 'anytime', label: 'Anytime' },
            ]}
            value={timeOfDay}
            onChange={setTimeOfDay}
          />
        </Field>

        <Field label="HOW OFTEN">
          <Segmented
            options={[
              { value: 'daily', label: 'Every day' },
              { value: 'weekdays', label: 'Certain days' },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Spacer h={space.md} />
          {mode === 'daily' ? (
            <Segmented
              options={[
                { value: '1', label: 'Once' },
                { value: '2', label: 'Twice' },
                { value: '3', label: '3×' },
                { value: '4', label: '4×' },
              ]}
              value={String(timesPerDay)}
              onChange={(v) => setTimesPerDay(Number(v))}
            />
          ) : (
            <DayPicker days={days} onChange={setDays} />
          )}
        </Field>
      </Stack>
    </Sheet>
  );
}

function DayPicker({ days, onChange }: { days: number[]; onChange: (d: number[]) => void }) {
  const { colors } = useTheme();
  return (
    <Row gap={space.xs}>
      {WEEKDAYS.map((label, i) => {
        const day = i + 1;
        const active = days.includes(day);
        return (
          <Pressable
            key={label}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={label}
            onPress={() => onChange(active ? days.filter((d) => d !== day) : [...days, day])}
            style={{
              flex: 1,
              height: 44,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.accent : colors.surfaceAlt,
            }}
          >
            <T variant="label" style={{ color: active ? colors.accentInk : colors.inkMuted }}>
              {label[0]}
            </T>
          </Pressable>
        );
      })}
    </Row>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Stack gap={space.sm}>
      <T variant="caption" tone="faint">
        {label}
      </T>
      {children}
      {!!hint && (
        <T variant="caption" tone="faint">
          {hint}
        </T>
      )}
    </Stack>
  );
}

export function Input({
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & { multiline?: boolean }) {
  const { colors } = useTheme();
  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={colors.inkFaint}
      style={{
        ...typeScale.body,
        color: colors.ink,
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        paddingHorizontal: space.md,
        paddingVertical: space.md,
        minHeight: multiline ? 88 : 48,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );
}
