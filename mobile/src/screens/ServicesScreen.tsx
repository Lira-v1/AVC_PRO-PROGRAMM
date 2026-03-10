import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';

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
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Найти мастера</Text>
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
});
