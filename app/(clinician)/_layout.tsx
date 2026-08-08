import React from 'react';
import { AppShell, NavItem } from '../../src/ui/AppShell';

const items: NavItem[] = [
  { href: '/patients', label: 'Patients', icon: 'people' },
  { href: '/schedule', label: 'Schedule', icon: 'calendar' },
];

export default function ClinicianLayout() {
  return <AppShell items={items} title="Clinician" />;
}
