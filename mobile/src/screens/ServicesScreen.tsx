import React, { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ChatMasterEngine, type ChatMasterDebugTrace, type ChatMessage, type OrderAssistantPayload } from '../chatmaster';
import { SmetMasterEngine } from '../smetmaster';
import { getAvailableCategories, getEstimatesByCategory } from '../smetmaster/repositories/estimateRepository';
import type { TariffType } from '../smetmaster/types/SmetMasterTypes';

type ArrivalOption = 'now' | 'today' | 'tomorrow' | 'scheduled' | null;

type DraftWork = {
  category: string;
  workType: string;
  title: string;
  confirmed: boolean;
  quantity: number;
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
};

type SelectorState =
  | { type: 'category'; workIndex: number }
  | { type: 'workType'; workIndex: number }
  | { type: 'arrival' }
  | { type: 'confirm' }
  | null;

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: 'Сантехника',
  plumber: 'Сантехника',
  electrician: 'Электрика',
  welder: 'Сварщик',
  handyman: 'Хендимен / Мастер-универсал',
  cleaning: 'Клининг',
  finishing: 'Отделочные работы',
  general_construction: 'Общестроительные работы',
};

const ARRIVAL_LABELS: Record<Exclude<ArrivalOption, null>, string> = {
  now: 'Сейчас',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  scheduled: 'К определённому времени',
};

const TARIFF_LABELS: Record<TariffType, string> = {
  economy: 'Эконом',
  comfort: 'Комфорт',
  business: 'Бизнес',
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
};

const buildWorkKey = (work: Pick<DraftWork, 'category' | 'workType'>) => `${work.category}:${work.workType}`;

const getCategoryLabel = (category: string) => CATEGORY_LABELS[category] ?? category;

const getArrivalLabel = (arrivalOption: ArrivalOption, arrivalTime: string | null) => {
  if (!arrivalOption) {
    return 'Не выбрано';
  }

  if (arrivalOption !== 'scheduled') {
    return ARRIVAL_LABELS[arrivalOption];
  }

  return arrivalTime ? `К определённому времени (${arrivalTime})` : ARRIVAL_LABELS.scheduled;
};

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
        quantity: 1,
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
    createMessage('assistant', 'Опишите задачу, и я помогу собрать заказ. Например: «нужно поменять розетку и смеситель».')
  ]);
  const [input, setInput] = useState('');
  const [pendingSuggestions, setPendingSuggestions] = useState<OrderAssistantPayload | null>(null);
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(INITIAL_DRAFT);
  const [arrivalOption, setArrivalOption] = useState<ArrivalOption>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectorState, setSelectorState] = useState<SelectorState>(null);
  const [developerMode, setDeveloperMode] = useState(false);
  const [debugHistory, setDebugHistory] = useState<ChatMasterDebugTrace[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);
  const availableCategories = useMemo(() => getAvailableCategories(), []);

  const worksWithPrice = useMemo(
    () =>
      orderDraft.works.map((work) => {
        const estimateResult = SmetMasterEngine.calculateEstimate({
          category: work.category,
          workType: work.workType,
          tariff: orderDraft.tariff,
        });
        const unit = estimateResult?.estimate.items[0]?.unit ?? 'ед.';
        const linePrice = estimateResult ? estimateResult.finalPrice * work.quantity : 0;

        return {
          ...work,
          unit,
          estimateResult,
          linePrice,
        };
      }),
    [orderDraft.tariff, orderDraft.works],
  );

  const estimatedPrice = useMemo(
    () => worksWithPrice.reduce((sum, work) => sum + work.linePrice, 0),
    [worksWithPrice],
  );

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
      setMessages((prev) => [...prev, createMessage('assistant', 'Добавил в черновик. Можно дополнить или отредактировать поля выше.')]);
    } else {
      setMessages((prev) => [...prev, createMessage('assistant', 'Понял. Уточните, пожалуйста, какие работы оставить или добавить.')]);
    }

    setPendingSuggestions(null);
  };

  const addWork = () => {
    setOrderDraft((prev) => ({
      ...prev,
      works: [...prev.works, { category: '', workType: '', title: '', confirmed: false, quantity: 1 }],
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

  const setWorkCategory = (workIndex: number, category: string) => {
    setOrderDraft((prev) => ({
      ...prev,
      works: prev.works.map((work, index) =>
        index === workIndex
          ? { ...work, category, workType: '', title: '' }
          : work,
      ),
    }));
  };

  const setWorkType = (workIndex: number, workType: string) => {
    setOrderDraft((prev) => ({
      ...prev,
      works: prev.works.map((work, index) => {
        if (index !== workIndex) {
          return work;
        }

        const estimate = getEstimatesByCategory(work.category).find((item) => item.work_type === workType);
        return { ...work, workType, title: estimate?.title ?? work.title };
      }),
    }));
  };

  const confirmOrder = () => {
    Alert.alert('Заказ подтверждён', 'Черновик заказа передан на создание.');
    setSelectorState(null);
  };

  const canSubmit = worksWithPrice.length > 0 && worksWithPrice.every((work) => work.category && work.workType);

  return (
    <View style={styles.root}>
      <AppHeader title="Создать заказ" />
      <View style={styles.layout}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Черновик заказа</Text>

            <Text style={styles.blockTitle}>Категория и услуга</Text>
            {orderDraft.works.length === 0 ? <Text style={styles.placeholderText}>Добавьте услугу вручную или через ChatMaster.</Text> : null}
            {orderDraft.works.map((work, index) => {
              const workTypes = work.category ? getEstimatesByCategory(work.category) : [];
              return (
                <View key={`${work.category}-${work.workType}-${index}`} style={styles.workRow}>
                  <Pressable style={styles.selectorField} onPress={() => setSelectorState({ type: 'category', workIndex: index })}>
                    <Text style={styles.selectorLabel}>Категория</Text>
                    <Text style={styles.selectorValue}>{work.category ? getCategoryLabel(work.category) : 'Выбрать категорию'}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.selectorField}
                    onPress={() => setSelectorState({ type: 'workType', workIndex: index })}
                    disabled={!work.category}
                  >
                    <Text style={styles.selectorLabel}>Вид работы / услуги</Text>
                    <Text style={styles.selectorValue}>{work.title || work.workType || (work.category ? 'Выбрать услугу' : 'Сначала выберите категорию')}</Text>
                  </Pressable>
                  <Pressable onPress={() => removeWork(index)}>
                    <Text style={styles.removeText}>Удалить услугу</Text>
                  </Pressable>
                  {workTypes.length === 0 && work.category ? <Text style={styles.placeholderText}>Для категории нет доступных услуг.</Text> : null}
                </View>
              );
            })}
            <Pressable style={styles.addButton} onPress={addWork}>
              <Text style={styles.addButtonText}>+ Добавить услугу</Text>
            </Pressable>

            <Text style={styles.blockTitle}>Когда нужен мастер</Text>
            <Pressable style={styles.selectorField} onPress={() => setSelectorState({ type: 'arrival' })}>
              <Text style={styles.selectorLabel}>Время приезда</Text>
              <Text style={styles.selectorValue}>{getArrivalLabel(arrivalOption, orderDraft.arrivalTime)}</Text>
            </Pressable>
            {arrivalOption === 'scheduled' ? (
              <View style={styles.rowWrap}>
                <TextInput style={styles.halfInput} value={scheduledDate} onChangeText={(value) => { setScheduledDate(value); setOrderDraft((prev) => ({ ...prev, arrivalTime: value && scheduledTime ? `${value} ${scheduledTime}` : prev.arrivalTime })); }} placeholder="Дата" placeholderTextColor="#91A0BB" />
                <TextInput style={styles.halfInput} value={scheduledTime} onChangeText={(value) => { setScheduledTime(value); setOrderDraft((prev) => ({ ...prev, arrivalTime: scheduledDate && value ? `${scheduledDate} ${value}` : prev.arrivalTime })); }} placeholder="Время" placeholderTextColor="#91A0BB" />
              </View>
            ) : null}

            <Text style={styles.blockTitle}>Материалы</Text>
            <Pressable style={styles.toggleRow} onPress={() => setOrderDraft((prev) => ({ ...prev, needMaterials: !prev.needMaterials }))}>
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

            <Text style={styles.blockTitle}>Комментарий</Text>
            <TextInput
              style={styles.fieldInput}
              value={orderDraft.comment}
              onChangeText={(value) => setOrderDraft((prev) => ({ ...prev, comment: value }))}
              placeholder="Дополнительные детали"
              placeholderTextColor="#91A0BB"
            />

            <Text style={styles.blockTitle}>Тариф</Text>
            <View style={styles.rowWrap}>
              {(['economy', 'comfort', 'business'] as TariffType[]).map((tariff) => {
                const active = orderDraft.tariff === tariff;
                return (
                  <Pressable key={tariff} style={[styles.chip, active && styles.chipActive]} onPress={() => setOrderDraft((prev) => ({ ...prev, tariff }))}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{TARIFF_LABELS[tariff]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.blockTitle}>Стоимость</Text>
            <Text style={styles.priceText}>{estimatedPrice > 0 ? `${estimatedPrice} KZT` : 'Цена уточняется'}</Text>

            <Pressable style={[styles.submitButton, !canSubmit && styles.sendButtonDisabled]} disabled={!canSubmit} onPress={() => setSelectorState({ type: 'confirm' })}>
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

        <View style={styles.chatDock}>
          <Text style={styles.cardTitle}>ChatMaster</Text>
          <ScrollView ref={scrollRef} style={styles.chatMessages} contentContainerStyle={styles.chatMessagesContent}>
            {messages.map((message) => (
              <View key={message.id} style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={styles.messageText}>{message.text}</Text>
                <Text style={styles.messageTime}>{formatTime(message.createdAt)}</Text>
              </View>
            ))}
          </ScrollView>

          {pendingSuggestions ? (
            <View style={styles.quickActions}>
              <Pressable style={[styles.quickButton, styles.quickButtonPrimary]} onPress={() => onConfirmSuggestions(true)}>
                <Text style={styles.quickButtonPrimaryText}>Да, добавить</Text>
              </Pressable>
              <Pressable style={styles.quickButton} onPress={() => onConfirmSuggestions(false)}>
                <Text style={styles.quickButtonText}>Нет</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.rowWrap}>
            <Pressable style={styles.chip} onPress={() => addPhoto('camera')}>
              <Text style={styles.chipText}>📷 Камера</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => addPhoto('gallery')}>
              <Text style={styles.chipText}>🖼️ Галерея</Text>
            </Pressable>
            <Text style={styles.placeholderText}>Фото: {orderDraft.photos.length}/3</Text>
          </View>

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
      </View>

      <Modal visible={Boolean(selectorState && selectorState.type !== 'confirm')} transparent animationType="slide" onRequestClose={() => setSelectorState(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.bottomSheet}>
            {selectorState?.type === 'category' ? (
              <>
                <Text style={styles.modalTitle}>Выберите категорию</Text>
                <ScrollView>
                  {availableCategories.map((category) => (
                    <Pressable
                      key={category}
                      style={styles.modalOption}
                      onPress={() => {
                        setWorkCategory(selectorState.workIndex, category);
                        setSelectorState(null);
                      }}
                    >
                      <Text style={styles.modalOptionText}>{getCategoryLabel(category)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {selectorState?.type === 'workType' ? (
              <>
                <Text style={styles.modalTitle}>Выберите услугу</Text>
                <ScrollView>
                  {getEstimatesByCategory(orderDraft.works[selectorState.workIndex]?.category ?? '').map((estimate) => (
                    <Pressable
                      key={estimate.estimate_id}
                      style={styles.modalOption}
                      onPress={() => {
                        setWorkType(selectorState.workIndex, estimate.work_type);
                        setSelectorState(null);
                      }}
                    >
                      <Text style={styles.modalOptionText}>{estimate.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {selectorState?.type === 'arrival' ? (
              <>
                <Text style={styles.modalTitle}>Когда нужен мастер</Text>
                {(['now', 'today', 'tomorrow', 'scheduled'] as Exclude<ArrivalOption, null>[]).map((arrival) => (
                  <Pressable
                    key={arrival}
                    style={styles.modalOption}
                    onPress={() => {
                      setArrivalOption(arrival);
                      setOrderDraft((prev) => ({
                        ...prev,
                        arrivalTime:
                          arrival === 'scheduled'
                            ? (scheduledDate && scheduledTime ? `${scheduledDate} ${scheduledTime}` : null)
                            : ARRIVAL_LABELS[arrival],
                      }));
                      setSelectorState(null);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{ARRIVAL_LABELS[arrival]}</Text>
                  </Pressable>
                ))}
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={selectorState?.type === 'confirm'} transparent animationType="fade" onRequestClose={() => setSelectorState(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalTitle}>Подтвердите заказ</Text>
            {worksWithPrice.map((work, index) => (
              <View key={`${work.category}-${work.workType}-${index}`} style={styles.confirmLineWrap}>
                <Text style={styles.confirmLine}>Категория: {getCategoryLabel(work.category)}</Text>
                <Text style={styles.confirmLine}>Услуга: {work.title || work.workType}</Text>
                <View style={styles.quantityRow}>
                  <Text style={styles.confirmLine}>Количество:</Text>
                  <Pressable
                    style={styles.qtyButton}
                    onPress={() =>
                      setOrderDraft((prev) => ({
                        ...prev,
                        works: prev.works.map((draftWork, draftIndex) =>
                          draftIndex === index ? { ...draftWork, quantity: Math.max(1, draftWork.quantity - 1) } : draftWork,
                        ),
                      }))
                    }
                  >
                    <Text style={styles.qtyButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>{work.quantity} {work.unit}</Text>
                  <Pressable
                    style={styles.qtyButton}
                    onPress={() =>
                      setOrderDraft((prev) => ({
                        ...prev,
                        works: prev.works.map((draftWork, draftIndex) =>
                          draftIndex === index ? { ...draftWork, quantity: draftWork.quantity + 1 } : draftWork,
                        ),
                      }))
                    }
                  >
                    <Text style={styles.qtyButtonText}>+</Text>
                  </Pressable>
                </View>
                <Text style={styles.confirmLine}>Стоимость: {work.linePrice} KZT</Text>
              </View>
            ))}
            <Text style={styles.confirmLine}>Когда нужен мастер: {getArrivalLabel(arrivalOption, orderDraft.arrivalTime)}</Text>
            <Text style={styles.confirmLine}>Материалы: {orderDraft.needMaterials ? 'Да' : 'Нет'}</Text>
            <Text style={styles.confirmLine}>Фото: {orderDraft.photos.length > 0 ? 'Загружены' : 'Нет'}</Text>
            <Text style={styles.confirmLine}>Комментарий: {orderDraft.comment ? 'Есть' : 'Нет'}</Text>
            <Text style={styles.confirmTotal}>Итого: {estimatedPrice} KZT</Text>

            <View style={styles.quickActions}>
              <Pressable style={[styles.quickButton, styles.quickButtonPrimary]} onPress={confirmOrder}>
                <Text style={styles.quickButtonPrimaryText}>Подтвердить заказ</Text>
              </Pressable>
              <Pressable style={styles.quickButton} onPress={() => setSelectorState(null)}>
                <Text style={styles.quickButtonText}>Назад / Изменить</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  layout: { flex: 1 },
  content: { padding: 14, gap: 12, paddingBottom: 20 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1B2A45', marginBottom: 8 },
  blockTitle: { marginTop: 12, marginBottom: 8, fontSize: 15, fontWeight: '700', color: '#1B2A45' },
  placeholderText: { color: '#74819A' },
  workRow: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, padding: 10, marginBottom: 8, gap: 8 },
  selectorField: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, padding: 10, backgroundColor: '#FAFCFF' },
  selectorLabel: { color: '#61708D', fontSize: 12, marginBottom: 4 },
  selectorValue: { color: '#1B2A45', fontWeight: '600' },
  removeText: { color: '#C63E3E', fontWeight: '600' },
  addButton: { marginTop: 6 },
  addButtonText: { color: '#0E5BF2', fontWeight: '700' },
  fieldInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#1B2A45',
    backgroundColor: '#FAFCFF',
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
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
  priceText: { color: '#1B2A45', fontSize: 20, fontWeight: '700' },
  submitButton: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E5BF2',
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chatDock: {
    height: '36%',
    borderTopWidth: 1,
    borderTopColor: '#DCE3F2',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 10,
    gap: 8,
  },
  chatMessages: { flex: 1 },
  chatMessagesContent: { gap: 6 },
  messageBubble: { borderRadius: 10, padding: 10, maxWidth: '90%' },
  assistantBubble: { backgroundColor: '#F5F8FF', alignSelf: 'flex-start' },
  userBubble: { backgroundColor: '#DCE9FF', alignSelf: 'flex-end' },
  messageText: { color: '#1B2A45', fontSize: 14 },
  messageTime: { marginTop: 4, fontSize: 11, color: '#74819A' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
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
  quickActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickButton: { borderWidth: 1, borderColor: '#C7D4EC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  quickButtonPrimary: { backgroundColor: '#0E5BF2', borderColor: '#0E5BF2' },
  quickButtonText: { color: '#33415C', fontWeight: '600' },
  quickButtonPrimaryText: { color: '#fff', fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  bottomSheet: {
    maxHeight: '60%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    gap: 8,
  },
  modalTitle: { color: '#1B2A45', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2FC' },
  modalOptionText: { color: '#1B2A45' },
  confirmCard: {
    margin: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 14,
    gap: 8,
    maxHeight: '85%',
  },
  confirmLineWrap: { borderBottomWidth: 1, borderBottomColor: '#EDF2FC', paddingBottom: 8, marginBottom: 8 },
  confirmLine: { color: '#33415C' },
  confirmTotal: { color: '#1B2A45', fontSize: 18, fontWeight: '700', marginTop: 6 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyButton: { borderRadius: 8, borderWidth: 1, borderColor: '#D1DDF7', paddingHorizontal: 10, paddingVertical: 4 },
  qtyButtonText: { color: '#0E5BF2', fontWeight: '700', fontSize: 16 },
  qtyValue: { color: '#1B2A45', fontWeight: '700' },
  devToggle: { backgroundColor: '#D9E6FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  devToggleActive: { backgroundColor: '#B9D0FF' },
  devToggleText: { color: '#15305E', fontWeight: '600' },
  devPanel: { backgroundColor: '#0F172A', borderRadius: 12, padding: 10, gap: 6 },
  devPanelTitle: { color: '#DDE7FF', fontWeight: '700' },
  devLine: { color: '#DDE7FF', fontSize: 12 },
});
