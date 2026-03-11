import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Room } from '../types';

type RoomRectangleProps = {
  room: Room;
};

export const RoomRectangle = ({ room }: RoomRectangleProps) => {
  return (
    <View
      style={[
        styles.room,
        {
          left: room.x,
          top: room.y,
          width: room.width,
          height: room.height,
        },
      ]}
    >
      <Text style={styles.roomName}>{room.name}</Text>
      <Text style={styles.roomMeta}>id: {room.id}</Text>
      <Text style={styles.roomMeta}>type: {room.type}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  room: {
    position: 'absolute',
    backgroundColor: '#E4ECFF',
    borderColor: '#4B7BE5',
    borderWidth: 2,
    borderRadius: 8,
    padding: 8,
  },
  roomName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E2A46',
    marginBottom: 4,
  },
  roomMeta: {
    fontSize: 11,
    color: '#2D3E63',
  },
});
