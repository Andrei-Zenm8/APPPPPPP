import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../src/store';
import { useTheme } from '../src/theme';

function Root() {
  const { colors, isDark } = useTheme();
  const { ready } = useStore();

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
