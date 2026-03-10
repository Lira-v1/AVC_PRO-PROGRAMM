import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { useAppStore } from '../store/AppStore';

export const RegistrationScreen = () => {
  const navigation = useNavigation();
  const { completeRegistration } = useAppStore();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isCodeStep, setIsCodeStep] = useState(false);

  const requestSmsCode = () => {
    if (!phone.trim()) {
      Alert.alert('Введите номер телефона');
      return;
    }

    setIsCodeStep(true);
    Alert.alert('SMS отправлен', 'Введите код подтверждения');
  };

  const confirmRegistration = async () => {
    if (!code.trim()) {
      Alert.alert('Введите SMS-код');
      return;
    }

    await completeRegistration();
    Alert.alert('Готово', 'Регистрация успешно завершена');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Регистрация" />
      <View style={styles.content}>
        <Text style={styles.title}>Регистрация</Text>

        <TextInput
          style={styles.input}
          placeholder="Номер телефона"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {isCodeStep && (
          <TextInput
            style={styles.input}
            placeholder="SMS-код"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
        )}

        {!isCodeStep ? (
          <Pressable style={styles.button} onPress={requestSmsCode}>
            <Text style={styles.buttonText}>Получить SMS-код</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.button} onPress={() => void confirmRegistration()}>
            <Text style={styles.buttonText}>Подтвердить</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5FA',
  },
  content: {
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10
  },
  button: {
    backgroundColor: '#0E5BF2',
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 8
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700'
  }
});
