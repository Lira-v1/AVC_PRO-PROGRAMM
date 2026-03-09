import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/AppStore';

export const LoginScreen = () => {
  const { setRole } = useAppStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход</Text>
      <Text style={styles.subtitle}>Выберите режим работы</Text>

      <Pressable style={styles.button} onPress={() => setRole('client')}>
        <Text style={styles.buttonText}>Войти как клиент</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setRole('master')}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Войти как мастер</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5FA',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0E5BF2',
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0E5BF2',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#0E5BF2',
  },
});
