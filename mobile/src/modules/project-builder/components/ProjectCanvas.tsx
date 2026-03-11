import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Room } from '../types';
import { RoomRectangle } from './RoomRectangle';

type ProjectCanvasProps = {
  rooms: Room[];
};

export const ProjectCanvas = ({ rooms }: ProjectCanvasProps) => {
  return (
    <View style={styles.canvas}>
      {rooms.length === 0 ? <Text style={styles.hint}>Добавьте комнату, чтобы начать проект</Text> : null}
      {rooms.map((room) => (
        <RoomRectangle key={room.id} room={room} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7DEEE',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 360,
  },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    color: '#8190B2',
    fontSize: 14,
  },
});
