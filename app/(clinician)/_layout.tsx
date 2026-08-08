import { Redirect } from 'expo-router';
import React from 'react';
import { useStore } from '../../src/store';
import { AppShell, NavItem } from '../../src/ui/AppShell';

const items: NavItem[] = [
  { href: '/patients', label: 'Patients', icon: 'people' },
  { href: '/schedule', label: 'Schedule', icon: 'calendar' },
];

export default function ClinicianLayout() {
  const { state } = useStore();
  // A stack is only reachable in its own role. Without this guard, typing or
  // deep-linking a URL from the other role renders that entire app — tab bar
  // and all — under the wrong identity.
  if (state.role !== 'clinician') return <Redirect href="/today" />;

  return <AppShell items={items} title="Clinician" />;
}
