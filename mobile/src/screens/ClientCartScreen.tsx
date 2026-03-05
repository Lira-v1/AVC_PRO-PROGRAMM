import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PRICES, SERVICES } from '../constants/prices';
import { calculateTotal } from '../services/pricing';
import { useAppStore } from '../store/AppStore';

export const ClientCartScreen = () => {
  const { cart, policy, setPolicy, updateCartQuantity } = useAppStore();
  const total = calculateTotal(cart, policy);

  return (
    <View style={styles.container}>
      <View style={styles.policies}>
        {(['economy', 'comfort', 'business'] as const).map((item) => (
          <Pressable
            key={item}
            style={[styles.policyBtn, policy === item && styles.policyActive]}
            onPress={() => setPolicy(item)}
          >
            <Text style={[styles.policyText, policy === item && styles.policyTextActive]}>
              {item === 'economy' ? 'Эконом' : item === 'comfort' ? 'Комфорт' : 'Бизнес'}
            </Text>
          </Pressable>
        ))}
      </View>

      {cart.length === 0 ? (
        <Text style={styles.empty}>Корзина пустая</Text>
      ) : (
        cart.map((item) => {
          const service = SERVICES.find((s) => s.id === item.serviceId);
          if (!service) return null;
          return (
            <View key={item.serviceId} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.service}>{service.title}</Text>
                <Text style={styles.meta}>{PRICES[item.serviceId][policy]} ₽ × {item.quantity}</Text>
              </View>
              <View style={styles.qtyBox}>
                <Pressable onPress={() => updateCartQuantity(item.serviceId, item.quantity - 1)}><Text>-</Text></Pressable>
                <Text style={styles.qty}>{item.quantity}</Text>
                <Pressable onPress={() => updateCartQuantity(item.serviceId, item.quantity + 1)}><Text>+</Text></Pressable>
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.total}>Итого: {total} ₽</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: '#F3F5FA' },
  policies: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  policyBtn: { borderWidth: 1, borderColor: '#c6ccdc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  policyActive: { borderColor: '#0E5BF2', backgroundColor: '#0E5BF2' },
  policyText: { color: '#27324c' },
  policyTextActive: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 30, color: '#666' },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  service: { fontWeight: '600' },
  meta: { color: '#555', marginTop: 4 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8 },
  qty: { minWidth: 20, textAlign: 'center', fontWeight: '700' },
  total: { fontSize: 18, fontWeight: '800', marginTop: 'auto' }
});
