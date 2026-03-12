import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';
import { V2RoomMenu } from './V2RoomMenu';

type Props = {
  room: RoomV2;
  selected: boolean;
  onSelect: (roomId: string) => void;
  onMove: (roomId: string, x: number, y: number) => void;
  onResize: (roomId: string, width: number, height: number) => void;
  onRenamePreset: (roomId: string, name: string) => void;
  onCustomRename: (roomId: string) => void;
  onOpenSettings: (roomId: string) => void;
};

type InteractionState =
  | { mode: 'idle' }
  | { mode: 'drag'; startMouseX: number; startMouseY: number; startX: number; startY: number }
  | { mode: 'resize'; startMouseX: number; startMouseY: number; startWidth: number; startHeight: number };

export const V2Room = ({
  room,
  selected,
  onSelect,
  onMove,
  onResize,
  onRenamePreset,
  onCustomRename,
  onOpenSettings,
}: Props) => {
  const interactionStateRef = useRef<InteractionState>({ mode: 'idle' });
  const dragOriginRef = useRef({ x: room.x, y: room.y });
  const resizeOriginRef = useRef({ width: room.width, height: room.height });
  const isResizingRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = (event: MouseEvent) => {
      const state = interactionStateRef.current;

      if (state.mode === 'drag') {
        const dx = event.clientX - state.startMouseX;
        const dy = event.clientY - state.startMouseY;
        onMove(room.id, state.startX + dx, state.startY + dy);
      }

      if (state.mode === 'resize') {
        const dx = event.clientX - state.startMouseX;
        const dy = event.clientY - state.startMouseY;
        onResize(room.id, state.startWidth + dx, state.startHeight + dy);
      }
    };

    const handleMouseUp = () => {
      interactionStateRef.current = { mode: 'idle' };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onMove, onResize, room.id]);

  useEffect(() => {
    if (!selected) {
      setIsMenuOpen(false);
    }
  }, [selected]);

  const dragResponder = PanResponder.create({
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
  });

  const resizeResponder = PanResponder.create({
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
  });

  const startDragWeb = (event: any) => {
    onSelect(room.id);
    interactionStateRef.current = {
      mode: 'drag',
      startMouseX: event?.nativeEvent?.clientX ?? 0,
      startMouseY: event?.nativeEvent?.clientY ?? 0,
      startX: room.x,
      startY: room.y,
    };
  };

  const startResizeWeb = (event: any) => {
    event?.stopPropagation?.();
    onSelect(room.id);
    interactionStateRef.current = {
      mode: 'resize',
      startMouseX: event?.nativeEvent?.clientX ?? 0,
      startMouseY: event?.nativeEvent?.clientY ?? 0,
      startWidth: room.width,
      startHeight: room.height,
    };
  };

  const webDragProps = Platform.OS === 'web' ? ({ onMouseDown: startDragWeb } as any) : {};
  const webResizeProps = Platform.OS === 'web' ? ({ onMouseDown: startResizeWeb } as any) : {};

  return (
    <View style={[styles.root, { left: room.x, top: room.y, width: room.width, height: room.height }]} pointerEvents="box-none">
      <Pressable
        {...(Platform.OS === 'web' ? {} : dragResponder.panHandlers)}
        {...webDragProps}
        onPress={() => onSelect(room.id)}
        style={[styles.room, selected ? styles.roomSelected : null]}
      >
        <Pressable
          style={styles.nameButton}
          onPress={(event) => {
            event?.stopPropagation?.();
            onSelect(room.id);
            setIsMenuOpen((prev) => !prev);
          }}
        >
          <Text style={styles.name}>{room.name}</Text>
        </Pressable>

        {isMenuOpen ? (
          <V2RoomMenu
            roomId={room.id}
            onRenamePreset={(roomId, name) => {
              onRenamePreset(roomId, name);
              setIsMenuOpen(false);
            }}
            onCustomRename={(roomId) => {
              onCustomRename(roomId);
              setIsMenuOpen(false);
            }}
            onOpenSettings={(roomId) => {
              onOpenSettings(roomId);
              setIsMenuOpen(false);
            }}
          />
        ) : null}
      </Pressable>

      <Pressable
        {...(Platform.OS === 'web' ? {} : resizeResponder.panHandlers)}
        {...webResizeProps}
        style={styles.resizeHandle}
        hitSlop={12}
      />
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
    cursor: 'move' as any,
    position: 'relative',
    overflow: 'visible',
  },
  roomSelected: {
    borderColor: '#2D5ED2',
    backgroundColor: '#EDF3FF',
  },
  nameButton: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    cursor: 'nwse-resize' as any,
  },
});
