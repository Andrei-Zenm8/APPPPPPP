import { Redirect } from 'expo-router';
import React from 'react';
import { useStore } from '../src/store';

/** Entry point: send each role to its own stack. */
export default function Index() {
  const { state } = useStore();
  return <Redirect href={state.role === 'clinician' ? '/patients' : '/today'} />;
}
