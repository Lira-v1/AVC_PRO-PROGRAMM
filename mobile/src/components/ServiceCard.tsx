import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PricingPolicy, ServiceItem } from '../types';
import { getPrice } from '../services/pricing';

type Props = {
  item: ServiceItem;
  policy: PricingPolicy;
  onAdd: () => void;
};

export const ServiceCard = ({ item, policy, onAdd }: Props) => (
  <View style={styles.card}>
    <View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>
        {getPrice(item.id, policy)} ₽ / {item.unit}
      </Text>
    </View>
    <Pressable style={styles.button} onPress={onAdd}>
      <Text style={styles.buttonText}>Добавить</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { marginTop: 4, color: '#555' },
  button: {
    backgroundColor: '#0E5BF2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  buttonText: { color: '#fff', fontWeight: '700' }
});
