import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { calculateEstimatePrice, TariffType } from '../services/estimates';

type PickerType = 'category' | 'workType' | 'photoSource' | null;

type CategoryItem = {
  id: string;
  title: string;
  icon: string;
  keywords: string[];
};

type WorkTypeItem = {
  id: string;
  title: string;
  icon: string;
};

type ArrivalOption = {
  id: 'now' | 'hour' | 'today' | 'scheduled';
  label: string;
};

const CATEGORIES: CategoryItem[] = [
  {
    id: 'electrician',
    title: 'Электрик',
    icon: '💡',
    keywords: ['электрик', 'розетк', 'автомат', 'свет', 'люстр', 'выключател', 'подключить свет'],
  },
  {
    id: 'plumber',
    title: 'Сантехник',
    icon: '🚿',
    keywords: ['сантехник', 'кран', 'засор', 'смесител', 'теч', 'труба', 'унитаз', 'стиральн'],
  },
  {
    id: 'universal',
    title: 'Мастер-универсал',
    icon: '🧰',
    keywords: ['мелкий ремонт', 'починить', 'прикрутить', 'повесить', 'собрать', 'подклеить'],
  },
  { id: 'handyman', title: 'Handyman', icon: '🔧', keywords: ['handyman'] },
  {
    id: 'welder',
    title: 'Сварщик',
    icon: '🛠️',
    keywords: ['свар', 'ворота', 'решетк', 'металл', 'навес', 'каркас'],
  },
  {
    id: 'crew',
    title: 'Бригада',
    icon: '👷',
    keywords: ['несколько мастеров', 'бригада', 'большой объем', 'ремонт помещения'],
  },
  { id: 'cleaning', title: 'Клининг', icon: '🧼', keywords: ['уборк', 'помыть', 'чистк', 'генеральная уборка'] },
  {
    id: 'urgent',
    title: 'Срочный мастер 24/7',
    icon: '🚨',
    keywords: ['срочно', 'авария', 'ночью', 'срочный вызов', 'срочно приехать'],
  },
];

const WORK_TYPES: WorkTypeItem[] = [
  { id: 'diagnostics', title: 'Диагностика', icon: '🔍' },
  { id: 'repair', title: 'Ремонт', icon: '🔧' },
  { id: 'replacement', title: 'Замена', icon: '♻️' },
  { id: 'installation', title: 'Монтаж', icon: '📦' },
  { id: 'emergency', title: 'Авария', icon: '⚠️' },
  { id: 'other', title: 'Другое', icon: '📝' },
];

const ARRIVAL_OPTIONS: ArrivalOption[] = [
  { id: 'now', label: 'Сейчас' },
  { id: 'hour', label: 'В течение часа' },
  { id: 'today', label: 'Сегодня' },
  { id: 'scheduled', label: 'К назначенному времени' },
];

const normalize = (value: string) => value.toLowerCase().trim();

const getCategoryScore = (query: string, category: CategoryItem) => {
  const normalized = normalize(query);
  if (!normalized) {
    return 0;
  }

  let score = 0;

  if (normalize(category.title).includes(normalized)) {
    score += 5;
  }

  category.keywords.forEach((keyword) => {
    if (normalized.includes(normalize(keyword))) {
      score += 3;
    }
  });

  return score;
};

export const ServicesScreen = () => {
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [workTypeQuery, setWorkTypeQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkTypeItem | null>(null);
  const [arrivalOption, setArrivalOption] = useState<ArrivalOption['id'] | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<Array<{ id: string; source: 'camera' | 'gallery' }>>([]);
  const [needMaterialPickup, setNeedMaterialPickup] = useState(false);
  const [materialsList, setMaterialsList] = useState('');
  const [materialsComment, setMaterialsComment] = useState('');
  const [materialsBudget, setMaterialsBudget] = useState('');
  const [isMaterialsSheetVisible, setMaterialsSheetVisible] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<TariffType>('economy');

  const categorySuggestions = useMemo(() => {
    const withScore = CATEGORIES.map((category) => ({
      category,
      score: getCategoryScore(categoryQuery, category),
    }));

    return withScore
      .filter((entry) => !categoryQuery || entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.category);
  }, [categoryQuery]);

  const primaryCategorySuggestion = categorySuggestions[0] ?? null;

  const workTypeSuggestions = useMemo(() => {
    const query = normalize(workTypeQuery);
    if (!query) {
      return WORK_TYPES;
    }

    return WORK_TYPES.filter((item) => normalize(item.title).includes(query));
  }, [workTypeQuery]);

  const pricing = useMemo(() => {
    if (!selectedCategory || !selectedWorkType) {
      return null;
    }

    return calculateEstimatePrice({
      category: selectedCategory.id,
      workType: selectedWorkType.id,
      tariff: selectedTariff,
    });
  }, [selectedCategory, selectedWorkType, selectedTariff]);

  const orderMaterialsPayload = useMemo(
    () => ({
      need_material_pickup: needMaterialPickup,
      materials_list: materialsList,
      materials_comment: materialsComment,
      materials_budget: materialsBudget,
    }),
    [needMaterialPickup, materialsList, materialsComment, materialsBudget]
  );

  const onSelectCategory = (item: CategoryItem) => {
    setSelectedCategory(item);
    if (categoryQuery && !comment) {
      setComment(categoryQuery);
    }
    setActivePicker(null);
  };

  const onSelectWorkType = (item: WorkTypeItem) => {
    setSelectedWorkType(item);
    setActivePicker(null);
  };

  const addPhoto = (source: 'camera' | 'gallery') => {
    if (photos.length >= 3) {
      return;
    }

    setPhotos((prev) => [...prev, { id: `${source}-${Date.now()}`, source }]);
    setActivePicker(null);
  };

  const onToggleNeedMaterials = () => {
    const nextValue = !needMaterialPickup;
    setNeedMaterialPickup(nextValue);
    if (nextValue) {
      setMaterialsSheetVisible(true);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Вызвать мастера" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.blockTitle}>Категория</Text>
          <Pressable style={styles.field} onPress={() => setActivePicker('category')}>
            <Text style={selectedCategory ? styles.fieldValue : styles.fieldPlaceholder}>
              {selectedCategory?.title ?? 'Выбрать категорию'}
            </Text>
          </Pressable>

          <Text style={styles.blockTitle}>Вид работ</Text>
          <Pressable style={styles.field} onPress={() => setActivePicker('workType')}>
            <Text style={selectedWorkType ? styles.fieldValue : styles.fieldPlaceholder}>
              {selectedWorkType?.title ?? 'Выбрать вид работ'}
            </Text>
          </Pressable>

          <Text style={styles.blockTitle}>Фото проблемы</Text>
          <Pressable style={styles.field} onPress={() => setActivePicker('photoSource')}>
            <Text style={styles.fieldValue}>Добавить фото</Text>
          </Pressable>
          <View style={styles.photoRow}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoPreview}>
                <Text style={styles.photoIcon}>{photo.source === 'camera' ? '📷' : '🖼️'}</Text>
                <Text style={styles.photoLabel}>{photo.source === 'camera' ? 'Камера' : 'Галерея'}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.blockTitle}>Когда нужен мастер</Text>
          <View style={styles.arrivalOptions}>
            {ARRIVAL_OPTIONS.map((option) => {
              const isActive = arrivalOption === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.arrivalButton, isActive && styles.arrivalButtonActive]}
                  onPress={() => setArrivalOption(option.id)}
                >
                  <Text style={[styles.arrivalButtonText, isActive && styles.arrivalButtonTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {arrivalOption === 'scheduled' ? (
            <View style={styles.scheduledRow}>
              <TextInput
                value={scheduledDate}
                onChangeText={setScheduledDate}
                placeholder="Дата (дд.мм.гггг)"
                style={styles.scheduledInput}
                placeholderTextColor="#91A0BB"
              />
              <TextInput
                value={scheduledTime}
                onChangeText={setScheduledTime}
                placeholder="Время (чч:мм)"
                style={styles.scheduledInput}
                placeholderTextColor="#91A0BB"
              />
            </View>
          ) : null}

          <Text style={styles.blockTitle}>Опишите проблему</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            multiline
            style={styles.commentInput}
            placeholder="Например: течёт кран, нет света, нужно подключить стиральную машину."
            placeholderTextColor="#91A0BB"
          />

          <Pressable style={styles.materialPickupRow} onPress={onToggleNeedMaterials}>
            <View style={[styles.checkbox, orderMaterialsPayload.need_material_pickup && styles.checkboxActive]}>
              {orderMaterialsPayload.need_material_pickup ? <Text style={styles.checkboxTick}>✓</Text> : null}
            </View>
            <Text style={styles.materialPickupText}>Необходимо заехать за материалами</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerBlockTitle}>Тариф</Text>
        <View style={styles.tariffRow}>
          {[
            { id: 'economy', label: 'Эконом' },
            { id: 'comfort', label: 'Комфорт' },
            { id: 'business', label: 'Бизнес' },
          ].map((tariff) => {
            const isActive = selectedTariff === tariff.id;
            return (
              <Pressable
                key={tariff.id}
                style={[styles.tariffButton, isActive && styles.tariffButtonActive]}
                onPress={() => setSelectedTariff(tariff.id as TariffType)}
              >
                <Text style={[styles.tariffButtonText, isActive && styles.tariffButtonTextActive]}>{tariff.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.footerBlockTitle}>Цена</Text>
        {pricing ? (
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Работа</Text>
              <Text style={styles.priceValue}>{pricing.workPrice} KZT</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Выезд мастера</Text>
              <Text style={styles.priceValue}>{pricing.masterVisitFee > 0 ? `${pricing.masterVisitFee} KZT` : 'включён'}</Text>
            </View>
            <View style={[styles.priceRow, styles.priceTotalRow]}>
              <Text style={styles.priceTotalLabel}>Итого</Text>
              <Text style={styles.priceTotalValue}>{pricing.finalPrice} KZT</Text>
            </View>
          </View>
        ) : (
          <View style={styles.priceCard}>
            <Text style={styles.priceUnknown}>Цена уточняется</Text>
          </View>
        )}

        <Pressable style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Создать заказ</Text>
        </Pressable>
      </View>

      <Modal transparent visible={activePicker !== null} animationType="slide" onRequestClose={() => setActivePicker(null)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActivePicker(null)} />
          <View style={styles.sheetContainer}>
            {activePicker === 'category' ? (
              <>
                <Text style={styles.sheetTitle}>Категория</Text>
                <TextInput
                  value={categoryQuery}
                  onChangeText={setCategoryQuery}
                  style={styles.sheetSearchInput}
                  placeholder="Опишите проблему или выберите категорию"
                  placeholderTextColor="#91A0BB"
                />
                {categoryQuery && primaryCategorySuggestion ? (
                  <Pressable style={styles.primarySuggestion} onPress={() => onSelectCategory(primaryCategorySuggestion)}>
                    <Text style={styles.primarySuggestionLabel}>Подходит лучше всего</Text>
                    <Text style={styles.primarySuggestionText}>
                      {primaryCategorySuggestion.icon} {primaryCategorySuggestion.title}
                    </Text>
                  </Pressable>
                ) : null}
                <ScrollView style={styles.sheetList}>
                  {(categorySuggestions.length > 0 ? categorySuggestions : CATEGORIES).map((item) => (
                    <Pressable key={item.id} style={styles.sheetItem} onPress={() => onSelectCategory(item)}>
                      <Text style={styles.sheetItemIcon}>{item.icon}</Text>
                      <Text style={styles.sheetItemText}>{item.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {activePicker === 'workType' ? (
              <>
                <Text style={styles.sheetTitle}>Вид работ</Text>
                <TextInput
                  value={workTypeQuery}
                  onChangeText={setWorkTypeQuery}
                  style={styles.sheetSearchInput}
                  placeholder="Поиск по видам работ"
                  placeholderTextColor="#91A0BB"
                />
                <ScrollView style={styles.sheetList}>
                  {workTypeSuggestions.map((item) => (
                    <Pressable key={item.id} style={styles.sheetItem} onPress={() => onSelectWorkType(item)}>
                      <Text style={styles.sheetItemIcon}>{item.icon}</Text>
                      <Text style={styles.sheetItemText}>{item.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {activePicker === 'photoSource' ? (
              <>
                <Text style={styles.sheetTitle}>Добавить фото</Text>
                <Pressable style={styles.sheetItem} onPress={() => addPhoto('camera')}>
                  <Text style={styles.sheetItemIcon}>📷</Text>
                  <Text style={styles.sheetItemText}>Камера</Text>
                </Pressable>
                <Pressable style={styles.sheetItem} onPress={() => addPhoto('gallery')}>
                  <Text style={styles.sheetItemIcon}>🖼️</Text>
                  <Text style={styles.sheetItemText}>Галерея</Text>
                </Pressable>
                <Text style={styles.sheetHint}>Можно прикрепить до 3 фото.</Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={isMaterialsSheetVisible} animationType="slide" onRequestClose={() => setMaterialsSheetVisible(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMaterialsSheetVisible(false)} />
          <View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>Материалы</Text>
            <TextInput
              value={materialsList}
              onChangeText={setMaterialsList}
              style={styles.sheetSearchInput}
              placeholder="Например: розетка 2 шт, автомат 16А"
              placeholderTextColor="#91A0BB"
            />
            <TextInput
              value={materialsComment}
              onChangeText={setMaterialsComment}
              style={styles.sheetSearchInput}
              placeholder="Например: среднее качество"
              placeholderTextColor="#91A0BB"
            />
            <TextInput
              value={materialsBudget}
              onChangeText={setMaterialsBudget}
              style={styles.sheetSearchInput}
              placeholder="Например: до 10000 KZT"
              placeholderTextColor="#91A0BB"
            />
            <Pressable style={styles.sheetDoneButton} onPress={() => setMaterialsSheetVisible(false)}>
              <Text style={styles.sheetDoneButtonText}>Готово</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  scrollContent: { padding: 14, paddingBottom: 120 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  blockTitle: { marginTop: 14, marginBottom: 8, color: '#1b263b', fontSize: 15, fontWeight: '700' },
  field: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    backgroundColor: '#FAFCFF',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fieldValue: { color: '#1B2A45', fontSize: 15, fontWeight: '500' },
  fieldPlaceholder: { color: '#91A0BB', fontSize: 15 },
  photoRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  photoPreview: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F9FF',
  },
  photoIcon: { fontSize: 22 },
  photoLabel: { marginTop: 4, fontSize: 11, color: '#45536E' },
  arrivalOptions: { marginTop: 4, gap: 8 },
  arrivalButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  arrivalButtonActive: { backgroundColor: '#EEF3FF', borderColor: '#0E5BF2' },
  arrivalButtonText: { color: '#33415C', fontSize: 14, fontWeight: '500' },
  arrivalButtonTextActive: { color: '#0E5BF2', fontWeight: '700' },
  scheduledRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  scheduledInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    color: '#1B2A45',
    backgroundColor: '#FAFCFF',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#DCE3F2',
    borderRadius: 10,
    minHeight: 110,
    textAlignVertical: 'top',
    paddingHorizontal: 12,
    paddingTop: 12,
    color: '#1B2A45',
    backgroundColor: '#FAFCFF',
  },
  materialPickupRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxActive: { borderColor: '#0E5BF2', backgroundColor: '#EEF3FF' },
  checkboxTick: { color: '#0E5BF2', fontSize: 12, fontWeight: '700' },
  materialPickupText: { marginLeft: 8, color: '#33415C', fontSize: 14, fontWeight: '500' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#E1E7F2',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  footerBlockTitle: { color: '#1B2A45', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  tariffRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tariffButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tariffButtonActive: { borderColor: '#0E5BF2', backgroundColor: '#EEF3FF' },
  tariffButtonText: { color: '#45536E', fontSize: 13, fontWeight: '600' },
  tariffButtonTextActive: { color: '#0E5BF2' },
  priceCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E1E7F2',
    backgroundColor: '#FAFCFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 5,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { color: '#45536E', fontSize: 13 },
  priceValue: { color: '#1B2A45', fontSize: 13, fontWeight: '600' },
  priceTotalRow: { paddingTop: 4, borderTopWidth: 1, borderTopColor: '#E1E7F2', marginTop: 2 },
  priceTotalLabel: { color: '#1B2A45', fontSize: 14, fontWeight: '700' },
  priceTotalValue: { color: '#1B2A45', fontSize: 14, fontWeight: '700' },
  priceUnknown: { color: '#6A7895', fontSize: 14, textAlign: 'center' },
  submitButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#0E5BF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111C30', marginBottom: 10 },
  sheetSearchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#1B2A45',
    backgroundColor: '#FAFCFF',
    marginBottom: 10,
  },
  primarySuggestion: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFD2FF',
    backgroundColor: '#EEF3FF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  primarySuggestionLabel: { fontSize: 12, color: '#3A5CA8', marginBottom: 3 },
  primarySuggestionText: { fontSize: 15, color: '#10316B', fontWeight: '700' },
  sheetList: { maxHeight: 380 },
  sheetItem: {
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4EAF6',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  sheetItemIcon: { fontSize: 20, marginRight: 10 },
  sheetItemText: { fontSize: 15, color: '#1B2A45', fontWeight: '500' },
  sheetHint: { marginTop: 4, color: '#6A7895', fontSize: 13 },
  sheetDoneButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#0E5BF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sheetDoneButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
