import React from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { radius, space, useTheme } from '../theme';
import { Button, Row, Stack, T } from './index';

/**
 * Bottom sheet on touch devices, centred dialog on desktop.
 *
 * One component for every transient flow in the app so they share dismissal
 * behaviour, escape handling and safe-area padding — modals are where
 * cross-platform apps usually fall apart, and having four hand-rolled ones
 * guarantees four different bugs.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const isWide = Platform.OS === 'web';

  if (!visible) return null;

  return (
    <Modal visible transparent animationType={isWide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: '#00000070',
          justifyContent: isWide ? 'center' : 'flex-end',
          alignItems: 'center',
          padding: isWide ? space.xl : 0,
        }}
      >
        <Pressable
          // Stops a tap inside the sheet from dismissing it.
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderRadius: isWide ? radius.xl : 0,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            width: '100%',
            maxWidth: 560,
            maxHeight: '86%',
            paddingTop: space.xl,
            paddingHorizontal: space.xl,
            paddingBottom: Platform.OS === 'ios' ? space.xxxl : space.xl,
          }}
        >
          <Stack gap={space.xs} style={{ marginBottom: space.lg }}>
            <T variant="title">{title}</T>
            {!!subtitle && (
              <T variant="body" tone="muted">
                {subtitle}
              </T>
            )}
          </Stack>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            // Visible on web: a clipped control at the fold otherwise reads as
            // broken layout rather than as more content below.
            showsVerticalScrollIndicator={Platform.OS === 'web'}
            // Breathing room so the last control never sits under the footer.
            contentContainerStyle={{ paddingBottom: space.sm }}
          >
            {children}
          </ScrollView>

          {footer && <View style={{ marginTop: space.lg }}>{footer}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Destructive-action guard. Used for anything a clinician cannot undo from the
 * screen they are on — cancelling a patient's visit, discontinuing part of a
 * program.
 */
export function Confirm({
  visible,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title={title}
      subtitle={body}
      footer={
        // The safe choice is the wide, default target; the destructive one is
        // deliberately the smaller of the two.
        <Row gap={space.sm}>
          <Button label={confirmLabel} kind="danger" onPress={onConfirm} />
          <View style={{ flex: 1 }}>
            <Button label="Keep it" full onPress={onCancel} />
          </View>
        </Row>
      }
    />
  );
}
