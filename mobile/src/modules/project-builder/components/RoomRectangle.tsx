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
  const isResizingRef = useRef(false);
  const lastPressRef = useRef(0);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canInteract,
        onMoveShouldSetPanResponder: () => canInteract,
        onPanResponderGrant: () => {
          if (isResizingRef.current) return;
          dragOriginRef.current = { x: room.x, y: room.y };
          onSelect(room.id);
        },
        onPanResponderMove: (_, gestureState) => {
          if (isResizingRef.current) return;
          onMove(room.id, dragOriginRef.current.x + gestureState.dx, dragOriginRef.current.y + gestureState.dy);
        },
        onPanResponderRelease: () => {
          isResizingRef.current = false;
        },
        onPanResponderTerminate: () => {
          isResizingRef.current = false;
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
          isResizingRef.current = true;
          resizeOriginRef.current = { width: room.width, height: room.height };
          onSelect(room.id);
        },
        onPanResponderMove: (_, gestureState) => {
          onResize(room.id, resizeOriginRef.current.width + gestureState.dx, resizeOriginRef.current.height + gestureState.dy);
        },
        onPanResponderRelease: () => {
          isResizingRef.current = false;
        },
        onPanResponderTerminate: () => {
          isResizingRef.current = false;
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
    <View style={[styles.roomRoot, { left: room.x, top: room.y, width: room.width, height: room.height }]} pointerEvents="box-none">
      <Pressable {...dragResponder.panHandlers} onPress={handlePress} style={[styles.room, isSelected ? styles.roomSelected : null]}>
        <View pointerEvents="none" style={styles.roomHeader}>
          <Text style={styles.roomName}>{room.name || ROOM_TYPE_LABELS[room.type]}</Text>
        </View>
      </Pressable>
      {canInteract ? <Pressable hitSlop={12} style={styles.resizeHandle} {...resizeResponder.panHandlers} onPress={handlePress} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  roomRoot: {
    position: 'absolute',
  },
  room: {
    flex: 1,
    backgroundColor: '#F7FAFF',
    borderColor: '#2A3756',
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomSelected: {
    borderColor: '#2D5ED2',
    backgroundColor: '#EDF3FF',
    shadowColor: '#2D5ED2',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  roomHeader: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  roomName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E2A46',
    textAlign: 'center',
  },
  resizeHandle: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2D5ED2',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
