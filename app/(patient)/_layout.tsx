import { Redirect } from 'expo-router';
import React from 'react';
import { useStore } from '../../src/store';
import { AppShell, NavItem } from '../../src/ui/AppShell';

const items: NavItem[] = [
  { href: '/today', label: 'Today', icon: 'today' },
  { href: '/program', label: 'Program', icon: 'program' },
  { href: '/progress', label: 'Progress', icon: 'progress' },
  { href: '/visits', label: 'Visits', icon: 'calendar' },
  { href: '/messages', label: 'Messages', icon: 'message' },
];

export default function PatientLayout() {
  const { state } = useStore();
  // A stack is only reachable in its own role. Without this guard, typing or
  // deep-linking a URL from the other role renders that entire app — tab bar
  // and all — under the wrong identity.
  if (state.role !== 'patient') return <Redirect href="/patients" />;

  return <AppShell items={items} title="Patient" />;
}
