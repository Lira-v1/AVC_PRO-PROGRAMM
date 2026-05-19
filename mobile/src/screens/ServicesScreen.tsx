import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';

export type ServiceCategory = {
  id: string;
  title: string;
  category: 'electrician' | 'plumber' | 'welding' | 'handyman' | 'crews' | 'cleaning' | 'commercial' | 'emergency';
};

type ServicesScreenProps = {
  onMenuPress: () => void;
  onCategoryPress: (category: ServiceCategory) => void;
};

export const ServicesScreen = ({ onMenuPress, onCategoryPress }: ServicesScreenProps) => {
  const categories = useMemo<ServiceCategory[]>(
    () => [
      { id: 'electrician', title: 'Электрик', category: 'electrician' },
      { id: 'plumber', title: 'Сантехник', category: 'plumber' },
      { id: 'welding', title: 'Сварщик', category: 'welding' },
      { id: 'handyman', title: 'Handyman', category: 'handyman' },
      { id: 'crews', title: 'Бригады', category: 'crews' },
      { id: 'cleaning', title: 'Cleaning', category: 'cleaning' },
      { id: 'commercial', title: 'Коммерческие', category: 'commercial' },
      { id: 'emergency', title: 'Срочный мастер 24/7', category: 'emergency' },
    ],
    []
  );

  return (
    <View style={styles.root}>
      <AppHeader onMenuPress={onMenuPress} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {categories.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => onCategoryPress(item)}>
              <View style={styles.iconPlaceholder} />
              <Text style={styles.cardTitle}>{item.title}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  scrollContent: { padding: 14, paddingBottom: 30 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  card: {
    width: '48%',
    height: 88,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#EEF3FF',
    position: 'absolute',
    top: 8,
    right: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16213c',
    textAlign: 'center',
  },
});
