import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppStore } from '../store/AppStore';

export const MasterDashboardScreen = () => {
  const { masterOnline, toggleMasterOnline, requests, createOffer } = useAppStore();
  const newRequests = requests.filter((item) => item.status === 'new');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14 }}>
      <View style={styles.onlineBlock}>
        <Text style={styles.title}>Я на линии</Text>
        <Switch value={masterOnline} onValueChange={() => void toggleMasterOnline()} />
      </View>

      <Text style={styles.subtitle}>Новые заявки</Text>
      {newRequests.length === 0 ? (
        <Text style={styles.empty}>Пока нет новых заявок.</Text>
      ) : (
        newRequests.map((request) => (
          <View key={request.id} style={styles.card}>
            <Text style={styles.name}>{request.contact.name}</Text>
            <Text>{request.contact.phone}</Text>
            <Text>{request.contact.address}</Text>
            <Text style={styles.price}>Сумма: {request.totalPrice} ₽</Text>
            <Pressable style={styles.button} onPress={() => void createOffer(request.id)}>
              <Text style={styles.buttonText}>Откликнуться</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5FA' },
  onlineBlock: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  empty: { color: '#666' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  price: { marginTop: 6, fontWeight: '600' },
  button: { marginTop: 10, backgroundColor: '#0E5BF2', borderRadius: 8, paddingVertical: 9 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' }
});
