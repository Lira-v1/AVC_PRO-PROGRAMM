import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ChatMasterEngine, type ChatMasterDebugTrace, type ChatMessage } from '../chatmaster';

const createMessage = (role: ChatMessage['role'], text: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  text,
  createdAt: new Date().toISOString(),
});

const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const ChatMasterScreen = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('system', 'Привет! Я ChatMaster. Опишите задачу, и я передам запрос в SmetMaster.'),
  ]);
  const [input, setInput] = useState('');
  const [developerMode, setDeveloperMode] = useState(false);
  const [debugHistory, setDebugHistory] = useState<ChatMasterDebugTrace[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const onSend = () => {
    const userText = input.trim();
    if (!userText) {
      return;
    }

    const userMessage = createMessage('user', userText);
    const chatResponse = ChatMasterEngine.processUserMessage(userText);
    const assistantMessage = createMessage('assistant', chatResponse.reply);

    setMessages((previous) => [...previous, userMessage, assistantMessage]);
    setDebugHistory((previous) => [...previous, chatResponse.debug]);
    setInput('');

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="ChatMaster" />
      <View style={styles.content}>
        <Pressable style={[styles.devToggle, developerMode && styles.devToggleActive]} onPress={() => setDeveloperMode((value) => !value)}>
          <Text style={styles.devToggleText}>{developerMode ? 'Режим разработчика: ВКЛ' : 'Режим разработчика: ВЫКЛ'}</Text>
        </Pressable>

        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View key={message.id} style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={styles.messageRole}>{message.role}</Text>
              <Text style={styles.messageText}>{message.text}</Text>
              <Text style={styles.messageTime}>{formatTime(message.createdAt)}</Text>
            </View>
          ))}

          {developerMode ? (
            <View style={styles.devPanel}>
              <Text style={styles.devPanelTitle}>Developer mode: цепочка обработки</Text>
              {debugHistory.length === 0 ? (
                <Text style={styles.devValue}>Пока нет запросов.</Text>
              ) : (
                debugHistory.map((trace, index) => (
                  <View key={`${trace.userMessage}-${index}`} style={styles.devCard}>
                    <Text style={styles.devCardTitle}>Запрос #{index + 1}</Text>
                    <Text style={styles.devField}>userMessage: <Text style={styles.devValue}>{trace.userMessage || 'undefined'}</Text></Text>
                    <Text style={styles.devField}>resolvedIntent: <Text style={styles.devValue}>{trace.resolvedIntent ?? 'undefined'}</Text></Text>
                    <Text style={styles.devField}>resolvedCategory: <Text style={styles.devValue}>{trace.resolvedCategory ?? 'undefined'}</Text></Text>
                    <Text style={styles.devField}>resolvedWorkType: <Text style={styles.devValue}>{trace.resolvedWorkType ?? 'undefined'}</Text></Text>
                    <Text style={styles.devField}>smetMasterRequest:</Text>
                    <Text style={styles.devJson}>{trace.smetMasterRequest ? JSON.stringify(trace.smetMasterRequest, null, 2) : 'undefined'}</Text>
                    <Text style={styles.devField}>smetMasterResponse:</Text>
                    <Text style={styles.devJson}>{trace.smetMasterResponse ? JSON.stringify(trace.smetMasterResponse, null, 2) : 'undefined'}</Text>
                    <Text style={styles.devField}>finalChatReply: <Text style={styles.devValue}>{trace.finalChatReply || 'undefined'}</Text></Text>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Например: нужно поменять розетку"
            placeholderTextColor="#8A94A6"
            style={styles.input}
            multiline
          />
          <Pressable style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} onPress={onSend} disabled={!canSend}>
            <Text style={styles.sendText}>Отправить</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5FA' },
  content: { flex: 1, padding: 12, gap: 10 },
  devToggle: {
    backgroundColor: '#D9E6FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  devToggleActive: {
    backgroundColor: '#B9D0FF',
  },
  devToggleText: {
    color: '#15305E',
    fontWeight: '600',
  },
  chatScroll: { flex: 1 },
  chatContent: { gap: 8, paddingBottom: 4 },
  messageBubble: { borderRadius: 12, padding: 10, maxWidth: '90%' },
  assistantBubble: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start' },
  userBubble: { backgroundColor: '#DDEAFF', alignSelf: 'flex-end' },
  messageRole: { fontSize: 12, fontWeight: '700', color: '#4E5A73', marginBottom: 4 },
  messageText: { fontSize: 15, color: '#1B2333' },
  messageTime: { marginTop: 6, fontSize: 11, color: '#7E8799' },
  devPanel: { marginTop: 10, backgroundColor: '#0F172A', borderRadius: 12, padding: 10, gap: 8 },
  devPanelTitle: { color: '#DDE7FF', fontWeight: '700' },
  devCard: { backgroundColor: '#1E293B', borderRadius: 8, padding: 8, gap: 4 },
  devCardTitle: { color: '#9FC1FF', fontWeight: '700' },
  devField: { color: '#DDE7FF', fontSize: 12 },
  devValue: { color: '#FFFFFF' },
  devJson: { color: '#EAB308', fontSize: 11 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#101623',
  },
  sendButton: {
    backgroundColor: '#0E5BF2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
});
