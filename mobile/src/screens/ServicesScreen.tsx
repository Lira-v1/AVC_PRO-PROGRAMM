import React, { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ChatMasterEngine, type ChatMessage } from '../chatmaster';
import { SmetMasterEngine } from '../smetmaster';
import { getAvailableCategories, getEstimatesByCategory } from '../smetmaster/repositories/estimateRepository';
import type { TariffType } from '../smetmaster/types/SmetMasterTypes';

type ArrivalOption = 'now' | 'today' | 'tomorrow' | 'date' | null;

type OrderDraft = {
  category: string;
  workType: string;
  workTitle: string;
  quantity: number;
  arrivalOption: ArrivalOption;
  arrivalDate: string;
  needMaterials: boolean;
  tariff: TariffType;
  photos: Array<{ id: string; source: 'camera' | 'gallery' }>;
  comment: string;
};

type SelectorState = 'category' | 'workType' | 'arrival' | 'confirm' | 'attachment' | null;

const CATEGORY_LABELS: Record<string, string> = {
  electrician: 'Электрика',
  plumbing: 'Сантехника',
  welder: 'Сварщик',
  handyman: 'Хендимен / мастер-универсал',
  cleaning: 'Клининг',
  finishing: 'Отделочные работы',
  general_construction: 'Общестроительные работы',
  plumber: 'Сантехника',
};

const TARIFF_LABELS: Record<TariffType, string> = {
  economy: 'Эконом',
  comfort: 'Комфорт',
  business: 'Бизнес',
};

const ARRIVAL_LABELS: Record<Exclude<ArrivalOption, null>, string> = {
  now: 'Сейчас',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  date: 'Выбрать дату',
};

const createMessage = (role: ChatMessage['role'], text: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  text,
  createdAt: new Date().toISOString(),
});

const INITIAL_DRAFT: OrderDraft = {
  category: '',
  workType: '',
  workTitle: '',
  quantity: 1,
  arrivalOption: null,
  arrivalDate: '',
  needMaterials: false,
  tariff: 'economy',
  photos: [],
  comment: '',
};

export const ServicesScreen = () => {
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(INITIAL_DRAFT);
  const [selectorState, setSelectorState] = useState<SelectorState>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', 'Опишите задачу, и я помогу заполнить карточку заказа.'),
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  const availableCategories = useMemo(() => getAvailableCategories(), []);
  const availableWorks = useMemo(() => getEstimatesByCategory(orderDraft.category), [orderDraft.category]);

  const calculated = useMemo(() => {
    if (!orderDraft.category || !orderDraft.workType) {
      return null;
    }
    return SmetMasterEngine.calculateEstimate({
      category: orderDraft.category,
      workType: orderDraft.workType,
      tariff: orderDraft.tariff,
    });
  }, [orderDraft.category, orderDraft.workType, orderDraft.tariff]);

  const unit = calculated?.estimate.items[0]?.unit ?? 'ед.';
  const totalPrice = (calculated?.finalPrice ?? 0) * orderDraft.quantity;
  const canSubmit = Boolean(orderDraft.category && orderDraft.workType);

  const arrivalLabel = useMemo(() => {
    if (!orderDraft.arrivalOption) {
      return 'Не выбрано';
    }
    if (orderDraft.arrivalOption === 'date' && orderDraft.arrivalDate) {
      return `Выбрано: ${orderDraft.arrivalDate}`;
    }
    return ARRIVAL_LABELS[orderDraft.arrivalOption];
  }, [orderDraft.arrivalDate, orderDraft.arrivalOption]);

  const sendMessage = () => {
    const userText = input.trim();
    if (!userText) {
      return;
    }

    const response = ChatMasterEngine.processUserMessage(userText, { context: 'order_assistant' });
    const nextMessages: ChatMessage[] = [
      createMessage('user', userText),
      createMessage('assistant', response.reply),
    ];

    setMessages((prev) => [...prev, ...nextMessages]);
    setInput('');

    const suggestion = response.orderAssistantPayload?.suggestions[0];
    if (suggestion) {
      setOrderDraft((prev) => ({
        ...prev,
        category: suggestion.category,
        workType: suggestion.workType,
        workTitle: suggestion.title,
      }));
    }

    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const addPhoto = (source: 'camera' | 'gallery') => {
    if (orderDraft.photos.length >= 3) {
      Alert.alert('Лимит фото', 'Можно прикрепить не больше 3 фото.');
      return;
    }

    const id = `${source}-${Date.now()}`;
    setOrderDraft((prev) => ({ ...prev, photos: [...prev.photos, { id, source }] }));
    setMessages((prev) => [...prev, createMessage('user', `📎 Фото добавлено (${source === 'camera' ? 'камера' : 'галерея'})`)]);
    setSelectorState(null);
  };

  const onCreateOrder = () => {
    if (!canSubmit) {
      Alert.alert('Заполните карточку', 'Выберите категорию и работу.');
      return;
    }
    setSelectorState('confirm');
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Создать заказ" />
      <View style={styles.layout}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Карточка заказа</Text>

            <Pressable style={styles.selectorField} onPress={() => setSelectorState('category')}>
              <Text style={styles.selectorLabel}>Категория</Text>
              <Text style={styles.selectorValue}>{orderDraft.category ? CATEGORY_LABELS[orderDraft.category] : 'Выбрать категорию'}</Text>
            </Pressable>

            <Pressable style={styles.selectorField} onPress={() => setSelectorState('workType')}>
              <Text style={styles.selectorLabel}>Работа / услуга</Text>
              <Text style={styles.selectorValue}>{orderDraft.workTitle || (orderDraft.category ? 'Выбрать работу' : 'Сначала выберите категорию')}</Text>
            </Pressable>

            <View style={styles.selectorField}>
              <Text style={styles.selectorLabel}>Количество</Text>
              <View style={styles.quantityRow}>
                <Pressable style={styles.qtyButton} onPress={() => setOrderDraft((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}>
                  <Text style={styles.qtyButtonText}>−</Text>
                </Pressable>
                <TextInput
                  style={styles.quantityInput}
                  keyboardType="number-pad"
                  value={String(orderDraft.quantity)}
                  onChangeText={(value) => {
                    const parsed = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
                    setOrderDraft((prev) => ({ ...prev, quantity: Number.isNaN(parsed) || parsed < 1 ? 1 : parsed }));
                  }}
                />
                <Text style={styles.unitText}>{unit}</Text>
                <Pressable style={styles.qtyButton} onPress={() => setOrderDraft((prev) => ({ ...prev, quantity: prev.quantity + 1 }))}>
                  <Text style={styles.qtyButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.selectorField} onPress={() => setSelectorState('arrival')}>
              <Text style={styles.selectorLabel}>Когда нужен мастер</Text>
              <Text style={styles.selectorValue}>{arrivalLabel}</Text>
            </Pressable>

            {orderDraft.arrivalOption === 'date' ? (
              <TextInput
                style={styles.fieldInput}
                placeholder="Введите дату (например 25.12.2026 14:00)"
                placeholderTextColor="#91A0BB"
                value={orderDraft.arrivalDate}
                onChangeText={(value) => setOrderDraft((prev) => ({ ...prev, arrivalDate: value }))}
              />
            ) : null}

            <Pressable style={styles.selectorField} onPress={() => setOrderDraft((prev) => ({ ...prev, needMaterials: !prev.needMaterials }))}>
              <Text style={styles.selectorLabel}>Материалы</Text>
              <Text style={styles.selectorValue}>{orderDraft.needMaterials ? 'Нужны материалы' : 'Материалы не нужны'}</Text>
            </Pressable>

            <Text style={styles.selectorLabel}>Тариф</Text>
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

            <View style={styles.selectorField}>
              <Text style={styles.selectorLabel}>Цена</Text>
              <Text style={styles.priceText}>{totalPrice} KZT</Text>
            </View>

            <TextInput
              style={styles.fieldInput}
              placeholder="Комментарий к заказу"
              placeholderTextColor="#91A0BB"
              value={orderDraft.comment}
              onChangeText={(value) => setOrderDraft((prev) => ({ ...prev, comment: value }))}
            />

            <Pressable style={[styles.submitButton, !canSubmit && styles.submitDisabled]} onPress={onCreateOrder}>
              <Text style={styles.submitButtonText}>Создать заказ</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.chatDock}>
          <Text style={styles.chatTitle}>ChatMaster</Text>
          <ScrollView ref={scrollRef} style={styles.chatMessages} contentContainerStyle={styles.chatMessagesContent}>
            {messages.map((message) => (
              <View key={message.id} style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={styles.messageText}>{message.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <Pressable style={styles.iconButton} onPress={() => setSelectorState('attachment')}>
              <Text style={styles.iconText}>📎</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Напишите сообщение..."
              placeholderTextColor="#8A94A6"
              multiline
            />
            <Pressable style={[styles.iconButton, styles.sendButton]} onPress={sendMessage}>
              <Text style={styles.sendText}>➤</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={selectorState === 'category' || selectorState === 'workType' || selectorState === 'arrival' || selectorState === 'attachment'} transparent animationType="slide" onRequestClose={() => setSelectorState(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.bottomSheet}>
            {selectorState === 'category' ? (
              <>
                <Text style={styles.modalTitle}>Выберите категорию</Text>
                <ScrollView>
                  {availableCategories.map((category) => (
                    <Pressable
                      key={category}
                      style={styles.modalOption}
                      onPress={() => {
                        setOrderDraft((prev) => ({ ...prev, category, workType: '', workTitle: '' }));
                        setSelectorState(null);
                      }}
                    >
                      <Text style={styles.modalOptionText}>{CATEGORY_LABELS[category] ?? category}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {selectorState === 'workType' ? (
              <>
                <Text style={styles.modalTitle}>Выберите работу</Text>
                <ScrollView>
                  {availableWorks.map((estimate) => (
                    <Pressable
                      key={estimate.estimate_id}
                      style={styles.modalOption}
                      onPress={() => {
                        setOrderDraft((prev) => ({ ...prev, workType: estimate.work_type, workTitle: estimate.title }));
                        setSelectorState(null);
                      }}
                    >
                      <Text style={styles.modalOptionText}>{estimate.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {selectorState === 'arrival' ? (
              <>
                <Text style={styles.modalTitle}>Когда нужен мастер</Text>
                {(['now', 'today', 'tomorrow', 'date'] as Exclude<ArrivalOption, null>[]).map((arrival) => (
                  <Pressable
                    key={arrival}
                    style={styles.modalOption}
                    onPress={() => {
                      setOrderDraft((prev) => ({ ...prev, arrivalOption: arrival }));
                      setSelectorState(null);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{ARRIVAL_LABELS[arrival]}</Text>
                  </Pressable>
                ))}
              </>
            ) : null}

            {selectorState === 'attachment' ? (
              <>
                <Text style={styles.modalTitle}>Добавить фото</Text>
                <Pressable style={styles.modalOption} onPress={() => addPhoto('camera')}>
                  <Text style={styles.modalOptionText}>Сделать фото</Text>
                </Pressable>
                <Pressable style={styles.modalOption} onPress={() => addPhoto('gallery')}>
                  <Text style={styles.modalOptionText}>Выбрать из галереи</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={selectorState === 'confirm'} transparent animationType="fade" onRequestClose={() => setSelectorState(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalTitle}>Подтверждение заказа</Text>
            <Text style={styles.confirmLine}>Категория: {CATEGORY_LABELS[orderDraft.category] ?? '—'}</Text>
            <Text style={styles.confirmLine}>Работа: {orderDraft.workTitle || '—'}</Text>
            <View style={styles.quantityRow}>
              <Text style={styles.confirmLine}>Количество:</Text>
              <Pressable style={styles.qtyButton} onPress={() => setOrderDraft((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}>
                <Text style={styles.qtyButtonText}>−</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{orderDraft.quantity} {unit}</Text>
              <Pressable style={styles.qtyButton} onPress={() => setOrderDraft((prev) => ({ ...prev, quantity: prev.quantity + 1 }))}>
                <Text style={styles.qtyButtonText}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.confirmLine}>Стоимость: {totalPrice} KZT</Text>
            <Text style={styles.confirmLine}>Когда нужен мастер: {arrivalLabel}</Text>
            <Text style={styles.confirmLine}>Материалы: {orderDraft.needMaterials ? 'Нужны' : 'Не нужны'}</Text>
            <Text style={styles.confirmLine}>Фото: {orderDraft.photos.length ? `${orderDraft.photos.length} шт.` : 'Нет'}</Text>
            <Text style={styles.confirmLine}>Комментарий: {orderDraft.comment || 'Нет'}</Text>

            <View style={styles.rowWrap}>
              <Pressable style={[styles.submitButton, styles.confirmAction]} onPress={() => Alert.alert('Заказ отправлен', 'Мастер скоро свяжется с вами.') }>
                <Text style={styles.submitButtonText}>Подтвердить заказ</Text>
              </Pressable>
              <Pressable style={styles.backButton} onPress={() => setSelectorState(null)}>
                <Text style={styles.backButtonText}>Назад / изменить</Text>
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
  content: { padding: 14, paddingBottom: 20 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1B2A45' },
  selectorField: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, padding: 10, backgroundColor: '#FAFCFF' },
  selectorLabel: { color: '#61708D', fontSize: 12, marginBottom: 4 },
  selectorValue: { color: '#1B2A45', fontWeight: '600' },
  fieldInput: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, paddingHorizontal: 12, minHeight: 44, backgroundColor: '#FAFCFF', color: '#1B2A45' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive: { borderColor: '#0E5BF2', backgroundColor: '#EEF3FF' },
  chipText: { color: '#45536E', fontWeight: '600' },
  chipTextActive: { color: '#0E5BF2' },
  priceText: { color: '#1B2A45', fontSize: 22, fontWeight: '700' },
  submitButton: { marginTop: 4, minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E5BF2', paddingHorizontal: 14 },
  submitDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chatDock: { height: '42%', borderTopWidth: 1, borderTopColor: '#DCE3F2', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 10, gap: 8 },
  chatTitle: { fontSize: 17, fontWeight: '700', color: '#1B2A45' },
  chatMessages: { flex: 1 },
  chatMessagesContent: { gap: 6, paddingBottom: 4 },
  messageBubble: { borderRadius: 10, padding: 10, maxWidth: '90%' },
  assistantBubble: { backgroundColor: '#F5F8FF', alignSelf: 'flex-start' },
  userBubble: { backgroundColor: '#DCE9FF', alignSelf: 'flex-end' },
  messageText: { color: '#1B2A45', fontSize: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 100, borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFCFF', color: '#1B2A45' },
  iconButton: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#DCE3F2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  iconText: { fontSize: 18 },
  sendButton: { backgroundColor: '#0E5BF2', borderColor: '#0E5BF2' },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  bottomSheet: { maxHeight: '60%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, gap: 8 },
  modalTitle: { color: '#1B2A45', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2FC' },
  modalOptionText: { color: '#1B2A45' },
  confirmCard: { margin: 16, borderRadius: 14, backgroundColor: '#fff', padding: 14, gap: 8 },
  confirmLine: { color: '#33415C' },
  confirmAction: { flex: 1, marginTop: 10 },
  backButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#C7D4EC', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  backButtonText: { color: '#33415C', fontWeight: '600' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyButton: { borderRadius: 8, borderWidth: 1, borderColor: '#D1DDF7', paddingHorizontal: 10, paddingVertical: 4 },
  qtyButtonText: { color: '#0E5BF2', fontWeight: '700', fontSize: 16 },
  quantityInput: { minWidth: 48, textAlign: 'center', borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 8, paddingVertical: 4, color: '#1B2A45' },
  unitText: { color: '#61708D' },
  qtyValue: { color: '#1B2A45', fontWeight: '700' },
});
