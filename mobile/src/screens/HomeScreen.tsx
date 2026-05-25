import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { CompactCardGrid } from '../components/CompactCardGrid';
import { AppHeader } from '../components/AppHeader';
import { LocationPicker } from '../components/LocationPicker';
import { QuickAccessItem, QuickAccessRibbon } from '../components/QuickAccessRibbon';
import { useAppStore } from '../store/AppStore';

export type HomeCategory = {
  id: string;
  title: string;
  image?: ImageSourcePropType;
  route:
    | 'Services'
    | 'Emergency'
    | 'Estimate'
    | 'IndustrialEngineering'
    | 'Maintenance'
    | 'Vacancies'
    | 'Orders'
    | 'Shop';
};

type HomeScreenProps = {
  onMenuPress: () => void;
  onCategoryPress: (category: HomeCategory) => void;
};

const homeCardImages: Record<string, ImageSourcePropType> = {
  services: require('../../assets/home-cards/call-master-card.png'),
  emergency: require('../../assets/home-cards/emergency-master-card.png'),
  estimate: require('../../assets/home-cards/smetmaster-card.png'),
  'industrial-engineering': require('../../assets/home-cards/industrial-engineering-card.png'),
  maintenance: require('../../assets/home-cards/maintenance-card.png'),
  vacancies: require('../../assets/home-cards/vacancies-card.png'),
  orders: require('../../assets/home-cards/orders-card.png'),
  shop: require('../../assets/home-cards/shop-card.png'),
};

export const HomeScreen = ({ onMenuPress, onCategoryPress }: HomeScreenProps) => {
  const { userLocation, setUserLocation } = useAppStore();
  const isLocationBlockVisible = false;
  const categories = useMemo<HomeCategory[]>(
    () => [
      { id: 'services', title: 'Вызвать мастера', route: 'Services' },
      { id: 'emergency', title: 'Экстренный мастер', route: 'Emergency' },
      { id: 'estimate', title: 'Сметмастер', route: 'Estimate' },
      { id: 'industrial-engineering', title: 'Индустриальная инженерия', route: 'IndustrialEngineering' },
      { id: 'maintenance', title: 'Обслуживание', route: 'Maintenance' },
      { id: 'vacancies', title: 'Вакансии', route: 'Vacancies' },
      { id: 'orders', title: 'Мои заявки', route: 'Orders' },
      { id: 'shop', title: 'Магазин', route: 'Shop' },
    ],
    []
  );

  const categoriesWithImages = useMemo<HomeCategory[]>(
    () =>
      categories.map((category) => ({
        ...category,
        image: homeCardImages[category.id],
      })),
    [categories]
  );

  const quickAccessItems = useMemo<QuickAccessItem[]>(
    () => [
      { id: 'qa-emergency', label: 'Экстренный мастер', icon: '🚨' },
      { id: 'qa-estimate', label: 'Сметмастер', icon: '📐' },
      { id: 'qa-navigation', label: 'Навигация', icon: '🧭' },
      { id: 'qa-electrician', label: 'Электрик', icon: '💡' },
      { id: 'qa-plumber', label: 'Сантехник', icon: '🚿' },
      { id: 'qa-welder', label: 'Сварщик', icon: '🛠️' },
    ],
    []
  );

  const bannerCards = useMemo(
    () => ({
      hero: { title: 'Сезонные акции', subtitle: 'Скидки до 30% на монтаж', icon: '🔥', color: '#DCE7FF' },
      square: { title: 'Популярные мастера', subtitle: 'Проверенные профи рядом', icon: '⭐', color: '#FFE8D9' },
      small: { title: 'Быстро', subtitle: 'Выезд за 30 минут', icon: '⚡', color: '#DBF5EA' },
      vertical: { title: 'Рассрочка', subtitle: 'Удобная оплата услуг', icon: '💳', color: '#F0E6FF' },
      leftBottom: { title: 'Дом', subtitle: 'Умные решения', icon: '🏠', color: '#E1F0FF' },
      rightBottom: { title: 'Офис', subtitle: 'Сервис для бизнеса', icon: '🏢', color: '#FDEBD7' },
    }),
    []
  );

  return (
    <View style={styles.root}>
      <AppHeader onMenuPress={onMenuPress} isHome />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLocationBlockVisible ? (
          <View style={styles.locationBlock}>
            <Text style={styles.locationTitle}>Укажите местоположение</Text>
            <Text style={styles.locationSubtitle}>Чтобы найти мастеров рядом</Text>
            <LocationPicker title="Местоположение" value={userLocation} onChange={(next) => void setUserLocation(next)} />
          </View>
        ) : null}

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Найти услугу или мастера</Text>
        </View>

        <CompactCardGrid items={categoriesWithImages} onItemPress={onCategoryPress} />

        <QuickAccessRibbon
          items={quickAccessItems}
          onItemPress={(item) => {
            console.log('[HomeScreen] Quick access pressed:', item.id);
          }}
        />

        <View style={styles.bannerSection}>
          <Pressable style={[styles.bannerCard, styles.bannerHero, { backgroundColor: bannerCards.hero.color }]}>
            <Text style={styles.bannerIcon}>{bannerCards.hero.icon}</Text>
            <Text style={styles.bannerTitle}>{bannerCards.hero.title}</Text>
            <Text style={styles.bannerSubtitle}>{bannerCards.hero.subtitle}</Text>
          </Pressable>

          <View style={styles.bannerSecondRow}>
            <Pressable
              style={[styles.bannerCard, styles.bannerSquare, { backgroundColor: bannerCards.square.color }]}
            >
              <Text style={styles.bannerIcon}>{bannerCards.square.icon}</Text>
              <Text style={styles.bannerTitle}>{bannerCards.square.title}</Text>
              <Text style={styles.bannerSubtitle}>{bannerCards.square.subtitle}</Text>
            </Pressable>

            <View style={styles.bannerRightColumn}>
              <Pressable
                style={[styles.bannerCard, styles.bannerSmall, { backgroundColor: bannerCards.small.color }]}
              >
                <Text style={styles.bannerIcon}>{bannerCards.small.icon}</Text>
                <Text style={styles.bannerTitle}>{bannerCards.small.title}</Text>
                <Text style={styles.bannerSubtitle}>{bannerCards.small.subtitle}</Text>
              </Pressable>

              <Pressable
                style={[styles.bannerCard, styles.bannerVertical, { backgroundColor: bannerCards.vertical.color }]}
              >
                <Text style={styles.bannerIcon}>{bannerCards.vertical.icon}</Text>
                <Text style={styles.bannerTitle}>{bannerCards.vertical.title}</Text>
                <Text style={styles.bannerSubtitle}>{bannerCards.vertical.subtitle}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.bannerThirdRow}>
            <Pressable
              style={[styles.bannerCard, styles.bannerThirdItem, { backgroundColor: bannerCards.leftBottom.color }]}
            >
              <Text style={styles.bannerIcon}>{bannerCards.leftBottom.icon}</Text>
              <Text style={styles.bannerTitle}>{bannerCards.leftBottom.title}</Text>
              <Text style={styles.bannerSubtitle}>{bannerCards.leftBottom.subtitle}</Text>
            </Pressable>

            <Pressable
              style={[styles.bannerCard, styles.bannerThirdItem, { backgroundColor: bannerCards.rightBottom.color }]}
            >
              <Text style={styles.bannerIcon}>{bannerCards.rightBottom.icon}</Text>
              <Text style={styles.bannerTitle}>{bannerCards.rightBottom.title}</Text>
              <Text style={styles.bannerSubtitle}>{bannerCards.rightBottom.subtitle}</Text>
            </Pressable>
          </View>
        </View>
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
  bannerSection: {
    marginTop: 14,
    gap: 10,
  },
  bannerSecondRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bannerThirdRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bannerRightColumn: {
    flex: 1,
    aspectRatio: 1,
    gap: 10,
  },
  bannerCard: {
    borderRadius: 16,
    padding: 12,
    justifyContent: 'flex-end',
  },
  bannerHero: {
    width: '100%',
    minHeight: 130,
  },
  bannerSquare: {
    flex: 1,
    aspectRatio: 1,
  },
  bannerSmall: {
    flex: 0.42,
  },
  bannerVertical: {
    flex: 0.58,
  },
  bannerThirdItem: {
    flex: 1,
    minHeight: 118,
  },
  bannerIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D2A44',
  },
  bannerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#445577',
  },
});
