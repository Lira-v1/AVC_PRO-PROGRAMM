import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useAppStore } from '../store/AppStore';

export const CreateRequestScreen = () => {
  const { cart, createRequest } = useAppStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  const submit = async () => {
    if (!name || !phone || !address) {
      Alert.alert('Заполните обязательные поля');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Добавьте услуги в корзину');
      return;
    }

    await createRequest({ name, phone, address, comment, preferredTime });
    setName('');
    setPhone('');
    setAddress('');
    setComment('');
    setPreferredTime('');
    Alert.alert('Готово', 'Заявка создана со статусом new');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14 }}>
      <TextInput style={styles.input} placeholder="Имя" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Телефон" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Адрес" value={address} onChangeText={setAddress} />
      <TextInput style={styles.input} placeholder="Комментарий" value={comment} onChangeText={setComment} multiline />
      <TextInput style={styles.input} placeholder="Удобное время (опционально)" value={preferredTime} onChangeText={setPreferredTime} />

      <Pressable style={styles.button} onPress={() => void submit()}>
        <Text style={styles.buttonText}>Создать заявку</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5FA' },
  input: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10 },
  button: { backgroundColor: '#0E5BF2', borderRadius: 10, paddingVertical: 13, marginTop: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' }
});
