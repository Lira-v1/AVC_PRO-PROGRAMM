import React, { useEffect, useRef } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RoomSurfaceObject } from '../model/surfaces';
import { getSurfaceTitle } from '../utils/getSurfaceMetrics';

type Props = {
  wall: RoomSurfaceObject;
  selected: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  onSelect: (wallId: string) => void;
  onMove: (wallId: string, x: number, y: number) => void;
  onRotatePlaceholder?: (wallId: string) => void;
  onOpenSettingsPlaceholder?: (wallId: string) => void;
};

type DragState =
  | { mode: 'idle' }
  | {
      mode: 'drag';
      startMouseX: number;
      startMouseY: number;
      startX: number;
      startY: number;
    };

const HANDLE_SIZE = 22;
const RESIZE_HANDLE_SIZE = 20;

export const V2WallObject = ({
  wall,
  selected,
  x,
  y,
  width,
  height,
  onSelect,
  onMove,
  onRotatePlaceholder,
  onOpenSettingsPlaceholder,
}: Props) => {
  const dragStateRef = useRef<DragState>({ mode: 'idle' });
  const dragOriginRef = useRef({ x, y });

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = (event: MouseEvent) => {
      const state = dragStateRef.current;
      if (state.mode !== 'drag') return;

      const dx = event.clientX - state.startMouseX;
      const dy = event.clientY - state.startMouseY;

      onMove(wall.id, state.startX + dx, state.startY + dy);
    };

    const handleMouseUp = () => {
      dragStateRef.current = { mode: 'idle' };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onMove, wall.id]);

  const dragResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      dragOriginRef.current = { x, y };
      onSelect(wall.id);
    },
    onPanResponderMove: (_, gesture) => {
      onMove(wall.id, dragOriginRef.current.x + gesture.dx, dragOriginRef.current.y + gesture.dy);
    },
  });

  const startDragWeb = (event: any) => {
    event?.stopPropagation?.();
    onSelect(wall.id);

    dragStateRef.current = {
      mode: 'drag',
      startMouseX: event?.nativeEvent?.clientX ?? 0,
      startMouseY: event?.nativeEvent?.clientY ?? 0,
      startX: x,
      startY: y,
    };
  };

  const webDragProps = Platform.OS === 'web' ? ({ onMouseDown: startDragWeb } as any) : {};

  return (
    <View
      style={[
        styles.root,
        {
          left: x,
          top: y,
          width,
          height,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        {...(Platform.OS === 'web' ? {} : dragResponder.panHandlers)}
        {...webDragProps}
        onPress={() => onSelect(wall.id)}
        style={styles.hitLayer}
      >
        <View style={[styles.wallBody, selected ? styles.wallSelected : null]} />

        <View style={styles.overlayLayer} pointerEvents="box-none">
          <Text style={styles.wallLabel}>{getSurfaceTitle(wall.direction)}</Text>

          {selected ? (
            <>
              <Pressable
                style={styles.rotateHandle}
                onPress={(event) => {
                  event?.stopPropagation?.();
                  onRotatePlaceholder?.(wall.id);
                }}
                hitSlop={8}
              >
                <Text style={styles.handleIcon}>↻</Text>
              </Pressable>

              <Pressable
                style={styles.settingsHandle}
                onPress={(event) => {
                  event?.stopPropagation?.();
                  onOpenSettingsPlaceholder?.(wall.id);
                }}
                hitSlop={8}
              >
                <Text style={styles.handleIcon}>⚙</Text>
              </Pressable>

              <View style={styles.resizeHandlePlaceholder} pointerEvents="none" />
            </>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
  },
  hitLayer: {
    flex: 1,
    cursor: 'move' as any,
  },
  wallBody: {
    flex: 1,
    backgroundColor: '#F7FAFF',
    borderWidth: 2,
    borderColor: '#2A3756',
    borderRadius: 6,
  },
  wallSelected: {
    borderColor: '#2D5ED2',
    backgroundColor: '#EDF3FF',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallLabel: {
    position: 'absolute',
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(30, 42, 70, 0.62)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 8,
  },
  rotateHandle: {
    position: 'absolute',
    left: -HANDLE_SIZE / 2,
    top: -HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D5ED2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  settingsHandle: {
    position: 'absolute',
    right: -HANDLE_SIZE / 2,
    top: -HANDLE_SIZE / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D5ED2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  handleIcon: {
    color: '#2D5ED2',
    fontSize: 12,
    fontWeight: '700',
  },
  resizeHandlePlaceholder: {
    position: 'absolute',
    right: -RESIZE_HANDLE_SIZE / 2,
    bottom: -RESIZE_HANDLE_SIZE / 2,
    width: RESIZE_HANDLE_SIZE,
    height: RESIZE_HANDLE_SIZE,
    borderRadius: RESIZE_HANDLE_SIZE / 2,
    backgroundColor: '#2D5ED2',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    opacity: 0.9,
  },
});
