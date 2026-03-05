import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/AppStore';

export const LoginScreen = () => {
  const { setRole } = useAppStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AVC PRO</Text>
      <Text style={styles.subtitle}>Выберите роль для демо-входа</Text>
      <Pressable style={styles.button} onPress={() => setRole('client')}>
        <Text style={styles.buttonText}>Войти как Client</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => setRole('master')}>
        <Text style={styles.buttonText}>Войти как Master</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#F3F5FA' },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 24, color: '#666' },
  button: {
    backgroundColor: '#0E5BF2',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' }
});
