import React from 'react';
import { View } from 'react-native';
import { formatDateTime, relativeDay } from '../../src/domain/date';
import { upcomingAppointments } from '../../src/domain/selectors';
import type { Appointment } from '../../src/domain/types';
import { useCurrentPatient, useStore } from '../../src/store';
import { radius, space, useTheme } from '../../src/theme';
import { Card, EmptyState, Pill, Row, Screen, SectionHeader, Spacer, Stack, T } from '../../src/ui';
import { Icon } from '../../src/ui/icons';

export default function VisitsScreen() {
  const { state } = useStore();
  const patient = useCurrentPatient();
  const upcoming = upcomingAppointments(state, { patientId: patient.id });
  const past = state.appointments
    .filter((a) => a.patientId === patient.id && !upcoming.includes(a))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <Screen>
      <Spacer h={space.lg} />
      <T variant="hero">Visits</T>

      <SectionHeader title="Upcoming" />
      {upcoming.length === 0 ? (
        <EmptyState title="No visits booked" body="Your specialist will add your next appointment here." />
      ) : (
        <Stack gap={space.md}>
          {upcoming.map((a, i) => (
            <AppointmentCard key={a.id} appointment={a} highlight={i === 0} />
          ))}
        </Stack>
      )}

      {past.length > 0 && (
        <>
          <SectionHeader title="Earlier" />
          <Stack gap={space.md}>
            {past.map((a) => (
              <AppointmentCard key={a.id} appointment={a} muted />
            ))}
          </Stack>
        </>
      )}
    </Screen>
  );
}

export function AppointmentCard({
  appointment,
  highlight,
  muted,
  subtitle,
}: {
  appointment: Appointment;
  highlight?: boolean;
  muted?: boolean;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  const day = appointment.startsAt.slice(0, 10);

  return (
    <Card
      style={
        highlight
          ? { borderColor: colors.accent, borderWidth: 1.5 }
          : muted
            ? { opacity: 0.7 }
            : undefined
      }
    >
      <Row gap={space.md} align="flex-start">
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={appointment.kind === 'video' ? 'video' : 'pin'} size={20} color={colors.accent} />
        </View>

        <Stack gap={4} style={{ flex: 1 }}>
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            <T variant="heading">{formatDateTime(appointment.startsAt)}</T>
            {appointment.status === 'scheduled' && <Pill label={relativeDay(day)} tone={highlight ? 'accent' : 'neutral'} />}
            {appointment.status === 'cancelled' && <Pill label="Cancelled" tone="bad" />}
          </Row>
          <T variant="body" tone="muted">
            {subtitle ?? `${appointment.location} · ${appointment.durationMin} min`}
          </T>
          {!!appointment.note && (
            <T variant="body" tone="accent" style={{ marginTop: space.xs }}>
              {appointment.note}
            </T>
          )}
        </Stack>
      </Row>
    </Card>
  );
}
