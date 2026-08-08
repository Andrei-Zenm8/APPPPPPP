import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { formatDay, shortWeekday } from '../domain/date';
import { smoothedAdherence, type DayAdherence } from '../domain/selectors';
import type { MetricReading } from '../domain/types';
import { radius, space, useTheme } from '../theme';
import { Row, Stack, T } from './index';

/**
 * Charts are drawn by hand with react-native-svg rather than pulled from a
 * charting library: it is the only approach that renders identically on iOS,
 * Android, web and desktop, and it keeps the visual language (same radii, same
 * semantic colours) continuous with the rest of the app.
 *
 * Encoding rules used throughout:
 *  - Adherence is always a *proportion*, so it always uses a 0–100% axis. A
 *    zoomed axis would make an 80% week look like a catastrophe.
 *  - Outcome metrics use a padded data-driven domain, because the clinically
 *    interesting movement is often two points on a ten-point scale.
 *  - Colour never encodes a series; it only encodes state.
 */

/** ————— Progress ring: today's completion ————— */

export function ProgressRing({
  value,
  size = 76,
  stroke = 8,
  label,
  sublabel,
  inProgress = false,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  /** True while the day is still open. Suppresses the red/amber grading —
   *  a morning that is only 40% done is not a failure, and colouring it as one
   *  is the fastest way to make someone stop opening the app. */
  inProgress?: boolean;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const tone =
    clamped >= 0.8 ? colors.good : inProgress ? colors.accent : clamped >= 0.5 ? colors.warn : colors.bad;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={tone}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * clamped} ${c}`}
            fill="none"
          />
        </G>
      </Svg>
      <T variant="heading" style={{ color: tone }}>
        {label ?? `${Math.round(clamped * 100)}%`}
      </T>
      {!!sublabel && (
        <T variant="caption" tone="faint">
          {sublabel}
        </T>
      )}
    </View>
  );
}

/** ————— Adherence bars ————— */

export function AdherenceBars({
  series,
  height = 120,
  showLabels = true,
}: {
  series: DayAdherence[];
  height?: number;
  showLabels?: boolean;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);

  const labelH = showLabels ? 18 : 0;
  const plotH = height - labelH;
  const gap = series.length > 20 ? 2 : 5;
  const barW = width ? Math.max(3, (width - gap * (series.length - 1)) / series.length) : 0;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const active = focus !== null ? series[focus] : null;

  return (
    <Stack gap={space.sm}>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {/* Reference line at the 80% adherence threshold used for triage. */}
            <Line
              x1={0}
              x2={width}
              y1={plotH * 0.2}
              y2={plotH * 0.2}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            {series.map((d, i) => {
              const x = i * (barW + gap);
              const rate = d.rate;
              const isFocus = focus === i;

              if (rate === null) {
                // Nothing was due: a faint tick, never an empty gap that reads
                // as a missed day.
                return (
                  <Rect
                    key={d.date}
                    x={x}
                    y={plotH - 3}
                    width={barW}
                    height={3}
                    rx={1.5}
                    fill={colors.border}
                  />
                );
              }

              const h = Math.max(3, plotH * rate);
              // The final bar is today, which is still open — grade it as
              // neutral progress rather than a miss.
              const open = i === series.length - 1 && rate < 1;
              const fill =
                rate >= 0.8 ? colors.good : open ? colors.accent : rate >= 0.5 ? colors.warn : colors.bad;
              return (
                <G key={d.date}>
                  <Rect x={x} y={0} width={barW} height={plotH} rx={radius.sm / 2} fill={colors.surfaceAlt} />
                  <Rect
                    x={x}
                    y={plotH - h}
                    width={barW}
                    height={h}
                    rx={Math.min(radius.sm / 2, barW / 2)}
                    fill={fill}
                    opacity={focus === null || isFocus ? 1 : 0.35}
                  />
                </G>
              );
            })}
            {showLabels &&
              series.map((d, i) => {
                // Short ranges get weekday initials; longer ones get dates,
                // because a 30-day range labelled every 7th day would print the
                // same weekday letter five times over.
                const dense = series.length <= 14;
                if (!dense && i % 7 !== 0) return null;
                const label = dense ? shortWeekday(d.date)[0] : monthDay(d.date);
                return (
                  <SvgText
                    key={`l-${d.date}`}
                    x={i * (barW + gap) + barW / 2}
                    y={height - 4}
                    fontSize={10}
                    fill={colors.inkFaint}
                    textAnchor={dense ? 'middle' : i === 0 ? 'start' : 'middle'}
                  >
                    {label}
                  </SvgText>
                );
              })}
          </Svg>
        )}
        {/* Touch targets sit above the SVG so bars stay crisp but remain tappable. */}
        {width > 0 && (
          <Row gap={gap} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: plotH }}>
            {series.map((d, i) => (
              <Pressable
                key={`t-${d.date}`}
                accessibilityRole="button"
                accessibilityLabel={`${formatDay(d.date)}: ${d.done} of ${d.due} completed`}
                onPressIn={() => setFocus(i)}
                onPressOut={() => setFocus(null)}
                style={{ width: barW, height: plotH }}
              />
            ))}
          </Row>
        )}
      </View>
      <T variant="caption" tone="faint">
        {active
          ? `${formatDay(active.date)} · ${active.done}/${active.due} completed`
          : 'Hold a bar to see that day'}
      </T>
    </Stack>
  );
}

/** ————— Outcome metric line ————— */

export function MetricChart({
  readings,
  unit,
  target,
  higherIsBetter,
  height = 160,
}: {
  readings: MetricReading[];
  unit: string;
  target?: number;
  higherIsBetter: boolean;
  height?: number;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const padL = 30;
  const padR = 8;
  const padT = 10;
  const padB = 20;

  const geom = useMemo(() => {
    if (!readings.length || !width) return null;
    const values = readings.map((r) => r.value);
    if (target !== undefined) values.push(target);
    let min = Math.min(...values);
    let max = Math.max(...values);
    // Pad the domain so the line never rides the frame, and guard the
    // degenerate case where every reading is identical.
    const span = max - min || Math.max(1, Math.abs(max) * 0.1);
    min -= span * 0.15;
    max += span * 0.15;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const x = (i: number) => padL + (readings.length === 1 ? plotW / 2 : (i / (readings.length - 1)) * plotW);
    const y = (v: number) => padT + plotH - ((v - min) / (max - min)) * plotH;

    const line = readings.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(r.value).toFixed(1)}`).join(' ');
    const area = `${line} L${x(readings.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${x(0).toFixed(1)},${(
      padT + plotH
    ).toFixed(1)} Z`;

    return { x, y, line, area, min, max, plotH, plotW };
  }, [readings, width, height, target]);

  const last = readings[readings.length - 1];
  const hitTarget =
    target !== undefined && last ? (higherIsBetter ? last.value >= target : last.value <= target) : false;
  const strokeColor = hitTarget ? colors.good : colors.accent;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {geom && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={strokeColor} stopOpacity={0.22} />
              <Stop offset="1" stopColor={strokeColor} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {[geom.max, (geom.max + geom.min) / 2, geom.min].map((v, i) => (
            <G key={i}>
              <Line
                x1={padL}
                x2={width - padR}
                y1={geom.y(v)}
                y2={geom.y(v)}
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText x={padL - 6} y={geom.y(v) + 3} fontSize={9} fill={colors.inkFaint} textAnchor="end">
                {Math.round(v)}
              </SvgText>
            </G>
          ))}

          {target !== undefined && (
            <G>
              <Line
                x1={padL}
                x2={width - padR}
                y1={geom.y(target)}
                y2={geom.y(target)}
                stroke={colors.good}
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
              {/* Anchored left: the right edge is where the latest reading —
                  the most important mark on the chart — always sits. */}
              <SvgText x={padL + 2} y={geom.y(target) - 5} fontSize={9} fill={colors.good} textAnchor="start">
                {`target ${target}${unit}`}
              </SvgText>
            </G>
          )}

          <Path d={geom.area} fill="url(#metricFill)" />
          <Path
            d={geom.line}
            stroke={strokeColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
          {last && (
            <Circle
              cx={geom.x(readings.length - 1)}
              cy={geom.y(last.value)}
              r={4.5}
              fill={strokeColor}
              stroke={colors.surface}
              strokeWidth={2}
            />
          )}
        </Svg>
      )}
    </View>
  );
}

/** ————— Compact sparkline for list rows ————— */

export function Sparkline({
  series,
  tone,
  width = 72,
  height = 24,
}: {
  series: DayAdherence[];
  /** Passed in from the row's risk level so the line can never disagree with
   *  the badge sitting next to it. */
  tone: 'good' | 'warn' | 'bad';
  width?: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const points = smoothedAdherence(series);
  if (points.length < 2) return <View style={{ width, height }} />;

  const pad = 2;
  const step = width / (points.length - 1);
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(1, v))) * (height - pad * 2);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const stroke = { good: colors.good, warn: colors.warn, bad: colors.bad }[tone];

  return (
    <Svg width={width} height={height}>
      {/* The 80% line, so the sparkline reads against the same bar as the
          badge rather than floating on an unlabelled axis. */}
      <Line x1={0} x2={width} y1={y(0.8)} y2={y(0.8)} stroke={colors.border} strokeWidth={1} strokeDasharray="2 3" />
      <Path d={d} stroke={stroke} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={width} cy={y(points[points.length - 1])} r={2.5} fill={stroke} />
    </Svg>
  );
}

function monthDay(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}`;
}
