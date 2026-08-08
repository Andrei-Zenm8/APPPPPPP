import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENT_MAX_WIDTH, CONTENT_MAX_WIDTH_WIDE, elevate, radius, space, type as typeScale, useTheme } from '../theme';

/** ————— Text ————— */

type Variant = keyof typeof typeScale;
type Tone = 'default' | 'muted' | 'faint' | 'accent' | 'good' | 'warn' | 'bad' | 'inverse';

export function T({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const { colors } = useTheme();
  const toneColor = {
    default: colors.ink,
    muted: colors.inkMuted,
    faint: colors.inkFaint,
    accent: colors.accent,
    good: colors.good,
    warn: colors.warn,
    bad: colors.bad,
    inverse: colors.accentInk,
  }[tone];
  return <Text {...rest} style={[typeScale[variant], { color: toneColor }, style]} />;
}

/** ————— Layout ————— */

export function Screen({
  children,
  scroll = true,
  footer,
  wide = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  /** Opt a screen into the roomier desktop measure. Reserved for list and
   *  dashboard screens; reading-heavy screens stay at the narrow measure
   *  because a 1400px-wide paragraph is unreadable at any resolution. */
  wide?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxWidth = wide && width >= 1100 ? CONTENT_MAX_WIDTH_WIDE : CONTENT_MAX_WIDTH;
  const gutter = width >= 900 ? space.xxl : space.lg;

  const body = (
    <View style={[styles.center, { paddingHorizontal: gutter }]}>
      <View style={{ width: '100%', maxWidth }}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.canvas }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer}
    </SafeAreaView>
  );
}

export function Stack({ gap = space.md, style, ...rest }: ViewProps & { gap?: number }) {
  return <View {...rest} style={[{ gap }, style]} />;
}

export function Row({
  gap = space.sm,
  align = 'center',
  style,
  ...rest
}: ViewProps & { gap?: number; align?: ViewStyle['alignItems'] }) {
  return <View {...rest} style={[{ flexDirection: 'row', alignItems: align, gap }, style]} />;
}

export function Spacer({ h = space.lg }: { h?: number }) {
  return <View style={{ height: h }} />;
}

/** ————— Surfaces ————— */

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
}) {
  const { colors } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: padded ? space.lg : 0,
    ...(elevate(colors, 1) as ViewStyle),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginBottom: space.sm, marginTop: space.lg }}>
      <T variant="caption" tone="faint" style={{ textTransform: 'uppercase' }}>
        {title}
      </T>
      {action}
    </Row>
  );
}

/** ————— Controls ————— */

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  full,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
}) {
  const { colors } = useTheme();
  const bg = {
    primary: colors.accent,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
    danger: colors.badSoft,
  }[kind];
  const fg = {
    primary: colors.accentInk,
    secondary: colors.ink,
    ghost: colors.accent,
    danger: colors.bad,
  }[kind];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingVertical: space.md,
          paddingHorizontal: space.xl,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          borderWidth: kind === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border,
          minHeight: 44,
        },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <T variant="label" style={{ color: fg }}>{label}</T>}
    </Pressable>
  );
}

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'bad';
}) {
  const { colors } = useTheme();
  const map = {
    neutral: [colors.surfaceAlt, colors.inkMuted],
    accent: [colors.accentSoft, colors.accent],
    good: [colors.goodSoft, colors.good],
    warn: [colors.warnSoft, colors.warn],
    bad: [colors.badSoft, colors.bad],
  }[tone];
  return (
    <View
      style={{
        backgroundColor: map[0],
        paddingHorizontal: space.sm + 2,
        paddingVertical: 3,
        borderRadius: radius.pill,
      }}
    >
      <T variant="caption" style={{ color: map[1] }}>
        {label}
      </T>
    </View>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.pill,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: active ? colors.surface : 'transparent',
              minHeight: 44,
              justifyContent: 'center',
            }}
          >
            <T variant="label" tone={active ? 'default' : 'muted'}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
      <T variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </T>
      <Spacer h={space.xs} />
      <T variant="body" tone="muted" style={{ textAlign: 'center' }}>
        {body}
      </T>
    </Card>
  );
}

export function Avatar({ name, tint, size = 40 }: { name: string; tint: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${tint}22`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: tint, fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', width: '100%' },
});
