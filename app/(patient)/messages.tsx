import React from 'react';
import { messagesFor } from '../../src/domain/selectors';
import { useCurrentPatient, useStore } from '../../src/store';
import { space } from '../../src/theme';
import { Card, Screen, SectionHeader, Spacer, T } from '../../src/ui';
import { MessageThread } from '../../src/ui/MessageThread';

export default function MessagesScreen() {
  const { state } = useStore();
  const patient = useCurrentPatient();
  const clinician = state.clinicians.find((c) => c.id === patient.clinicianId);

  return (
    <Screen>
      <Spacer h={space.lg} />
      <T variant="hero">Messages</T>
      <Spacer h={space.xs} />
      <T variant="body" tone="muted">
        {clinician ? `${clinician.name} · ${clinician.discipline}` : 'Your specialist'}
      </T>

      <SectionHeader title="Your thread" />
      <MessageThread patientId={patient.id} role="patient" />

      <SectionHeader title="Good things to send" />
      <Card>
        <T variant="body" tone="muted">
          An exercise that hurts. An item you have no equipment for. A week you know will be impossible. A
          program that is easier than expected. All of it changes what your specialist prescribes next — none
          of it is a complaint.
        </T>
      </Card>
    </Screen>
  );
}
