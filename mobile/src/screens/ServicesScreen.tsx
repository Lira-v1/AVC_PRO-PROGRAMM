import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ChatMasterEngine, type ChatMasterDebugTrace, type ChatMessage, type OrderAssistantPayload } from '../chatmaster';
import { calculateEstimatePrice, TariffType } from '../services/estimates';

type ArrivalOption = 'now' | 'hour' | 'today' | 'scheduled' | null;

type DraftWork = {
  category: string;
  workType: string;
  title: string;
  confirmed: boolean;
};

type OrderDraft = {
  works: DraftWork[];
  categorySuggestions: string[];
  comment: string;
  needMaterials: boolean;
  materialsComment: string;
  arrivalTime: string | null;
  tariff: TariffType;
  photos: Array<{ id: string; source: 'camera' | 'gallery' }>;
  estimatedPrice: number | null;
};

const createMessage = (role: ChatMessage['role'], text: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  text,
  createdAt: new Date().toISOString(),
});

const INITIAL_DRAFT: OrderDraft = {
  works: [],
  categorySuggestions: [],
  comment: '',
  needMaterials: false,
  materialsComment: '',
  arrivalTime: null,
  tariff: 'economy',
  photos: [],
  estimatedPrice: null,
};

const buildWorkKey = (work: Pick<DraftWork, 'category' | 'workType'>) => `${work.category}:${work.workType}`;

const applyChatSuggestionsToOrderDraft = (draft: OrderDraft, payload: OrderAssistantPayload): OrderDraft => {
  const nextWorks = [...draft.works];
  const suggestionKeys = new Set(payload.suggestions.map((item) => `${item.category}:${item.workType}`));

  if (payload.action === 'remove') {
    const filtered = nextWorks.filter((work) => !suggestionKeys.has(buildWorkKey(work)));

    return {
      ...draft,
      works: filtered,
      categorySuggestions: Array.from(new Set([...draft.categorySuggestions, ...payload.categorySuggestions])),
    };
  }

  payload.suggestions.forEach((suggestion) => {
    const key = `${suggestion.category}:${suggestion.workType}`;
    const exists = nextWorks.some((work) => buildWorkKey(work) === key);

    if (!exists) {
      nextWorks.push({
        category: suggestion.category,
        workType: suggestion.workType,
        title: suggestion.title,
        confirmed: true,
      });
    }
  });

  return {
    ...draft,
    works: nextWorks,
    categorySuggestions: Array.from(new Set([...draft.categorySuggestions, ...payload.categorySuggestions])),
  };
};

const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const ServicesScreen = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', 'Опишите задачу, и я помогу собрать заявку. Например: «нужно поменять розетку и смеситель».')
  ]);
  const [input, setInput] = useState('');
  const [pendingSuggestions, setPendingSuggestions] = useState<OrderAssistantPayload | null>(null);
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(INITIAL_DRAFT);
  const [arrivalOption, setArrivalOption] = useState<ArrivalOption>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [developerMode, setDeveloperMode] = useState(false);
  const [debugHistory, setDebugHistory] = useState<ChatMasterDebugTrace[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const estimatedPrice = useMemo(() => {
    if (orderDraft.works.length === 0) {
      return null;
    }

    return orderDraft.works.reduce((sum, work) => {
      const estimate = calculateEstimatePrice({ category: work.category, workType: work.workType, tariff: orderDraft.tariff });
      return sum + (estimate?.finalPrice ?? 0);
    }, 0);
  }, [orderDraft.tariff, orderDraft.works]);

  const onSend = () => {
    const userText = input.trim();
    if (!userText) {
      return;
    }

    const userMessage = createMessage('user', userText);
    const response = ChatMasterEngine.processUserMessage(userText, { context: 'order_assistant' });
    const assistantMessage = createMessage('assistant', response.reply);

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setPendingSuggestions(response.orderAssistantPayload);
    setDebugHistory((prev) => [...prev, response.debug]);
    setInput('');

    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const onConfirmSuggestions = (confirmed: boolean) => {
    if (!pendingSuggestions) {
      return;
    }

    if (confirmed) {
      setOrderDraft((prev) => applyChatSuggestionsToOrderDraft(prev, pendingSuggestions));
      setMessages((prev) => [...prev, createMessage('assistant', 'Отлично, добавил в черновик. Когда нужен мастер? Нужны материалы?')]);
    } else {
      setMessages((prev) => [...prev, createMessage('assistant', 'Понял. Уточните, пожалуйста, какие работы оставить или добавить.')]);
    }

    setPendingSuggestions(null);
  };

  const updateWorkTitle = (index: number, title: string) => {
    setOrderDraft((prev) => ({
      ...prev,
      works: prev.works.map((work, workIndex) => (workIndex === index ? { ...work, title } : work)),
    }));
  };

  const removeWork = (index: number) => {
    setOrderDraft((prev) => ({
      ...prev,
      works: prev.works.filter((_, workIndex) => workIndex !== index),
    }));
  };

  const addPhoto = (source: 'camera' | 'gallery') => {
    if (orderDraft.photos.length >= 3) {
      return;
    }

    setOrderDraft((prev) => ({
      ...prev,
      photos: [...prev.photos, { id: `${source}-${Date.now()}`, source }],
    }));
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Создать заказ" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.chatCard}>
          <Text style={styles.cardTitle}>ChatMaster</Text>
          {messages.map((message) => (
            <View key={message.id} style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={styles.messageText}>{message.text}</Text>
              <Text style={styles.messageTime}>{formatTime(message.createdAt)}</Text>
            </View>
          ))}

          {pendingSuggestions ? (
            <View style={styles.quickActions}>
              <Pressable style={[styles.quickButton, styles.quickButtonPrimary]} onPress={() => onConfirmSuggestions(true)}>
                <Text style={styles.quickButtonPrimaryText}>Да</Text>
              </Pressable>
              <Pressable style={styles.quickButton} onPress={() => onConfirmSuggestions(false)}>
                <Text style={styles.quickButtonText}>Нет</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Напишите задачу..."
              placeholderTextColor="#8A94A6"
              multiline
            />
            <Pressable style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} onPress={onSend} disabled={!canSend}>
              <Text style={styles.sendText}>Отправить</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Черновик заказа</Text>

          <Text style={styles.blockTitle}>Работы</Text>
          {orderDraft.works.length === 0 ? <Text style={styles.placeholderText}>Работы пока не добавлены.</Text> : null}
          {orderDraft.works.map((work, index) => (
            <View key={`${work.category}-${work.workType}-${index}`} style={styles.workRow}>
              <View style={styles.workMeta}>
                <Text style={styles.workCategory}>{work.category}</Text>
                <Text style={styles.workType}>{work.workType}</Text>
              </View>
              <TextInput value={work.title} onChangeText={(value) => updateWorkTitle(index, value)} style={styles.workInput} />
              <Pressable onPress={() => removeWork(index)}>
                <Text style={styles.removeText}>Удалить</Text>
              </Pressable>
            </View>
          ))}

          <Text style={styles.blockTitle}>Комментарий</Text>
          <TextInput
            style={styles.fieldInput}
            value={orderDraft.comment}
            onChangeText={(value) => setOrderDraft((prev) => ({ ...prev, comment: value }))}
            placeholder="Дополнительные детали"
            placeholderTextColor="#91A0BB"
          />

          <Text style={styles.blockTitle}>Когда нужен мастер</Text>
          <View style={styles.rowWrap}>
            {[
              { id: 'now', label: 'Сейчас' },
              { id: 'hour', label: 'В течение часа' },
              { id: 'today', label: 'Сегодня' },
              { id: 'scheduled', label: 'К назначенному времени' },
            ].map((item) => {
              const active = arrivalOption === item.id;
              return (
                <Pressable key={item.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setArrivalOption(item.id as ArrivalOption)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {arrivalOption === 'scheduled' ? (
            <View style={styles.rowWrap}>
              <TextInput style={styles.halfInput} value={scheduledDate} onChangeText={setScheduledDate} placeholder="Дата" placeholderTextColor="#91A0BB" />
              <TextInput style={styles.halfInput} value={scheduledTime} onChangeText={setScheduledTime} placeholder="Время" placeholderTextColor="#91A0BB" />
            </View>
          ) : null}

          <Text style={styles.blockTitle}>Материалы</Text>
          <Pressable
            style={styles.toggleRow}
            onPress={() => setOrderDraft((prev) => ({ ...prev, needMaterials: !prev.needMaterials }))}
          >
            <View style={[styles.checkbox, orderDraft.needMaterials && styles.checkboxActive]}>{orderDraft.needMaterials ? <Text>✓</Text> : null}</View>
            <Text>Нужно закупить материалы</Text>
          </Pressable>
          {orderDraft.needMaterials ? (
            <TextInput
              style={styles.fieldInput}
              value={orderDraft.materialsComment}
              onChangeText={(value) => setOrderDraft((prev) => ({ ...prev, materialsComment: value }))}
              placeholder="Какие материалы нужны"
              placeholderTextColor="#91A0BB"
            />
          ) : null}

          <Text style={styles.blockTitle}>Фото</Text>
          <View style={styles.rowWrap}>
            <Pressable style={styles.chip} onPress={() => addPhoto('camera')}>
              <Text style={styles.chipText}>Камера</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => addPhoto('gallery')}>
              <Text style={styles.chipText}>Галерея</Text>
            </Pressable>
          </View>
          <Text style={styles.placeholderText}>Добавлено фото: {orderDraft.photos.length}/3</Text>

          <Text style={styles.blockTitle}>Тариф</Text>
          <View style={styles.rowWrap}>
            {(['economy', 'comfort', 'business'] as TariffType[]).map((tariff) => {
              const active = orderDraft.tariff === tariff;
              return (
                <Pressable key={tariff} style={[styles.chip, active && styles.chipActive]} onPress={() => setOrderDraft((prev) => ({ ...prev, tariff }))}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{tariff}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.blockTitle}>Предварительная цена</Text>
          <Text style={styles.priceText}>{estimatedPrice ? `${estimatedPrice} KZT` : 'Цена уточняется'}</Text>

          <Pressable style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Создать заказ</Text>
          </Pressable>
        </View>

        <Pressable style={[styles.devToggle, developerMode && styles.devToggleActive]} onPress={() => setDeveloperMode((value) => !value)}>
          <Text style={styles.devToggleText}>{developerMode ? 'Developer mode: ВКЛ' : 'Developer mode: ВЫКЛ'}</Text>
        </Pressable>

        {developerMode ? (
          <View style={styles.devPanel}>
            <Text style={styles.devPanelTitle}>Отладка order_assistant</Text>
            <Text style={styles.devLine}>categorySuggestions: {JSON.stringify(orderDraft.categorySuggestions)}</Text>
            <Text style={styles.devLine}>pendingSuggestions: {JSON.stringify(pendingSuggestions)}</Text>
            {debugHistory.slice(-3).map((trace, index) => (
              <Text key={`${trace.userMessage}-${index}`} style={styles.devLine}>
                {index + 1}. {trace.userMessage} → {trace.resolvedCategory ?? 'unknown'} / {trace.resolvedWorkType ?? 'unknown'}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  content: { padding: 14, gap: 12, paddingBottom: 30 },
  chatCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 8 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1B2A45' },
  messageBubble: { borderRadius: 10, padding: 10, maxWidth: '90%' },
  assistantBubble: { backgroundColor: '#F5F8FF', alignSelf: 'flex-start' },
  userBubble: { backgroundColor: '#DCE9FF', alignSelf: 'flex-end' },
  messageText: { color: '#1B2A45', fontSize: 14 },
  messageTime: { marginTop: 4, fontSize: 11, color: '#74819A' },
  quickActions: { flexDirection: 'row', gap: 8 },
  quickButton: { borderWidth: 1, borderColor: '#C7D4EC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  quickButtonPrimary: { backgroundColor: '#0E5BF2', borderColor: '#0E5BF2' },
  quickButtonText: { color: '#33415C', fontWeight: '600' },
  quickButtonPrimaryText: { color: '#fff', fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#1B2A45',
    backgroundColor: '#FAFCFF',
  },
  sendButton: { backgroundColor: '#0E5BF2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
  blockTitle: { marginTop: 12, marginBottom: 8, fontSize: 15, fontWeight: '700', color: '#1B2A45' },
  placeholderText: { color: '#74819A' },
  workRow: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, padding: 10, marginBottom: 8, gap: 6 },
  workMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  workCategory: { color: '#1B2A45', fontWeight: '700', textTransform: 'capitalize' },
  workType: { color: '#61708D' },
  workInput: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 8, paddingHorizontal: 10, minHeight: 38, color: '#1B2A45' },
  removeText: { color: '#C63E3E', fontWeight: '600' },
  fieldInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#1B2A45',
    backgroundColor: '#FAFCFF',
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive: { borderColor: '#0E5BF2', backgroundColor: '#EEF3FF' },
  chipText: { color: '#45536E', fontWeight: '600' },
  chipTextActive: { color: '#0E5BF2' },
  halfInput: {
    flex: 1,
    minWidth: 120,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#1B2A45',
    backgroundColor: '#FAFCFF',
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#EEF3FF', borderColor: '#0E5BF2' },
  priceText: { color: '#1B2A45', fontSize: 18, fontWeight: '700' },
  submitButton: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E5BF2',
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  devToggle: { backgroundColor: '#D9E6FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  devToggleActive: { backgroundColor: '#B9D0FF' },
  devToggleText: { color: '#15305E', fontWeight: '600' },
  devPanel: { backgroundColor: '#0F172A', borderRadius: 12, padding: 10, gap: 6 },
  devPanelTitle: { color: '#DDE7FF', fontWeight: '700' },
  devLine: { color: '#DDE7FF', fontSize: 12 },
});
