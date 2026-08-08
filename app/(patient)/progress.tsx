import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  adherenceRate,
  adherenceSeriesForChart,
  currentStreak,
  GOOD_DAY,
  outcomeSummary,
  programFor,
  readingsInWindow,
} from '../../src/domain/selectors';
import { useCurrentPatient, useStore } from '../../src/store';
import { space, useTheme } from '../../src/theme';
import { Card, EmptyState, Row, Screen, SectionHeader, Segmented, Spacer, Stack, T } from '../../src/ui';
import { AdherenceBars, MetricChart } from '../../src/ui/charts';

const WINDOWS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const;

/** The patient's own evidence that the work is paying off — the single
 *  strongest driver of continued adherence. */
export default function ProgressScreen() {
  const { state } = useStore();
  const patient = useCurrentPatient();
  const { colors } = useTheme();
  const [window, setWindow] = useState<'7' | '30' | '90'>('30');

  const days = Number(window);
  const program = programFor(state, patient.id);
  const series = useMemo(() => adherenceSeriesForChart(state, patient.id, days), [state, patient.id, days]);
  const rate = adherenceRate(series);
  const streak = currentStreak(state, patient.id);

  // Interpretation comes from the full history; `days` only selects what is
  // drawn. Otherwise "recently" would mean something different on each tab —
  // and on the shortest tab it would mean nothing at all.
  const outcome = useMemo(() => outcomeSummary(state, patient.id), [state, patient.id]);
  const plotted = useMemo(() => (outcome ? readingsInWindow(outcome.readings, days) : []), [outcome, days]);
  const trend = outcome?.trend ?? null;
  const improving = outcome?.improving ?? null;
  const worsening = !!outcome?.alarm;

  // Days cleared, not raw item count: a bare "153 items" changes meaning with
  // the window and gives the patient nothing to aim at.
  const goodDays = series.filter((d) => d.rate !== null && d.rate >= GOOD_DAY).length;
  const scoredDays = series.filter((d) => d.rate !== null).length;

  return (
    <Screen>
      <Spacer h={space.lg} />
      <T variant="hero">Your progress</T>
      <Spacer h={space.md} />
      <Segmented options={WINDOWS as any} value={window} onChange={setWindow} />

      <SectionHeader title="At a glance" />
      <Row gap={space.md}>
        <Stat label="Adherence" value={rate === null ? '—' : `${Math.round(rate * 100)}%`} tone={
          rate === null ? 'muted' : rate >= 0.8 ? 'good' : rate >= 0.5 ? 'warn' : 'bad'
        } />
        <Stat label="Current streak" value={`${streak}d`} tone="default" />
        <Stat label={`Days at ${Math.round(GOOD_DAY * 100)}%+`} value={`${goodDays}/${scoredDays}`} tone="default" />
      </Row>

      <SectionHeader title={`Daily completion · last ${days} days`} />
      <Card>
        <AdherenceBars series={series} height={140} showLabels={days <= 30} />
      </Card>

      {program && (
        <>
          <SectionHeader title={program.primaryMetric.label} />
          <Card>
            {plotted.length < 2 ? (
              <EmptyStateInline />
            ) : (
              <Stack gap={space.md}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Stack gap={2}>
                    <T variant="hero">
                      {plotted[plotted.length - 1].value}
                      <T variant="heading" tone="faint">
                        {program.primaryMetric.unit}
                      </T>
                    </T>
                    <T variant="caption" tone="faint">
                      most recent
                    </T>
                  </Stack>
                  {trend && (
                    <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                      <T variant="heading" tone={improving ? 'good' : 'warn'}>
                        {trend.recentDelta > 0 ? '+' : ''}
                        {trend.recentDelta.toFixed(1)}
                        {program.primaryMetric.unit}
                      </T>
                      <T variant="caption" tone="faint">
                        {improving ? 'improving lately' : 'worse lately'}
                      </T>
                    </Stack>
                  )}
                </Row>
                <MetricChart
                  readings={plotted}
                  unit={program.primaryMetric.unit}
                  target={program.primaryMetric.target}
                  higherIsBetter={program.primaryMetric.higherIsBetter}
                />
              </Stack>
            )}
          </Card>
        </>
      )}

      <SectionHeader title="What this means" />
      <Card>
        <T variant="body" tone="muted">
          {narrative(rate, improving, worsening)}
        </T>
      </Card>
    </Screen>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'default' | 'muted' | 'good' | 'warn' | 'bad' }) {
  return (
    <Card style={{ flex: 1, paddingVertical: space.lg, paddingHorizontal: space.md }}>
      <T variant="title" tone={tone}>
        {value}
      </T>
      <Spacer h={2} />
      <T variant="caption" tone="faint">
        {label}
      </T>
    </Card>
  );
}

function EmptyStateInline() {
  return (
    <View style={{ paddingVertical: space.lg }}>
      <T variant="heading">Not enough check-ins yet</T>
      <Spacer h={space.xs} />
      <T variant="body" tone="muted">
        Log your daily check-in a couple more times and your trend line will appear here.
      </T>
    </View>
  );
}

/** Plain-language interpretation. Percentages alone do not change behaviour;
 *  a sentence that names the next action does. */
function narrative(rate: number | null, improving: boolean | null, worsening: boolean): string {
  // Never congratulate someone whose numbers have just got worse. Cheerful copy
  // over a bad week is how an app loses a patient's trust permanently.
  if (worsening) {
    return rate !== null && rate >= 0.8
      ? 'Your numbers have moved the wrong way recently even though you have kept up with the program. That is worth telling your specialist — when the work is being done and the result still slips, it is usually the plan that needs changing, not you.'
      : 'Your numbers have moved the wrong way recently. Log what you can and tell your specialist what has changed — a flare, a busy week, a new symptom. The sooner they know, the smaller the adjustment needs to be.';
  }
  if (rate === null) return 'Once you start logging, this is where your story shows up.';
  if (rate >= 0.9 && improving) return 'Excellent adherence and your numbers are moving the right way. Keep doing exactly this — bring this screen to your next visit.';
  if (rate >= 0.9) return 'Your adherence is excellent. The outcome has not shifted much yet, which is worth raising with your specialist — the program may need adjusting rather than more effort from you.';
  if (rate >= 0.6 && improving) return 'You are missing some days but the trend is still improving. Closing the gaps is the fastest lever you have left.';
  if (rate >= 0.6) return 'Adherence is patchy and the numbers have stalled. Pick the one item you skip most and tell your specialist why — it is usually fixable.';
  return 'Most items are going unlogged. That is information, not failure: message your specialist so the plan can be cut down to something you will actually do.';
}
