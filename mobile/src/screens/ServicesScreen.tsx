import React, { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { ChatMasterEngine, type ChatMessage } from '../chatmaster';
import { LocationPicker } from '../components/LocationPicker';
import { SmetMasterEngine } from '../smetmaster';
import { getAvailableCategories, getEstimatesByCategory } from '../smetmaster/repositories/estimateRepository';
import type { TariffType } from '../smetmaster/types/SmetMasterTypes';
import { EMPTY_LOCATION, type GeoLocation } from '../types/location';

type ArrivalOption = 'now' | 'today' | 'tomorrow' | 'date' | null;

type OrderWork = {
  id: string;
  category: string;
  workType: string;
  title: string;
  quantity: number;
  unit: string;
  price: number;
};

type OrderDraft = {
  category: string;
  workType: string;
  workTitle: string;
  works: OrderWork[];
  arrivalOption: ArrivalOption;
  arrivalDate: string;
  needMaterials: boolean;
  tariff: TariffType;
  photos: Array<{ id: string; source: 'camera' | 'gallery' }>;
  comment: string;
  location: GeoLocation;
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
  works: [],
  arrivalOption: null,
  arrivalDate: '',
  needMaterials: false,
  tariff: 'economy',
  photos: [],
  comment: '',
  location: EMPTY_LOCATION,
};

const formatMoney = (amount: number) => `${amount.toLocaleString('ru-RU')} ₸`;

export const ServicesScreen = () => {
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(INITIAL_DRAFT);
  const [selectorState, setSelectorState] = useState<SelectorState>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', 'Опишите задачу, и я помогу заполнить карточку заказа.'),
  ]);
  const [input, setInput] = useState('');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const availableCategories = useMemo(() => getAvailableCategories(), []);
  const availableWorks = useMemo(() => getEstimatesByCategory(orderDraft.category), [orderDraft.category]);

  const worksWithPrice = useMemo(
    () =>
      orderDraft.works.map((work) => {
        const estimate = SmetMasterEngine.calculateEstimate({
          category: work.category,
          workType: work.workType,
          tariff: orderDraft.tariff,
        });
        const unitPrice = estimate?.finalPrice ?? work.price;
        return {
          ...work,
          unit: estimate?.estimate.items[0]?.unit ?? work.unit,
          price: unitPrice,
          linePrice: unitPrice * Math.max(1, work.quantity),
        };
      }),
    [orderDraft.tariff, orderDraft.works],
  );

  const totalPrice = worksWithPrice.reduce((sum, work) => sum + work.linePrice, 0);
  const canSubmit = orderDraft.works.length > 0;

  const resetOrder = () => {
    setOrderDraft(INITIAL_DRAFT);
    setSelectorState(null);
    setInput('');
    setMessages([createMessage('assistant', 'Опишите задачу, и я помогу заполнить карточку заказа.')]);
    setIsChatCollapsed(false);
  };

  const appendWork = (work: { category: string; workType: string; title: string }) => {
    const calculated = SmetMasterEngine.calculateEstimate({
      category: work.category,
      workType: work.workType,
      tariff: orderDraft.tariff,
    });

    setOrderDraft((prev) => ({
      ...prev,
      category: work.category,
      workType: work.workType,
      workTitle: work.title,
      works: [
        ...prev.works,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          category: work.category,
          workType: work.workType,
          title: work.title,
          quantity: 1,
          unit: calculated?.estimate.items[0]?.unit ?? 'услуга',
          price: calculated?.finalPrice ?? 0,
        },
      ],
    }));
  };

  const removeWork = (id: string) => {
    setOrderDraft((prev) => ({ ...prev, works: prev.works.filter((work) => work.id !== id) }));
  };

  const updateWorkQuantity = (id: string, delta: number) => {
    setOrderDraft((prev) => ({
      ...prev,
      works: prev.works.map((work) =>
        work.id === id
          ? {
              ...work,
              quantity: Math.max(1, work.quantity + delta),
            }
          : work,
      ),
    }));
  };

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
    const nextMessages: ChatMessage[] = [createMessage('user', userText), createMessage('assistant', response.reply)];

    setMessages((prev) => [...prev, ...nextMessages]);
    setInput('');

    const suggestion = response.orderAssistantPayload?.suggestions[0];
    if (suggestion) {
      appendWork({
        category: suggestion.category,
        workType: suggestion.workType,
        title: suggestion.title,
      });
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
      Alert.alert('Заполните карточку', 'Добавьте хотя бы одну услугу.');
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
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Карточка заказа</Text>
              <Pressable style={styles.resetButton} onPress={resetOrder}>
                <Text style={styles.resetButtonText}>Сбросить заказ</Text>
              </Pressable>
            </View>

            <Pressable style={styles.selectorField} onPress={() => setSelectorState('category')}>
              <Text style={styles.selectorLabel}>Категория</Text>
              <Text style={styles.selectorValue}>{orderDraft.category ? CATEGORY_LABELS[orderDraft.category] : 'Выбрать категорию'}</Text>
            </Pressable>

            <View style={styles.selectorField}>
              <Text style={styles.selectorLabel}>Состав заказа</Text>
              {worksWithPrice.length ? (
                worksWithPrice.map((work) => (
                  <View key={work.id} style={styles.workRow}>
                    <View style={styles.workMeta}>
                      <Text style={styles.workTitle}>{work.title}</Text>
                      <View style={styles.quantityRow}>
                        <Pressable style={styles.qtyButton} onPress={() => updateWorkQuantity(work.id, -1)}>
                          <Text style={styles.qtyButtonText}>−</Text>
                        </Pressable>
                        <Text style={styles.qtyValue}>{work.quantity}</Text>
                        <Pressable style={styles.qtyButton} onPress={() => updateWorkQuantity(work.id, 1)}>
                          <Text style={styles.qtyButtonText}>+</Text>
                        </Pressable>
                        <Text style={styles.unitText}>{work.unit}</Text>
                      </View>
                    </View>
                    <Text style={styles.workPrice}>{formatMoney(work.linePrice)}</Text>
                    <Pressable onPress={() => removeWork(work.id)} style={styles.deleteButton}>
                      <Text style={styles.deleteButtonText}>✕</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.selectorValue}>Добавьте первую услугу</Text>
              )}
              <Pressable style={styles.addWorkButton} onPress={() => setSelectorState('workType')}>
                <Text style={styles.addWorkText}>+ Добавить услугу</Text>
              </Pressable>
              <Text style={styles.totalLine}>Итого: {formatMoney(totalPrice)}</Text>
            </View>

            <LocationPicker
              title="Адрес"
              value={orderDraft.location}
              onChange={(location: GeoLocation) => setOrderDraft((prev) => ({ ...prev, location }))}
            />

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

        <View style={[styles.chatDock, isChatCollapsed && styles.chatDockCollapsed]}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.chatTitle}>ChatMaster</Text>
            <Pressable style={styles.collapseButton} onPress={() => setIsChatCollapsed(true)}>
              <Text style={styles.collapseButtonText}>Свернуть</Text>
            </Pressable>
          </View>
          {!isChatCollapsed ? (
            <ScrollView ref={scrollRef} style={styles.chatMessages} contentContainerStyle={styles.chatMessagesContent}>
              {messages.map((message) => (
                <View key={message.id} style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={styles.messageText}>{message.text}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.inputRow}>
            <Pressable style={styles.iconButton} onPress={() => setSelectorState('attachment')}>
              <Text style={styles.iconText}>📎</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={(value) => {
                if (isChatCollapsed && value) {
                  setIsChatCollapsed(false);
                }
                setInput(value);
              }}
              onFocus={() => setIsChatCollapsed(false)}
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
                        setSelectorState('workType');
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
                        appendWork({ category: estimate.category, workType: estimate.work_type, title: estimate.title });
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
            <Text style={styles.modalTitle}>Проверьте заказ</Text>
            <Text style={styles.confirmLine}>Категория: {CATEGORY_LABELS[orderDraft.category] ?? '—'}</Text>
            <Text style={styles.confirmLine}>Работы: {orderDraft.works.length || '—'}</Text>
            {worksWithPrice.map((work) => (
              <Text key={work.id} style={styles.confirmLine}>• {work.title} — {work.quantity} {work.unit}, {formatMoney(work.linePrice)}</Text>
            ))}
            <Text style={styles.confirmLine}>Стоимость: {formatMoney(totalPrice)}</Text>
            <Text style={styles.confirmLine}>Адрес: {orderDraft.location.address || 'Не указан'}</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  resetButton: { borderWidth: 1, borderColor: '#F2C4C4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FFF5F5' },
  resetButtonText: { color: '#BA3030', fontWeight: '600', fontSize: 12 },
  selectorField: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, padding: 10, backgroundColor: '#FAFCFF', gap: 8 },
  selectorLabel: { color: '#61708D', fontSize: 12, marginBottom: 4 },
  selectorValue: { color: '#1B2A45', fontWeight: '600' },
  fieldInput: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 10, paddingHorizontal: 12, minHeight: 44, backgroundColor: '#FAFCFF', color: '#1B2A45' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive: { borderColor: '#0E5BF2', backgroundColor: '#EEF3FF' },
  chipText: { color: '#45536E', fontWeight: '600' },
  chipTextActive: { color: '#0E5BF2' },
  submitButton: { marginTop: 4, minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E5BF2', paddingHorizontal: 14 },
  submitDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  workRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  workMeta: { flex: 1 },
  workTitle: { color: '#33415C', fontWeight: '600' },
  workPrice: { color: '#1B2A45', fontWeight: '700' },
  addWorkButton: { marginTop: 4, borderWidth: 1, borderColor: '#D1DDF7', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  addWorkText: { color: '#0E5BF2', fontWeight: '700' },
  deleteButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F0' },
  deleteButtonText: { color: '#BA3030', fontWeight: '700' },
  totalLine: { color: '#1B2A45', fontSize: 18, fontWeight: '700', marginTop: 4 },
  chatDock: { height: '42%', borderTopWidth: 1, borderTopColor: '#DCE3F2', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 10, gap: 8 },
  chatDockCollapsed: { height: 108 },
  chatHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collapseButton: { borderWidth: 1, borderColor: '#DCE3F2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  collapseButtonText: { color: '#45536E', fontWeight: '600', fontSize: 12 },
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
  unitText: { color: '#61708D' },
  qtyValue: { color: '#1B2A45', fontWeight: '700', minWidth: 20, textAlign: 'center' },
});
