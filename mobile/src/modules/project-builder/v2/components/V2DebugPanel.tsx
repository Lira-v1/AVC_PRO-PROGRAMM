import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';

type Props = {
  room: RoomV2 | null;
};

export const V2DebugPanel = ({ room }: Props) => {
  if (!room) return null;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Debug комнаты</Text>
      <Text style={styles.line}>centerX: {Math.round(room.centerX)}</Text>
      <Text style={styles.line}>centerY: {Math.round(room.centerY)}</Text>
      <Text style={styles.line}>width: {Math.round(room.width)}</Text>
      <Text style={styles.line}>height: {Math.round(room.height)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2A45',
    marginBottom: 6,
  },
  line: {
    fontSize: 13,
    color: '#475569',
  },
});
