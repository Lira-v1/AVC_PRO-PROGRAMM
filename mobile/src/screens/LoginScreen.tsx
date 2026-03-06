import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/AppStore';

const SPLASH_DURATION_MS = 1800;

const SplashScreen = () => (
  <View style={styles.splashContainer}>
    <Image source={require('../../assets/splash.png')} style={styles.splashImage} resizeMode="contain" />
  </View>
);

const RoleSelectionScreen = ({ onSelectRole }: { onSelectRole: (role: 'client' | 'master') => void }) => (
  <View style={styles.container}>
    <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
    <Text style={styles.title}>MasterPro</Text>
    <Text style={styles.subtitle}>Выберите роль для входа</Text>

    <Pressable style={styles.button} onPress={() => onSelectRole('client')}>
      <Text style={styles.buttonText}>Я клиент</Text>
    </Pressable>
    <Pressable style={styles.button} onPress={() => onSelectRole('master')}>
      <Text style={styles.buttonText}>Я мастер</Text>
    </Pressable>
  </View>
);

export const LoginScreen = () => {
  const { setRole } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return <RoleSelectionScreen onSelectRole={setRole} />;
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24
  },
  splashImage: {
    width: '100%',
    height: '50%'
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 20
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
    color: '#111111'
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 28
  },
  button: {
    width: '100%',
    backgroundColor: '#0E5BF2',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700'
  }
});
