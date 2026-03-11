import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CardinalDirection, Wall } from '../types';

const WALL_LABELS: Record<CardinalDirection, string> = {
  north: 'Северная стена',
  east: 'Восточная стена',
  south: 'Южная стена',
  west: 'Западная стена',
};

type WallViewHeaderProps = {
  roomName: string;
  wall: Wall;
};

export const WallViewHeader = ({ roomName, wall }: WallViewHeaderProps) => (
  <View style={styles.root}>
    <Text style={styles.title}>{roomName}</Text>
    <Text style={styles.subtitle}>{WALL_LABELS[wall.cardinal]}</Text>
    <Text style={styles.meta}>Длина: {Math.round((wall.length ?? 0) * 10) / 10}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#1C2743' },
  subtitle: { fontSize: 14, fontWeight: '600', color: '#33466E', marginTop: 2 },
  meta: { fontSize: 12, color: '#5E7094', marginTop: 2 },
});
