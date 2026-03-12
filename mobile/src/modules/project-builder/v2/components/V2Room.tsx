import React, { useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';

type Props = {
  room: RoomV2;
  selected: boolean;
  onSelect: (roomId: string) => void;
  onMove: (roomId: string, x: number, y: number) => void;
  onResize: (roomId: string, width: number, height: number) => void;
};

export const V2Room = ({ room, selected, onSelect, onMove, onResize }: Props) => {
  const dragOriginRef = useRef({ x: room.x, y: room.y });
  const resizeOriginRef = useRef({ width: room.width, height: room.height });
  const isResizingRef = useRef(false);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isResizingRef.current,
        onMoveShouldSetPanResponder: () => !isResizingRef.current,
        onPanResponderGrant: () => {
          if (isResizingRef.current) return;
          dragOriginRef.current = { x: room.x, y: room.y };
          onSelect(room.id);
        },
        onPanResponderMove: (_, gesture) => {
          if (isResizingRef.current) return;
          onMove(room.id, dragOriginRef.current.x + gesture.dx, dragOriginRef.current.y + gesture.dy);
        },
        onPanResponderRelease: () => {
          isResizingRef.current = false;
        },
        onPanResponderTerminate: () => {
          isResizingRef.current = false;
        },
      }),
    [onMove, onSelect, room.id, room.x, room.y],
  );

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          isResizingRef.current = true;
          resizeOriginRef.current = { width: room.width, height: room.height };
          onSelect(room.id);
        },
        onPanResponderMove: (_, gesture) => {
          onResize(room.id, resizeOriginRef.current.width + gesture.dx, resizeOriginRef.current.height + gesture.dy);
        },
        onPanResponderRelease: () => {
          isResizingRef.current = false;
        },
        onPanResponderTerminate: () => {
          isResizingRef.current = false;
        },
      }),
    [onResize, onSelect, room.height, room.id, room.width],
  );

  return (
    <View style={[styles.root, { left: room.x, top: room.y, width: room.width, height: room.height }]} pointerEvents="box-none">
      <Pressable {...dragResponder.panHandlers} onPress={() => onSelect(room.id)} style={[styles.room, selected ? styles.roomSelected : null]}>
        <Text style={styles.name}>{room.name}</Text>
      </Pressable>

      <Pressable {...resizeResponder.panHandlers} style={styles.resizeHandle} hitSlop={12} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
  },
  room: {
    flex: 1,
    backgroundColor: '#F7FAFF',
    borderWidth: 2,
    borderColor: '#2A3756',
    borderRadius: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
  },
  roomSelected: {
    borderColor: '#2D5ED2',
    backgroundColor: '#EDF3FF',
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E2A46',
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
