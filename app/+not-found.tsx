import { useRouter } from 'expo-router';
import React from 'react';
import { space } from '../src/theme';
import { Button, Card, Screen, Spacer, T } from '../src/ui';

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen>
      <Spacer h={space.xxxl} />
      <Card>
        <T variant="title">That page does not exist</T>
        <Spacer h={space.sm} />
        <T variant="body" tone="muted">
          The link you followed points somewhere Apol does not have a screen for.
        </T>
        <Spacer h={space.lg} />
        <Button label="Go to Today" onPress={() => router.replace('/today')} />
      </Card>
    </Screen>
  );
}
