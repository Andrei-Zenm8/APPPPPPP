import { Slot, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, useTheme } from '../theme';
import { T } from './index';
import { Icon, IconName } from './icons';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/**
 * One navigation component for every form factor.
 *
 * Below 900px (phones, small tablets) the app uses a thumb-reachable bottom
 * bar. At or above it — iPad landscape, Windows, macOS, browser — that bar
 * becomes a left rail, because a bottom bar on a 27" monitor puts the primary
 * navigation as far from the pointer as it can physically get.
 */
export function AppShell({ items, title }: { items: NavItem[]; title: string }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  return wide ? <WideShell items={items} title={title} /> : <NarrowShell items={items} />;
}

function useActive(items: NavItem[]) {
  const pathname = usePathname();
  // Longest matching prefix wins, so a detail route keeps its parent tab lit.
  return items.reduce<string | null>((best, item) => {
    if (!pathname.startsWith(item.href)) return best;
    if (!best || item.href.length > best.length) return item.href;
    return best;
  }, null);
}

function NarrowShell({ items }: { items: NavItem[] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const active = useActive(items);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, space.sm),
          paddingTop: space.sm,
          paddingHorizontal: space.sm,
        }}
      >
        {items.map((item) => {
          const isActive = active === item.href;
          return (
            <Pressable
              key={item.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
              onPress={() => router.replace(item.href as never)}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                gap: 3,
                paddingVertical: space.xs,
                opacity: pressed ? 0.6 : 1,
                minHeight: 48,
              })}
            >
              <Icon name={item.icon} color={isActive ? colors.accent : colors.inkFaint} filled={isActive} />
              <T variant="caption" tone={isActive ? 'accent' : 'faint'}>
                {item.label}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function WideShell({ items, title }: { items: NavItem[]; title: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const active = useActive(items);

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.canvas }}>
      <View
        style={{
          width: 236,
          backgroundColor: colors.surface,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: colors.border,
          paddingTop: space.xxl,
          paddingHorizontal: space.md,
          gap: space.xs,
        }}
      >
        <View style={{ paddingHorizontal: space.md, marginBottom: space.xl }}>
          <T variant="title" tone="accent">
            Apol
          </T>
          <T variant="caption" tone="faint">
            {title}
          </T>
        </View>

        {items.map((item) => {
          const isActive = active === item.href;
          return (
            <Pressable
              key={item.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => router.replace(item.href as never)}
              style={({ pressed, hovered }: any) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingVertical: space.md,
                paddingHorizontal: space.md,
                borderRadius: radius.md,
                backgroundColor: isActive
                  ? colors.accentSoft
                  : hovered || pressed
                    ? colors.surfaceAlt
                    : 'transparent',
              })}
            >
              <Icon name={item.icon} size={20} color={isActive ? colors.accent : colors.inkMuted} filled={isActive} />
              <T variant="label" tone={isActive ? 'accent' : 'muted'}>
                {item.label}
              </T>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}

export const isDesktopWeb = Platform.OS === 'web';
