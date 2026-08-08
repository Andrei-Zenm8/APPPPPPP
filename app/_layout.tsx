import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../src/store';
import { syncReminders } from '../src/store/reminders';
import { useTheme } from '../src/theme';

function Root() {
  const { colors, isDark } = useTheme();
  const { ready, state } = useStore();

  // Reminders are derived from state like everything else: whenever the plan,
  // the diary or the settings change, the schedule is rebuilt to match.
  React.useEffect(() => {
    if (!ready) return;
    const scripts = state.prescriptions.filter((rx) =>
      state.programs.some((pr) => pr.id === rx.programId && pr.patientId === state.currentPatientId),
    );
    syncReminders({
      settings: state.reminders,
      prescriptions: scripts,
      appointments: state.appointments.filter((a) => a.patientId === state.currentPatientId),
    });
  }, [ready, state.reminders, state.prescriptions, state.appointments, state.currentPatientId, state.programs]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Rendering the navigator only once storage has been read avoids a
          visible flash of seed data over the patient's real logs. */}
      {ready && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.canvas },
            animation: 'slide_from_right',
          }}
        />
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
