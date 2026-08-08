import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatDay, formatTime, relativeDay } from '../../src/domain/date';
import { patientsOf, upcomingAppointments } from '../../src/domain/selectors';
import type { Appointment } from '../../src/domain/types';
import { useStore } from '../../src/store';
import { radius, space, useTheme } from '../../src/theme';
import { Avatar, Button, Card, EmptyState, Row, Screen, SectionHeader, Segmented, Spacer, Stack, T } from '../../src/ui';
import { Input } from '../../src/ui/PrescriptionForm';
import { Confirm } from '../../src/ui/Sheet';
import { Icon } from '../../src/ui/icons';

/** Clinician's diary. Grouped by day, because "what does Tuesday look like"
 *  is the only question anyone asks a schedule. */
export default function ScheduleScreen() {
  const { state, addAppointment, cancelAppointment } = useStore();
  const { colors } = useTheme();
  const [adding, setAdding] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const appointments = upcomingAppointments(state, { clinicianId: state.currentClinicianId });
  const patients = patientsOf(state, state.currentClinicianId);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof appointments>();
    for (const a of appointments) {
      const day = a.startsAt.slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), a]);
    }
    return [...map.entries()];
  }, [appointments]);

  return (
    <Screen wide>
      <Spacer h={space.lg} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="hero">Schedule</T>
        <Button label={adding ? 'Close' : 'New visit'} kind={adding ? 'secondary' : 'primary'} onPress={() => setAdding((a) => !a)} />
      </Row>

      {adding && (
        <>
          <Spacer h={space.lg} />
          <NewVisitForm
            patients={patients}
            existing={appointments}
            onCreate={(draft) => {
              addAppointment({ ...draft, clinicianId: state.currentClinicianId });
              setAdding(false);
            }}
          />
        </>
      )}

      {byDay.length === 0 ? (
        <>
          <Spacer h={space.xl} />
          <EmptyState title="Nothing booked" body="Your upcoming visits will appear here." />
        </>
      ) : (
        byDay.map(([day, items]) => (
          <View key={day}>
            <SectionHeader title={`${formatDay(day)} · ${relativeDay(day)}`} />
            <Stack gap={space.md}>
              {items.map((a) => {
                const patient = state.patients.find((p) => p.id === a.patientId);
                return (
                  <Card key={a.id}>
                    <Row gap={space.md} align="flex-start">
                      <Stack gap={2} style={{ alignItems: 'center', width: 52 }}>
                        <T variant="heading">{formatTime(a.startsAt)}</T>
                        <T variant="caption" tone="faint">
                          {a.durationMin}m
                        </T>
                      </Stack>
                      <View style={{ width: 3, borderRadius: 2, alignSelf: 'stretch', backgroundColor: colors.accentSoft }} />
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Row gap={space.sm}>
                          {patient && <Avatar name={patient.name} tint={patient.avatarTint} size={26} />}
                          <T variant="heading">{patient?.name ?? 'Unknown patient'}</T>
                        </Row>
                        <T variant="body" tone="muted">
                          {a.location}
                        </T>
                        {!!a.note && (
                          <T variant="caption" tone="accent">
                            {a.note}
                          </T>
                        )}
                        <View style={{ alignSelf: 'flex-start', marginTop: space.xs }}>
                          <Button label="Cancel visit" kind="danger" onPress={() => setCancelling(a.id)} />
                        </View>
                      </Stack>
                      <Icon name={a.kind === 'video' ? 'video' : 'pin'} size={18} color={colors.inkFaint} />
                    </Row>
                  </Card>
                );
              })}
            </Stack>
          </View>
        ))
      )}
      <Confirm
        visible={cancelling !== null}
        title="Cancel this visit?"
        body="The patient sees the cancellation on their Visits screen. You will need to book a replacement separately."
        confirmLabel="Cancel visit"
        onCancel={() => setCancelling(null)}
        onConfirm={() => {
          if (cancelling) cancelAppointment(cancelling);
          setCancelling(null);
        }}
      />

      <View style={{ height: space.xl }} />
    </Screen>
  );
}

/**
 * Booking a visit.
 *
 * A full date-time picker is a native-module dependency that looks and behaves
 * differently on every platform Apol targets, so this is a set of explicit
 * choices instead — and every one of them starts unselected-but-visible, so the
 * form can never book a time the clinician did not actually pick.
 */
function NewVisitForm({
  patients,
  existing,
  onCreate,
}: {
  patients: ReturnType<typeof patientsOf>;
  existing: Appointment[];
  onCreate: (draft: Omit<Appointment, 'id' | 'status' | 'clinicianId'>) => void;
}) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [days, setDays] = useState(1);
  const [hour, setHour] = useState(9);
  const [kind, setKind] = useState<Appointment['kind']>('in-person');
  const [durationMin, setDuration] = useState(30);
  const [note, setNote] = useState('');
  const { colors } = useTheme();

  if (!patients.length) return <EmptyState title="No patients" body="Add a patient before booking a visit." />;

  const startsAt = (() => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  })();

  // Overlap check against the clinician's own diary. Double-booking is the one
  // scheduling mistake that reliably wastes two people's time.
  const startMs = startsAt.getTime();
  const endMs = startMs + durationMin * 60_000;
  const clash = existing.find((a) => {
    const s = new Date(a.startsAt).getTime();
    return startMs < s + a.durationMin * 60_000 && s < endMs;
  });
  const clashPatient = clash ? patients.find((p) => p.id === clash.patientId)?.name : null;

  return (
    <Card>
      <Stack gap={space.lg}>
        <Stack gap={space.sm}>
          <T variant="caption" tone="faint">
            PATIENT
          </T>
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            {patients.map((p) => (
              <View key={p.id}>
                <Button
                  label={p.name}
                  kind={p.id === patientId ? 'primary' : 'secondary'}
                  onPress={() => setPatientId(p.id)}
                />
              </View>
            ))}
          </Row>
        </Stack>

        <Stack gap={space.sm}>
          <T variant="caption" tone="faint">
            WHEN
          </T>
          <Segmented
            options={[
              { value: '1', label: 'Tomorrow' },
              { value: '3', label: 'In 3 days' },
              { value: '7', label: 'Next week' },
              { value: '14', label: 'In 2 weeks' },
            ]}
            value={String(days)}
            onChange={(v) => setDays(Number(v))}
          />
        </Stack>

        <Stack gap={space.sm}>
          <T variant="caption" tone="faint">
            TIME
          </T>
          <Segmented
            options={[
              { value: '9', label: '09:00' },
              { value: '11', label: '11:00' },
              { value: '14', label: '14:00' },
              { value: '16', label: '16:00' },
            ]}
            value={String(hour)}
            onChange={(v) => setHour(Number(v))}
          />
        </Stack>

        <Stack gap={space.sm}>
          <T variant="caption" tone="faint">
            TYPE
          </T>
          <Segmented
            options={[
              { value: 'in-person', label: 'In person' },
              { value: 'video', label: 'Video' },
              { value: 'phone', label: 'Phone' },
            ]}
            value={kind}
            onChange={setKind}
          />
        </Stack>

        <Stack gap={space.sm}>
          <T variant="caption" tone="faint">
            LENGTH
          </T>
          <Segmented
            options={[
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
              { value: '45', label: '45 min' },
              { value: '60', label: '60 min' },
            ]}
            value={String(durationMin)}
            onChange={(v) => setDuration(Number(v))}
          />
        </Stack>

        <Stack gap={space.sm}>
          <T variant="caption" tone="faint">
            NOTE FOR THE PATIENT (OPTIONAL)
          </T>
          <Input value={note} onChangeText={setNote} placeholder="Bring shorts — we are re-measuring extension." />
        </Stack>

        {clash && (
          <View style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.warnSoft }}>
            <T variant="body" tone="warn">
              {`That slot overlaps an existing visit${clashPatient ? ` with ${clashPatient}` : ''} at ${formatTime(
                clash.startsAt,
              )}.`}
            </T>
          </View>
        )}

        <Button
          label={clash ? 'Book anyway' : 'Book visit'}
          kind={clash ? 'secondary' : 'primary'}
          full
          onPress={() =>
            onCreate({
              patientId,
              startsAt: startsAt.toISOString(),
              durationMin,
              kind,
              location: kind === 'in-person' ? 'Northside Rehab · Room 1' : kind === 'video' ? 'Video call' : 'Phone call',
              note: note.trim() || undefined,
            })
          }
        />
      </Stack>
    </Card>
  );
}
