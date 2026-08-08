import React from 'react';
import { AppShell, NavItem } from '../../src/ui/AppShell';

const items: NavItem[] = [
  { href: '/today', label: 'Today', icon: 'today' },
  { href: '/program', label: 'Program', icon: 'program' },
  { href: '/progress', label: 'Progress', icon: 'progress' },
  { href: '/visits', label: 'Visits', icon: 'calendar' },
];

export default function PatientLayout() {
  return <AppShell items={items} title="Patient" />;
}
