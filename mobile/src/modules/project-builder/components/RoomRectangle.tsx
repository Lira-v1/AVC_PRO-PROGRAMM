import React, { useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Room, ROOM_TYPE_LABELS } from '../types';

type RoomRectangleProps = {
  room: Room;
  isSelected: boolean;
  canInteract: boolean;
  onSelect: (roomId: string) => void;
  onMove: (roomId: string, x: number, y: number) => void;
  onResize: (roomId: string, width: number, height: number) => void;
  onDoublePress?: (roomId: string) => void;
};

const DOUBLE_PRESS_MS = 260;

export const RoomRectangle = ({ room, isSelected, canInteract, onSelect, onMove, onResize, onDoublePress }: RoomRectangleProps) => {
  const dragOriginRef = useRef({ x: room.x, y: room.y });
  const resizeOriginRef = useRef({ width: room.width, height: room.height });
  const lastPressRef = useRef(0);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canInteract,
        onMoveShouldSetPanResponder: () => canInteract,
        onPanResponderGrant: () => {
          dragOriginRef.current = { x: room.x, y: room.y };
          onSelect(room.id);
        },
        onPanResponderMove: (_, gestureState) => {
          onMove(room.id, dragOriginRef.current.x + gestureState.dx, dragOriginRef.current.y + gestureState.dy);
        },
      }),
    [canInteract, onMove, onSelect, room.id, room.x, room.y],
  );

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canInteract,
        onMoveShouldSetPanResponder: () => canInteract,
        onPanResponderGrant: () => {
          resizeOriginRef.current = { width: room.width, height: room.height };
          onSelect(room.id);
        },
        onPanResponderMove: (_, gestureState) => {
          onResize(room.id, resizeOriginRef.current.width + gestureState.dx, resizeOriginRef.current.height + gestureState.dy);
        },
      }),
    [canInteract, onResize, onSelect, room.height, room.id, room.width],
  );

  const handlePress = () => {
    const now = Date.now();
    if (now - lastPressRef.current < DOUBLE_PRESS_MS) {
      onDoublePress?.(room.id);
    }
    lastPressRef.current = now;
    onSelect(room.id);
  };

  return (
    <Pressable
      {...dragResponder.panHandlers}
      onPress={handlePress}
      style={[styles.room, isSelected ? styles.roomSelected : null, { left: room.x, top: room.y, width: room.width, height: room.height }]}
    >
      <Text style={styles.roomName}>{ROOM_TYPE_LABELS[room.type]}</Text>
      {canInteract ? <View style={styles.resizeHandle} {...resizeResponder.panHandlers} /> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  room: {
    position: 'absolute',
    backgroundColor: '#F7FAFF',
    borderColor: '#2A3756',
    borderWidth: 2,
    borderRadius: 4,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomSelected: {
    borderColor: '#2D5ED2',
    backgroundColor: '#EDF3FF',
  },
  roomName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E2A46',
    textAlign: 'center',
  },
  resizeHandle: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2D5ED2',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
