import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';

type IndustrialRouteName =
  | 'IndustrialMaintenance'
  | 'PumpStations'
  | 'BoilerRooms'
  | 'KIP'
  | 'Ventilation'
  | 'Refrigeration';

type IndustrialDirection = {
  id: string;
  title: string;
  route: IndustrialRouteName;
};

type IndustrialNavigation = NativeStackNavigationProp<Record<IndustrialRouteName, undefined>>;

type DirectionScreenProps = {
  title: string;
  services: string[];
};

const INDUSTRIAL_DIRECTIONS: IndustrialDirection[] = [
  { id: 'maintenance', title: 'Обслуживание', route: 'IndustrialMaintenance' },
  { id: 'pump-stations', title: 'Насосные станции', route: 'PumpStations' },
  { id: 'boiler-rooms', title: 'Котельные', route: 'BoilerRooms' },
  { id: 'kip', title: 'КИПиА', route: 'KIP' },
  { id: 'ventilation', title: 'Вентиляция', route: 'Ventilation' },
  { id: 'refrigeration', title: 'Холодильное оборудование', route: 'Refrigeration' },
];

const INDUSTRIAL_SERVICES: Record<IndustrialRouteName, string[]> = {
  IndustrialMaintenance: ['Плановое обслуживание', 'Аварийный выезд', 'Диагностика объекта', 'Сервисный договор'],
  PumpStations: [
    'Монтаж насосной станции',
    'Обслуживание насосной станции',
    'Диагностика насосов',
    'Автоматика насосной станции',
  ],
  BoilerRooms: ['Монтаж котельной', 'Обслуживание котельной', 'Диагностика оборудования', 'Автоматика котельной'],
  KIP: ['Монтаж датчиков', 'Настройка автоматики', 'Шкафы управления', 'Диспетчеризация'],
  Ventilation: ['Монтаж вентиляции', 'Обслуживание вентиляции', 'Чистка вентиляции', 'Диагностика системы'],
  Refrigeration: [
    'Монтаж оборудования',
    'Обслуживание оборудования',
    'Диагностика холодильной системы',
    'Ремонт холодильного оборудования',
  ],
};

const showTemporaryMessage = () => {
  Alert.alert('Раздел в разработке', 'Функция будет добавлена позже');
  console.log('Функция будет добавлена позже');
};

export const IndustrialEngineeringScreen = () => {
  const navigation = useNavigation<IndustrialNavigation>();
  const directions = useMemo(() => INDUSTRIAL_DIRECTIONS, []);

  return (
    <View style={styles.root}>
      <AppHeader title="Индустриальная инженерия" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>Индустриальная инженерия</Text>
          <Text style={styles.subtitle}>Промышленные и инженерные системы</Text>
        </View>

        <View style={styles.grid}>
          {directions.map((direction) => (
            <Pressable
              key={direction.id}
              style={styles.directionCard}
              onPress={() => navigation.navigate(direction.route)}
            >
              <View style={styles.iconPlaceholder} />
              <Text style={styles.directionTitle}>{direction.title}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const IndustrialDirectionScreen = ({ title, services }: DirectionScreenProps) => {
  return (
    <View style={styles.root}>
      <AppHeader title={title} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>
            Раздел находится в разработке. Здесь будет отображаться спектр услуг, исполнители и компании по данному направлению.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Спектр услуг</Text>
        <View style={styles.servicesGrid}>
          {services.map((service) => (
            <Pressable key={service} style={styles.serviceCard} onPress={showTemporaryMessage}>
              <Text style={styles.serviceTitle}>{service}</Text>
              <Text style={styles.serviceCaption}>Будет доступно позже</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export const IndustrialMaintenanceScreen = () => (
  <IndustrialDirectionScreen title="Обслуживание" services={INDUSTRIAL_SERVICES.IndustrialMaintenance} />
);

export const PumpStationsScreen = () => (
  <IndustrialDirectionScreen title="Насосные станции" services={INDUSTRIAL_SERVICES.PumpStations} />
);

export const BoilerRoomsScreen = () => (
  <IndustrialDirectionScreen title="Котельные" services={INDUSTRIAL_SERVICES.BoilerRooms} />
);

export const KIPScreen = () => <IndustrialDirectionScreen title="КИПиА" services={INDUSTRIAL_SERVICES.KIP} />;

export const VentilationScreen = () => (
  <IndustrialDirectionScreen title="Вентиляция" services={INDUSTRIAL_SERVICES.Ventilation} />
);

export const RefrigerationScreen = () => (
  <IndustrialDirectionScreen title="Холодильное оборудование" services={INDUSTRIAL_SERVICES.Refrigeration} />
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#101623',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#66708A',
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#66708A',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  directionCard: {
    width: '31.5%',
    minHeight: 78,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconPlaceholder: {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#EAF0FF',
    position: 'absolute',
    top: 8,
    right: 8,
  },
  directionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16213C',
    textAlign: 'center',
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#101623',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 88,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D2A44',
  },
  serviceCaption: {
    marginTop: 6,
    fontSize: 12,
    color: '#7C879D',
  },
});
