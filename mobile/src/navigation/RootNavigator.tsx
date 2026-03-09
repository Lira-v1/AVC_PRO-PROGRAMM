import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClientCartScreen } from '../screens/ClientCartScreen';
import { ClientCatalogScreen } from '../screens/ClientCatalogScreen';
import { CreateRequestScreen } from '../screens/CreateRequestScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MasterDashboardScreen } from '../screens/MasterDashboardScreen';
import { RegistrationScreen } from '../screens/RegistrationScreen';
import { useAppStore } from '../store/AppStore';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const ClientTabs = () => (
  <Tabs.Navigator>
    <Tabs.Screen name="Каталог" component={ClientCatalogScreen} />
    <Tabs.Screen name="Корзина" component={ClientCartScreen} />
    <Tabs.Screen name="Заявка" component={CreateRequestScreen} />
  </Tabs.Navigator>
);

const MasterTabs = () => (
  <Tabs.Navigator>
    <Tabs.Screen name="Заявки" component={MasterDashboardScreen} />
  </Tabs.Navigator>
);

export const RootNavigator = () => {
  const { role } = useAppStore();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!role ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : role === 'client' ? (
          <>
            <Stack.Screen name="ClientTabs" component={ClientTabs} options={{ title: 'Главная' }} />
            <Stack.Screen name="Registration" component={RegistrationScreen} options={{ title: 'Регистрация' }} />
          </>
        ) : (
          <Stack.Screen name="MasterTabs" component={MasterTabs} options={{ title: 'Мастер' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
