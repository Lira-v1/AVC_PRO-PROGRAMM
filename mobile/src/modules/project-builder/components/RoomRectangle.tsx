import React, { useRef } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const dragStateRef = useRef({ startPageX: 0, startPageY: 0, originX: room.x, originY: room.y, active: false });
  const resizeStateRef = useRef({ startPageX: 0, startPageY: 0, originWidth: room.width, originHeight: room.height, active: false });
  const lastPressRef = useRef(0);

  const getPoint = (event: GestureResponderEvent) => ({
    x: event.nativeEvent.pageX ?? event.nativeEvent.locationX,
    y: event.nativeEvent.pageY ?? event.nativeEvent.locationY,
  });

  const startDrag = (event: GestureResponderEvent) => {
    if (!canInteract || resizeStateRef.current.active) return;

    const point = getPoint(event);
    dragStateRef.current = { startPageX: point.x, startPageY: point.y, originX: room.x, originY: room.y, active: true };
    onSelect(room.id);
  };

  const handleDragMove = (event: GestureResponderEvent) => {
    if (!dragStateRef.current.active || resizeStateRef.current.active) return;

    const point = getPoint(event);
    onMove(room.id, dragStateRef.current.originX + (point.x - dragStateRef.current.startPageX), dragStateRef.current.originY + (point.y - dragStateRef.current.startPageY));
  };

  const stopDrag = () => {
    dragStateRef.current.active = false;
  };

  const startResize = (event: GestureResponderEvent) => {
    if (!canInteract) return;

    const point = getPoint(event);
    resizeStateRef.current = { startPageX: point.x, startPageY: point.y, originWidth: room.width, originHeight: room.height, active: true };
    onSelect(room.id);
  };

  const handleResizeMove = (event: GestureResponderEvent) => {
    if (!resizeStateRef.current.active) return;

    const point = getPoint(event);
    onResize(
      room.id,
      resizeStateRef.current.originWidth + (point.x - resizeStateRef.current.startPageX),
      resizeStateRef.current.originHeight + (point.y - resizeStateRef.current.startPageY),
    );
  };

  const stopResize = () => {
    resizeStateRef.current.active = false;
  };

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
      <Pressable
        onPress={handlePress}
        onPressIn={startDrag}
        onResponderMove={handleDragMove}
        onResponderRelease={stopDrag}
        onResponderTerminate={stopDrag}
        onStartShouldSetResponder={() => canInteract}
        onMoveShouldSetResponder={() => canInteract}
        style={[styles.room, isSelected ? styles.roomSelected : null]}
      >
        <View pointerEvents="none" style={styles.roomHeader}>
          <Text style={styles.roomName}>{room.name || ROOM_TYPE_LABELS[room.type]}</Text>
        </View>
      </Pressable>
      {canInteract ? (
        <Pressable
          hitSlop={12}
          style={styles.resizeHandle}
          onPressIn={startResize}
          onResponderMove={handleResizeMove}
          onResponderRelease={stopResize}
          onResponderTerminate={stopResize}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onPress={handlePress}
        />
      ) : null}
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
