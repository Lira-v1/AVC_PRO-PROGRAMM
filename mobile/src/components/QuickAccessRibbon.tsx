import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type QuickAccessItem = {
  id: string;
  label: string;
  icon: string;
};

type QuickAccessRibbonProps = {
  items: QuickAccessItem[];
  onItemPress: (item: QuickAccessItem) => void;
};

export const QuickAccessRibbon = ({ items, onItemPress }: QuickAccessRibbonProps) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Лента быстрого доступа</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <Pressable key={item.id} style={styles.card} onPress={() => onItemPress(item)}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5EAF4',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27334A',
    marginBottom: 10,
  },
  scrollContent: {
    paddingRight: 6,
    gap: 10,
  },
  card: {
    width: 86,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: '#33415C',
    fontWeight: '500',
  },
});
