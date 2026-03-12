import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RoomV2 } from '../model/types';
import { V2Grid } from './V2Grid';
import { V2Room } from './V2Room';

type Props = {
  rooms: RoomV2[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onMoveRoom: (roomId: string, x: number, y: number) => void;
  onResizeRoom: (roomId: string, width: number, height: number) => void;
};

export const V2Canvas = ({ rooms, selectedRoomId, onSelectRoom, onMoveRoom, onResizeRoom }: Props) => {
  return (
    <View style={styles.canvas}>
      <V2Grid />
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {rooms.map((room) => (
          <V2Room
            key={room.id}
            room={room}
            selected={selectedRoomId === room.id}
            onSelect={onSelectRoom}
            onMove={onMoveRoom}
            onResize={onResizeRoom}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#F9FBFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5DEEF',
    overflow: 'hidden',
  },
});
