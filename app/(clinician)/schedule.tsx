import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatDay, formatTime, relativeDay } from '../../src/domain/date';
import { patientsOf, upcomingAppointments } from '../../src/domain/selectors';
import { useStore } from '../../src/store';
import { radius, space, useTheme } from '../../src/theme';
import { Avatar, Button, Card, EmptyState, Pill, Row, Screen, SectionHeader, Segmented, Spacer, Stack, T } from '../../src/ui';
import { Icon } from '../../src/ui/icons';

/** Clinician's diary. Grouped by day, because "what does Tuesday look like"
 *  is the only question anyone asks a schedule. */
export default function ScheduleScreen() {
  const { state, addAppointment, cancelAppointment } = useStore();
  const { colors } = useTheme();
  const [adding, setAdding] = useState(false);

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
            onCreate={(patientId, daysAhead, hour) => {
              const d = new Date();
              d.setDate(d.getDate() + daysAhead);
              d.setHours(hour, 0, 0, 0);
              addAppointment({
                patientId,
                clinicianId: state.currentClinicianId,
                startsAt: d.toISOString(),
                durationMin: 30,
                location: 'Northside Rehab · Room 1',
                kind: 'in-person',
              });
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
                          <Button label="Cancel visit" kind="danger" onPress={() => cancelAppointment(a.id)} />
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
      <View style={{ height: space.xl }} />
    </Screen>
  );
}

/** Deliberately three taps: patient, day, hour. A full date-time picker is a
 *  native-module dependency that behaves differently on every platform, and
 *  booking inside two weeks covers almost every real scheduling action. */
function NewVisitForm({
  patients,
  onCreate,
}: {
  patients: ReturnType<typeof patientsOf>;
  onCreate: (patientId: string, daysAhead: number, hour: number) => void;
}) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [days, setDays] = useState(1);
  const [hour, setHour] = useState(10);

  if (!patients.length) return <EmptyState title="No patients" body="Add a patient before booking a visit." />;

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

        <Button label="Book visit" full onPress={() => onCreate(patientId, days, hour)} />
      </Stack>
    </Card>
  );
}
