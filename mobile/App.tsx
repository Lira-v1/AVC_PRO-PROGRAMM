import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppStoreProvider } from './src/store/AppStore';

export default function App() {
  return (
    <AppStoreProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AppStoreProvider>
  );
}
