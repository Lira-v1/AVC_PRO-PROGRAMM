import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type HomeCategory = {
  id: string;
  title: string;
  route: 'CreateRequest' | 'Placeholder';
  placeholderTitle?: string;
};

type HomeScreenProps = {
  onMenuPress: () => void;
  onCategoryPress: (category: HomeCategory) => void;
};

export const HomeScreen = ({ onMenuPress, onCategoryPress }: HomeScreenProps) => {
  const categories = useMemo<HomeCategory[]>(
    () => [
      { id: 'electric', title: 'Электрика', route: 'CreateRequest' },
      { id: 'plumbing', title: 'Сантехника', route: 'CreateRequest' },
      { id: 'cleaning', title: 'Уборка', route: 'Placeholder', placeholderTitle: 'Уборка' },
      { id: 'assembly', title: 'Сборка мебели', route: 'CreateRequest' },
      { id: 'appliances', title: 'Техника', route: 'Placeholder', placeholderTitle: 'Ремонт техники' },
      { id: 'doors', title: 'Двери и замки', route: 'CreateRequest' },
      { id: 'painting', title: 'Покраска', route: 'Placeholder', placeholderTitle: 'Покраска' },
      { id: 'moving', title: 'Переезд', route: 'Placeholder', placeholderTitle: 'Переезд' },
    ],
    []
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onMenuPress} style={styles.menuButton} accessibilityLabel="Открыть меню">
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </Pressable>
        <Text style={styles.headerTitle}>MasterPro</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.locationBlock}>
          <Text style={styles.locationLabel}>Ваше местоположение</Text>
          <Text style={styles.locationValue}>Москва, определяем ближайших мастеров</Text>
        </View>

        <Pressable
          style={styles.searchBar}
          onPress={() => {
            console.log('Search pressed');
          }}
          accessibilityRole="button"
          accessibilityLabel="Найти услугу или мастера"
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Найти услугу или мастера</Text>
        </Pressable>

        <View style={styles.grid}>
          {categories.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => onCategoryPress(item)}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>Выбрать</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ebf2',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: '#222',
    marginVertical: 1.5,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#101623',
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
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
  locationLabel: {
    fontSize: 13,
    color: '#5f6c87',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 15,
    color: '#1b263b',
    fontWeight: '600',
  },
  searchBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e9f2',
    shadowColor: '#1a1f2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#7a869f',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    width: '48%',
    minHeight: 100,
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16213c',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#0E5BF2',
    fontWeight: '500',
  },
});
