import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CompactCardGrid } from '../components/CompactCardGrid';
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
        <CompactCardGrid items={categories} onItemPress={onCategoryPress} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  scrollContent: { padding: 14, paddingBottom: 30 },
});
