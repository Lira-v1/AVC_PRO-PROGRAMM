import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { CreateRequestScreen } from '../screens/CreateRequestScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegistrationScreen } from '../screens/RegistrationScreen';

type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  CreateRequest: undefined;
  Login: undefined;
  Registration: undefined;
  Profile: undefined;
  Menu: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const SplashScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Splash Screen</Text>
    </View>
  );
};

const HomeScreen = () => (
  <View style={styles.centered}>
    <Text style={styles.title}>Home Screen</Text>
    <Text style={styles.subtitle}>Гостевой режим включён</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.centered}>
    <Text style={styles.title}>Profile Screen</Text>
    <Text style={styles.subtitle}>Временный экран профиля</Text>
  </View>
);

const DrawerMenuScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.menuContainer}>
      <Text style={styles.title}>Меню</Text>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.menuItemText}>Главная</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('CreateRequest')}>
        <Text style={styles.menuItemText}>Создать заявку</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.menuItemText}>Профиль</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.menuItemText}>Вход</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Registration')}>
        <Text style={styles.menuItemText}>Регистрация</Text>
      </TouchableOpacity>
    </View>
  );
};

const MenuButton = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity onPress={() => navigation.navigate('Menu')} style={styles.menuButton}>
      <Text style={styles.menuButtonText}>☰ Меню</Text>
    </TouchableOpacity>
  );
};

export const RootNavigator = () => (
  <NavigationContainer>
    <RootStack.Navigator initialRouteName="Splash">
      <RootStack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <RootStack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Главная',
          headerRight: () => <MenuButton />,
        }}
      />
      <RootStack.Screen name="CreateRequest" component={CreateRequestScreen} options={{ title: 'Создать заявку' }} />
      <RootStack.Screen name="Login" component={LoginScreen} options={{ title: 'Вход' }} />
      <RootStack.Screen name="Registration" component={RegistrationScreen} options={{ title: 'Регистрация' }} />
      <RootStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
      <RootStack.Screen
        name="Menu"
        component={DrawerMenuScreen}
        options={{
          title: 'Боковое меню',
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </RootStack.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  menuButton: {
    marginRight: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  menuItem: {
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
