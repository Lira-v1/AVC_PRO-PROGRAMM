import React, { useEffect, useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CreateRequestScreen } from '../screens/CreateRequestScreen';
import { HomeCategory, HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegistrationScreen } from '../screens/RegistrationScreen';

type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  CreateRequest: undefined;
  Login: undefined;
  Registration: undefined;
  Placeholder: { title: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

type DrawerItem = {
  label: string;
  action: (navigation: NativeStackNavigationProp<RootStackParamList>) => void;
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

const DrawerSheet = ({
  visible,
  onClose,
  items,
  navigation,
}: {
  visible: boolean;
  onClose: () => void;
  items: DrawerItem[];
  navigation: NativeStackNavigationProp<RootStackParamList>;
}) => (
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
              item.action(navigation);
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
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const drawerItems: DrawerItem[] = [
    { label: 'Профиль / Войти', action: (nav) => nav.navigate('Login') },
    { label: 'Мои заказы', action: (nav) => nav.navigate('Placeholder', { title: 'Мои заказы' }) },
    { label: 'Сметмастер', action: (nav) => nav.navigate('Placeholder', { title: 'Сметмастер' }) },
    { label: 'Договоры', action: (nav) => nav.navigate('Placeholder', { title: 'Договоры' }) },
    { label: 'Гарантия', action: (nav) => nav.navigate('Placeholder', { title: 'Гарантия' }) },
    { label: 'Стать мастером', action: (nav) => nav.navigate('Registration') },
    { label: 'Помощь', action: (nav) => nav.navigate('Placeholder', { title: 'Помощь' }) },
    { label: 'Настройки', action: (nav) => nav.navigate('Placeholder', { title: 'Настройки' }) },
  ];

  const onCategoryPress = (category: HomeCategory) => {
    if (category.route === 'CreateRequest') {
      navigation.navigate('CreateRequest');
      return;
    }

    navigation.navigate('Placeholder', { title: category.placeholderTitle ?? category.title });
  };

  return (
    <>
      <HomeScreen onMenuPress={() => setDrawerOpen(true)} onCategoryPress={onCategoryPress} />
      <DrawerSheet visible={isDrawerOpen} onClose={() => setDrawerOpen(false)} items={drawerItems} navigation={navigation} />
    </>
  );
};

const PlaceholderScreen = ({ route }: { route: { params: { title: string } } }) => (
  <View style={styles.centered}>
    <Text style={styles.title}>{route.params.title}</Text>
    <Text style={styles.subtitle}>Экран в разработке</Text>
  </View>
);

export const RootNavigator = () => (
  <NavigationContainer>
    <RootStack.Navigator initialRouteName="Splash">
      <RootStack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="Home" component={HomeContainerScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="CreateRequest" component={CreateRequestScreen} options={{ title: 'Создать заявку' }} />
      <RootStack.Screen name="Login" component={LoginScreen} options={{ title: 'Вход' }} />
      <RootStack.Screen name="Registration" component={RegistrationScreen} options={{ title: 'Регистрация' }} />
      <RootStack.Screen name="Placeholder" component={PlaceholderScreen} options={({ route }) => ({ title: route.params.title })} />
    </RootStack.Navigator>
  </NavigationContainer>
);

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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F3F5FA',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#555',
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
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  drawerItem: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 8,
    backgroundColor: '#f4f6fb',
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#17213b',
  },
});
