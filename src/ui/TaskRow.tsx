import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { TaskInstance } from '../domain/types';
import { radius, space, useTheme } from '../theme';
import { Divider, Pill, Row, Stack, T } from './index';
import { Icon } from './icons';

const KIND_LABEL: Record<string, string> = {
  medication: 'Medication',
  supplement: 'Supplement',
  exercise: 'Exercise',
  habit: 'Habit',
  measurement: 'Check-in',
};

/**
 * The single most-used control in the app. Design constraints, in order:
 *  1. One tap to complete — no confirmation, no navigation, fully undoable.
 *  2. The clinician's rationale is one tap away, never hidden behind a screen.
 *  3. A completed task stays visible and legible; it is evidence, not clutter.
 */
export function TaskRow({
  task,
  onToggle,
  onMeasure,
}: {
  task: TaskInstance;
  onToggle: () => void;
  onMeasure?: () => void;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const done = task.entry?.status === 'done';
  const rx = task.prescription;
  const isMeasurement = rx.kind === 'measurement';

  const primaryAction = isMeasurement && !done && onMeasure ? onMeasure : onToggle;

  return (
    <View>
      <Row align="flex-start" gap={space.md} style={{ paddingVertical: space.md }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`${rx.title}${done ? ', completed' : ''}`}
          onPress={primaryAction}
          hitSlop={8}
          style={({ pressed }) => [
            {
              width: 28,
              height: 28,
              borderRadius: 9,
              borderWidth: done ? 0 : 1.8,
              borderColor: colors.borderStrong,
              backgroundColor: done ? colors.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
              transform: [{ scale: pressed ? 0.9 : 1 }],
            },
          ]}
        >
          {done && <Icon name="check" size={17} color={colors.accentInk} />}
        </Pressable>

        <View style={{ flex: 1 }}>
          {/* Pressing the row body performs the task's primary action — for a
              check-in that is opening the logger, not reading the rationale.
              "Why?" is a separate, smaller target so the two never compete. */}
          <Pressable
            onPress={primaryAction}
            accessibilityRole="button"
            accessibilityLabel={isMeasurement && !done ? `Log ${rx.title}` : rx.title}
          >
            <Stack gap={4}>
              <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
                <T
                  variant="heading"
                  tone={done ? 'faint' : 'default'}
                  style={done ? { textDecorationLine: 'line-through' } : undefined}
                >
                  {rx.title}
                </T>
                {!!rx.dose && <Pill label={rx.dose} />}
              </Row>
            </Stack>
          </Pressable>

          <Row gap={space.md} style={{ marginTop: 4 }}>
            <T variant="caption" tone="faint">
              {KIND_LABEL[rx.kind] ?? rx.kind}
            </T>
            {isMeasurement &&
              (task.entry?.value !== undefined ? (
                <T variant="caption" tone="accent">
                  {`logged ${task.entry.value}${rx.metric?.unit ?? ''}`}
                </T>
              ) : (
                <T variant="caption" tone="accent">
                  Tap to log
                </T>
              ))}
            <Pressable
              onPress={() => setExpanded((e) => !e)}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Hide reason' : `Why am I doing ${rx.title}?`}
              hitSlop={8}
            >
              <T variant="caption" tone="accent">
                {expanded ? 'Hide reason' : 'Why?'}
              </T>
            </Pressable>
          </Row>

          {expanded && (
            <View
              style={{
                marginTop: space.sm,
                backgroundColor: colors.accentSoft,
                padding: space.md,
                borderRadius: radius.md,
              }}
            >
              <T variant="body" style={{ color: colors.accent }}>
                {rx.rationale}
              </T>
            </View>
          )}
        </View>
      </Row>
      <Divider />
    </View>
  );
}

export const rowStyles = StyleSheet.create({ hairline: { height: Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth } });
