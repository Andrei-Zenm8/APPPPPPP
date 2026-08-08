import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { formatDateTime } from '../domain/date';
import { messagesFor } from '../domain/selectors';
import type { Role } from '../domain/types';
import { useStore } from '../store';
import { radius, space, useTheme } from '../theme';
import { Button, Card, Row, Stack, T } from './index';
import { Input } from './PrescriptionForm';

/**
 * One thread per patient, shared by both roles.
 *
 * Without a reply channel the app is a one-way instruction sheet: a patient who
 * cannot do something has no way to say so, and the clinician's only signal is
 * a silent gap in the log. This is deliberately not a chat product — it is the
 * shortest path from "I have a problem with my program" to the person who can
 * change the program.
 */
export function MessageThread({ patientId, role }: { patientId: string; role: Role }) {
  const { state, sendMessage, markThreadRead } = useStore();
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollView>(null);

  const messages = messagesFor(state, patientId);

  // Opening the thread is what marks it read — not receiving it.
  useEffect(() => {
    markThreadRead(patientId, role);
  }, [patientId, role, messages.length]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    sendMessage({ patientId, from: role, body });
    setDraft('');
    requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Card>
        <ScrollView
          ref={scroller}
          style={{ maxHeight: 360 }}
          contentContainerStyle={{ gap: space.md, paddingVertical: space.xs }}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <T variant="body" tone="muted">
              {role === 'patient'
                ? 'No messages yet. If something in your program is not working — too painful, no time, no equipment — say so here.'
                : 'No messages yet with this patient.'}
            </T>
          ) : (
            messages.map((m) => {
              const mine = m.from === role;
              return (
                <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  <View
                    style={{
                      maxWidth: '86%',
                      backgroundColor: mine ? colors.accent : colors.surfaceAlt,
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm + 2,
                      borderRadius: radius.lg,
                      borderBottomRightRadius: mine ? radius.sm : radius.lg,
                      borderBottomLeftRadius: mine ? radius.lg : radius.sm,
                    }}
                  >
                    <T variant="body" style={{ color: mine ? colors.accentInk : colors.ink }}>
                      {m.body}
                    </T>
                  </View>
                  <T variant="caption" tone="faint" style={{ marginTop: 3 }}>
                    {formatDateTime(m.sentAt)}
                  </T>
                </View>
              );
            })
          )}
        </ScrollView>

        <Stack gap={space.sm} style={{ marginTop: space.lg }}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder={role === 'patient' ? 'Tell your specialist what is going on…' : 'Reply to your patient…'}
            multiline
          />
          <Row style={{ justifyContent: 'flex-end' }}>
            <Button label="Send" disabled={!draft.trim()} onPress={send} />
          </Row>
        </Stack>
      </Card>
    </KeyboardAvoidingView>
  );
}
