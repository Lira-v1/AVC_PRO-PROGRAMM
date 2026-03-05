import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ServiceCard } from '../components/ServiceCard';
import { groupByCategory } from '../services/pricing';
import { useAppStore } from '../store/AppStore';

const grouped = groupByCategory();

export const ClientCatalogScreen = () => {
  const { addToCart, policy } = useAppStore();

  return (
    <ScrollView style={styles.container}>
      {Object.entries(grouped).map(([category, services]) => (
        <View key={category} style={styles.section}>
          <Text style={styles.heading}>{category}</Text>
          {services.map((service) => (
            <ServiceCard key={service.id} item={service} policy={policy} onAdd={() => addToCart(service.id)} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F5FA' },
  section: { paddingHorizontal: 14, paddingTop: 16 },
  heading: { fontSize: 18, fontWeight: '800', marginBottom: 10 }
});
