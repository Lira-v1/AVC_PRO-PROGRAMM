import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CardinalDirection, Wall } from '../types';

const WALL_LABELS: Record<CardinalDirection, string> = {
  north: 'Север',
  east: 'Восток',
  south: 'Юг',
  west: 'Запад',
};

type RoomWallsTabsProps = {
  walls: Wall[];
  selectedWallId: string | null;
  onSelect: (wallId: string) => void;
};

export const RoomWallsTabs = ({ walls, selectedWallId, onSelect }: RoomWallsTabsProps) => (
  <View style={styles.root}>
    {walls.map((wall) => {
      const isActive = selectedWallId === wall.id;
      return (
        <Pressable key={wall.id} style={[styles.tab, isActive ? styles.tabActive : null]} onPress={() => onSelect(wall.id)}>
          <Text style={[styles.text, isActive ? styles.textActive : null]}>{WALL_LABELS[wall.cardinal]}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  root: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tab: { borderWidth: 1, borderColor: '#BBC5DC', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  tabActive: { borderColor: '#2750BA', backgroundColor: '#E8EEFF' },
  text: { color: '#2A3756', fontSize: 13, fontWeight: '600' },
  textActive: { color: '#2449A7' },
});
