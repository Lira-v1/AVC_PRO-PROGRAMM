import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CreateRequestScreen } from '../screens/CreateRequestScreen';
import { HomeCategory, HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegistrationScreen } from '../screens/RegistrationScreen';
import { ServicesScreen, ServiceCategory } from '../screens/ServicesScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { PlatformPlaceholderScreen } from '../screens/PlatformPlaceholderScreen';
import { DrawerMenuProvider, useDrawerMenu } from './DrawerMenuContext';

type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Services: undefined;
  Category: { title: string; category: string };
  Emergency: undefined;
  Estimate: undefined;
  Commercial: undefined;
  Maintenance: undefined;
  Vacancies: undefined;
  Orders: undefined;
  Shop: undefined;
  CreateRequest: undefined;
  Login: undefined;
  Registration: undefined;
  Placeholder: { title: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

type DrawerItem = {
  label: string;
  action: () => void;
};

const SPLASH_DURATION_MS = 1800;

const SplashScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.splashContainer}>
      <Image source={require('../../assets/splash.png')} style={styles.splashImage} resizeMode="contain" />
    </View>
  );
};

const DrawerSheet = ({ visible, onClose, items }: { visible: boolean; onClose: () => void; items: DrawerItem[] }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.drawerOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.drawerPanel}>
        <Text style={styles.drawerTitle}>Меню</Text>
        {items.map((item) => (
          <Pressable
            key={item.label}
            style={styles.drawerItem}
            onPress={() => {
              onClose();
              item.action();
            }}
          >
            <Text style={styles.drawerItemText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  </Modal>
);

const HomeContainerScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const openDrawer = useDrawerMenu();

  const onCategoryPress = (category: HomeCategory) => {
    navigation.navigate(category.route);
  };

  return <HomeScreen onMenuPress={openDrawer} onCategoryPress={onCategoryPress} />;
};

const ServicesContainerScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const openDrawer = useDrawerMenu();

  const onCategoryPress = (category: ServiceCategory) => {
    navigation.navigate('Category', { title: category.title, category: category.category });
  };

  return <ServicesScreen onMenuPress={openDrawer} onCategoryPress={onCategoryPress} />;
};

export const RootNavigator = () => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const navigate = (name: keyof RootStackParamList, params?: RootStackParamList[keyof RootStackParamList]) => {
    if (!navigationRef.isReady()) {
      return;
    }

    if (typeof params !== 'undefined') {
      (navigationRef.navigate as any)(name, params);
      return;
    }

    (navigationRef.navigate as any)(name);
  };

  const drawerItems: DrawerItem[] = useMemo(
    () => [
      { label: 'Профиль / Войти', action: () => navigate('Login') },
      { label: 'Мои заказы', action: () => navigate('Orders') },
      { label: 'Сметмастер', action: () => navigate('Estimate') },
      { label: 'Договоры', action: () => navigate('Placeholder', { title: 'Договоры' }) },
      { label: 'Гарантия', action: () => navigate('Placeholder', { title: 'Гарантия' }) },
      { label: 'Стать мастером', action: () => navigate('Registration') },
      { label: 'Помощь', action: () => navigate('Placeholder', { title: 'Помощь' }) },
      { label: 'Настройки', action: () => navigate('Placeholder', { title: 'Настройки' }) },
    ],
    []
  );

  return (
    <DrawerMenuProvider value={() => setDrawerOpen(true)}>
      <NavigationContainer ref={navigationRef}>
        <RootStack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Splash" component={SplashScreen} />
          <RootStack.Screen name="Home" component={HomeContainerScreen} />
          <RootStack.Screen name="Services" component={ServicesContainerScreen} />
          <RootStack.Screen
            name="Category"
            children={({ navigation, route }) => (
              <CategoryScreen navigation={navigation} route={route} onMenuPress={() => setDrawerOpen(true)} />
            )}
          />
          <RootStack.Screen name="Emergency" children={({ route }) => <PlatformPlaceholderScreen route={{ params: { title: 'Экстренный мастер' } }} />} />
          <RootStack.Screen name="Estimate" children={() => <PlatformPlaceholderScreen route={{ params: { title: 'Сметмастер' } }} />} />
          <RootStack.Screen name="Commercial" children={() => <PlatformPlaceholderScreen route={{ params: { title: 'Коммерция' } }} />} />
          <RootStack.Screen name="Maintenance" children={() => <PlatformPlaceholderScreen route={{ params: { title: 'Обслуживание' } }} />} />
          <RootStack.Screen name="Vacancies" children={() => <PlatformPlaceholderScreen route={{ params: { title: 'Вакансии' } }} />} />
          <RootStack.Screen name="Orders" children={() => <PlatformPlaceholderScreen route={{ params: { title: 'Мои заявки' } }} />} />
          <RootStack.Screen name="Shop" children={() => <PlatformPlaceholderScreen route={{ params: { title: 'Магазин' } }} />} />
          <RootStack.Screen name="CreateRequest" component={CreateRequestScreen} />
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Registration" component={RegistrationScreen} />
          <RootStack.Screen name="Placeholder" component={PlatformPlaceholderScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
      <DrawerSheet visible={isDrawerOpen} onClose={() => setDrawerOpen(false)} items={drawerItems} />
    </DrawerMenuProvider>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  splashImage: {
    width: '100%',
    height: '50%',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
  },
  drawerPanel: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: '#fff',
    height: '100%',
    paddingTop: 52,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 18,
    color: '#101623',
  },
  drawerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F7',
  },
  drawerItemText: {
    fontSize: 16,
    color: '#202a3f',
    fontWeight: '500',
  },
});
