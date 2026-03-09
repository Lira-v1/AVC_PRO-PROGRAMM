import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompactCardGrid } from '../components/CompactCardGrid';
import { AppHeader } from '../components/AppHeader';

export type HomeCategory = {
  id: string;
  title: string;
  route:
    | 'Services'
    | 'Emergency'
    | 'Estimate'
    | 'Commercial'
    | 'Maintenance'
    | 'Vacancies'
    | 'Orders'
    | 'Shop';
};

type HomeScreenProps = {
  onMenuPress: () => void;
  onCategoryPress: (category: HomeCategory) => void;
};

export const HomeScreen = ({ onMenuPress, onCategoryPress }: HomeScreenProps) => {
  const categories = useMemo<HomeCategory[]>(
    () => [
      { id: 'services', title: 'Услуги', route: 'Services' },
      { id: 'emergency', title: 'Экстренный мастер', route: 'Emergency' },
      { id: 'estimate', title: 'Сметмастер', route: 'Estimate' },
      { id: 'commercial', title: 'Коммерция', route: 'Commercial' },
      { id: 'maintenance', title: 'Обслуживание', route: 'Maintenance' },
      { id: 'vacancies', title: 'Вакансии', route: 'Vacancies' },
      { id: 'orders', title: 'Мои заявки', route: 'Orders' },
      { id: 'shop', title: 'Магазин', route: 'Shop' },
    ],
    []
  );

  return (
    <View style={styles.root}>
      <AppHeader onMenuPress={onMenuPress} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.locationBlock}>
          <Text style={styles.locationTitle}>Укажите местоположение</Text>
          <Text style={styles.locationSubtitle}>Чтобы найти мастеров рядом</Text>
          <View style={styles.locationActions}>
            <Pressable style={[styles.locationButton, styles.locationButtonPrimary]}>
              <Text style={styles.locationButtonPrimaryText}>Ввести адрес</Text>
            </Pressable>
            <Pressable style={[styles.locationButton, styles.locationButtonSecondary]}>
              <Text style={styles.locationButtonSecondaryText}>Определить автоматически</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Найти услугу или мастера</Text>
        </View>

        <CompactCardGrid items={categories} onItemPress={onCategoryPress} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  scrollContent: {
    padding: 14,
    paddingBottom: 30,
  },
  locationBlock: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  locationTitle: {
    fontSize: 18,
    color: '#1b263b',
    fontWeight: '700',
  },
  locationSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#5f6c87',
  },
  locationActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  locationButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  locationButtonPrimary: { backgroundColor: '#0E5BF2' },
  locationButtonSecondary: {
    backgroundColor: '#EEF3FF',
    borderWidth: 1,
    borderColor: '#D6E2FF',
  },
  locationButtonPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  locationButtonSecondaryText: { color: '#1A4EB5', fontWeight: '600', fontSize: 13 },
  searchBar: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E3E8F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIcon: {
    marginTop: 1,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#7a869f',
    fontWeight: '400',
  },
});
