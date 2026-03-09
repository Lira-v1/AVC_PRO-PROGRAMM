import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useAppStore } from '../store/AppStore';

const SPLASH_DURATION_MS = 1800;

export const LoginScreen = () => {
  const { setRole } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      setRole('client');
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [setRole]);

  if (!showSplash) {
    return null;
  }

  return (
    <View style={styles.splashContainer}>
      <Image source={require('../../assets/splash.png')} style={styles.splashImage} resizeMode="contain" />
    </View>
  );
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
  }
});
