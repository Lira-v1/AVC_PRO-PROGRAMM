import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createFloorPlane } from '../model/floor';
import { DEFAULT_PROJECT_ORIENTATION } from '../model/orientation';
import { ProjectOrientation, Room } from '../types';

type FloorViewProps = {
  room: Room;
  orientation?: ProjectOrientation;
};

export const FloorView = ({ room, orientation }: FloorViewProps) => {
  const plane = createFloorPlane(room);
  const labels = { ...DEFAULT_PROJECT_ORIENTATION, ...orientation };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{room.name} — Пол</Text>
      <Text style={styles.meta}>Размер плоскости: {Math.round(plane.width * 100) / 100}м × {Math.round(plane.height * 100) / 100}м</Text>

      <View style={styles.planeContainer}>
        <Text style={styles.north}>{labels.northLabel}</Text>
        <Text style={styles.south}>{labels.southLabel}</Text>
        <Text style={styles.east}>{labels.eastLabel}</Text>
        <Text style={styles.west}>{labels.westLabel}</Text>
        <View style={styles.plane}>
          <Text style={styles.planeLabel}>Плоскость пола</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D7DEEE', padding: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#1C2743' },
  meta: { fontSize: 12, color: '#5E7094', marginTop: 4, marginBottom: 10 },
  planeContainer: { borderWidth: 1, borderColor: '#CED7EB', borderRadius: 10, padding: 14, position: 'relative', minHeight: 260, justifyContent: 'center', alignItems: 'center' },
  plane: { width: '76%', aspectRatio: 1.2, borderWidth: 2, borderColor: '#2F7D56', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  planeLabel: { fontSize: 13, fontWeight: '600', color: '#2F7D56' },
  north: { position: 'absolute', top: 10, alignSelf: 'center', fontSize: 12, color: '#4A5F8C', fontWeight: '700' },
  south: { position: 'absolute', bottom: 10, alignSelf: 'center', fontSize: 12, color: '#4A5F8C', fontWeight: '700' },
  east: { position: 'absolute', right: 12, top: '50%', fontSize: 12, color: '#4A5F8C', fontWeight: '700' },
  west: { position: 'absolute', left: 12, top: '50%', fontSize: 12, color: '#4A5F8C', fontWeight: '700' },
});
