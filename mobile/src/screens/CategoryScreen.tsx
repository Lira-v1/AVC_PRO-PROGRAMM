import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';

const categoryDescriptions: Record<string, string> = {
  electrician: 'Работы по электрике в квартире, доме и коммерческих помещениях.',
  plumber: 'Монтаж и ремонт сантехнических систем любой сложности.',
  welding: 'Сварочные работы для бытовых и коммерческих задач.',
  handyman: 'Мелкий бытовой ремонт и универсальные работы по дому.',
  crews: 'Комплексные работы с привлечением профильных бригад.',
  cleaning: 'Уборка помещений и поддержание чистоты.',
  commercial: 'Услуги для бизнеса и объектов коммерческого назначения.',
  emergency: 'Срочный выезд мастера 24/7 для неотложных задач.',
};

type CategoryScreenProps = {
  route: { params: { title: string; category: string } };
};

export const CategoryScreen = ({ route }: CategoryScreenProps) => {
  const { title, category } = route.params;

  return (
    <View style={styles.root}>
      <AppHeader title={title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{categoryDescriptions[category] ?? 'Категория услуг платформы MasterPro.'}</Text>

        <View style={styles.bannerPlaceholder}>
          <Text style={styles.bannerText}>Баннер категории</Text>
        </View>

        <Text style={styles.sectionTitle}>Популярные услуги</Text>
        <View style={styles.listCard}><Text style={styles.listText}>Диагностика и выезд мастера</Text></View>
        <View style={styles.listCard}><Text style={styles.listText}>Установка и подключение</Text></View>
        <View style={styles.listCard}><Text style={styles.listText}>Ремонт и замена</Text></View>

        <Text style={styles.sectionTitle}>Частые работы</Text>
        <View style={styles.listCard}><Text style={styles.listText}>Срочный вызов специалиста</Text></View>
        <View style={styles.listCard}><Text style={styles.listText}>Плановое обслуживание</Text></View>
        <View style={styles.listCard}><Text style={styles.listText}>Консультация по работам</Text></View>

        <Pressable style={styles.createButton}>
          <Text style={styles.createButtonText}>Создать заявку</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F5FA' },
  content: { padding: 14, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: '#121a2f' },
  description: { marginTop: 8, fontSize: 14, color: '#5f6c87', lineHeight: 20 },
  bannerPlaceholder: {
    marginTop: 14,
    height: 180,
    borderRadius: 14,
    backgroundColor: '#E8EEFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { color: '#3d4f74', fontWeight: '600' },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 18, fontWeight: '700', color: '#121a2f' },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  listText: { fontSize: 14, color: '#21304d', fontWeight: '500' },
  createButton: {
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#0E5BF2',
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontWeight: '700' },
});
