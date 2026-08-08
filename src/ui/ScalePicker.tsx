import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { radius, space, useTheme } from '../theme';
import { Row, Stack, T } from './index';

/**
 * Discrete value picker for patient-reported outcomes.
 *
 * A slider would be the obvious choice and is the wrong one: a 0–10 pain score
 * is an ordinal scale, not a continuous one, and sliders invite imprecise
 * dragging that makes the resulting trend line noisier than the underlying
 * symptom. Discrete targets also stay usable with a tremor or a gloved hand.
 */
export function ScalePicker({
  min,
  max,
  value,
  unit,
  lowLabel,
  highLabel,
  onChange,
}: {
  min: number;
  max: number;
  value: number | null;
  unit?: string;
  lowLabel?: string;
  highLabel?: string;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  const span = max - min;
  // Keep the number of taps sane for wide ranges (e.g. 60–180°).
  const step = span > 20 ? Math.ceil(span / 20) : 1;
  const values: number[] = [];
  for (let v = min; v <= max; v += step) values.push(v);

  return (
    <Stack gap={space.sm}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {values.map((v) => {
          const active = value === v;
          return (
            <Pressable
              key={v}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${v}${unit ?? ''}`}
              onPress={() => onChange(v)}
              style={({ pressed }) => ({
                minWidth: 46,
                height: 46,
                paddingHorizontal: space.sm,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? colors.accent : colors.surfaceAlt,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <T variant="heading" style={{ color: active ? colors.accentInk : colors.inkMuted }}>
                {v}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>
      {(lowLabel || highLabel) && (
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="caption" tone="faint">
            {lowLabel}
          </T>
          <T variant="caption" tone="faint">
            {highLabel}
          </T>
        </Row>
      )}
      <View />
    </Stack>
  );
}
