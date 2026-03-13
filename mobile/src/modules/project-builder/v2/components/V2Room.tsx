import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CanvasCameraState, RoomV2 } from '../model/types';
import { RoomSizeUnit } from '../utils/roomUnits';
import { getRoomCorners } from '../utils/getRoomCorners';
import { getRoomVisualBounds } from '../utils/getRoomVisualBounds';
import { V2RoomMenu } from './V2RoomMenu';

type Props = {
  room: RoomV2;
  selected: boolean;
  interactive?: boolean;
  onSelect: (roomId: string) => void;
  onMove: (roomId: string, centerX: number, centerY: number) => void;
  onResize: (roomId: string, width: number, height: number) => void;
  onRotate: (roomId: string) => void;
  onRenamePreset: (roomId: string, name: string) => void;
  onRenameCustom: (roomId: string, name: string) => void;
  onOpenSettings: (roomId: string) => void;
  onOpenRoom: (roomId: string) => void;
  onUpdateRoomSize: (roomId: string, widthMm: number, heightMm: number) => void;
  onToggleSizeLock: (roomId: string, locked: boolean) => void;
  onToggleDimensionLinesPinned: (roomId: string, pinned: boolean) => void;
  onAddDoor: (roomId: string) => void;
  onAddWindow: (roomId: string) => void;
  dimensionUnit: RoomSizeUnit;
  onDimensionUnitChange: (unit: RoomSizeUnit) => void;
  camera: CanvasCameraState;
  viewportWidth: number;
  viewportHeight: number;
};

type InteractionState =
  | { mode: 'idle' }
  | { mode: 'drag'; startMouseX: number; startMouseY: number; startCenterX: number; startCenterY: number }
  | {
      mode: 'resize';
      startMouseX: number;
      startMouseY: number;
      startWidth: number;
      startHeight: number;
    };

const HANDLE_SIZE = 22;
const RESIZE_HANDLE_SIZE = 20;
const MENU_MAX_WIDTH = 260;
const MENU_PREFERRED_MAX_HEIGHT = 320;
const MENU_SAFE_MARGIN = 12;
const MENU_VERTICAL_OFFSET = 28;
const SCENE_WIDTH = 10000;
const SCENE_HEIGHT = 10000;
const SCENE_CENTER_X = SCENE_WIDTH / 2;
const SCENE_CENTER_Y = SCENE_HEIGHT / 2;

const clamp = (value: number, min: number, max: number) => {
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
};

const getRoomMenuPlacement = ({
  anchorX,
  anchorY,
  menuWidth,
  menuMaxHeight,
  viewportWidth,
  viewportHeight,
  margin,
}: {
  anchorX: number;
  anchorY: number;
  menuWidth: number;
  menuMaxHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  margin: number;
}) => {
  const minLeft = margin;
  const maxLeft = viewportWidth - menuWidth - margin;
  const left = clamp(anchorX, minLeft, maxLeft);

  const spaceBelow = viewportHeight - anchorY - margin;
  const spaceAbove = anchorY - margin;
  const effectiveMaxHeight = Math.max(120, Math.min(menuMaxHeight, viewportHeight - margin * 2));

  let top = anchorY;
  if (spaceBelow < effectiveMaxHeight && spaceAbove >= spaceBelow) {
    top = anchorY - effectiveMaxHeight;
  }

  const minTop = margin;
  const maxTop = viewportHeight - effectiveMaxHeight - margin;

  return {
    left,
    top: clamp(top, minTop, maxTop),
    maxHeight: effectiveMaxHeight,
  };
};

export const V2Room = ({
  room,
  selected,
  interactive = true,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onRenamePreset,
  onRenameCustom,
  onOpenSettings,
  onOpenRoom,
  onUpdateRoomSize,
  onToggleSizeLock,
  onToggleDimensionLinesPinned,
  onAddDoor,
  onAddWindow,
  dimensionUnit,
  onDimensionUnitChange,
  camera,
  viewportWidth,
  viewportHeight,
}: Props) => {
  const interactionStateRef = useRef<InteractionState>({ mode: 'idle' });
  const dragOriginRef = useRef({ centerX: room.centerX, centerY: room.centerY });
  const resizeOriginRef = useRef({ width: room.width, height: room.height });
  const isResizingRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const windowDimensions = useWindowDimensions();

  const roomRotation = room.rotation ?? 0;
  const corners = useMemo(() => {
    const rawCorners = getRoomCorners(room);
    const points = [rawCorners.topLeft, rawCorners.topRight, rawCorners.bottomRight, rawCorners.bottomLeft].sort(
      (a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y),
    );

    const [firstTop, secondTop, firstBottom, secondBottom] = points;
    const [topLeft, topRight] = [firstTop, secondTop].sort((a, b) => a.x - b.x);
    const [bottomLeft, bottomRight] = [firstBottom, secondBottom].sort((a, b) => a.x - b.x);

    return {
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    };
  }, [room]);
  const visualBounds = useMemo(() => getRoomVisualBounds(room), [room]);

  const roomFrameLeft = room.centerX - room.width / 2;
  const roomFrameTop = room.centerY - room.height / 2;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = (event: MouseEvent) => {
      const state = interactionStateRef.current;

      if (state.mode === 'drag') {
        const dx = event.clientX - state.startMouseX;
        const dy = event.clientY - state.startMouseY;
        onMove(room.id, state.startCenterX + dx, state.startCenterY + dy);
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
    onStartShouldSetPanResponder: () => interactive && !isResizingRef.current,
    onMoveShouldSetPanResponder: () => interactive && !isResizingRef.current,
    onPanResponderGrant: () => {
      if (isResizingRef.current) return;
      dragOriginRef.current = { centerX: room.centerX, centerY: room.centerY };
      onSelect(room.id);
    },
    onPanResponderMove: (_, gesture) => {
      if (isResizingRef.current) return;
      onMove(room.id, dragOriginRef.current.centerX + gesture.dx, dragOriginRef.current.centerY + gesture.dy);
    },
    onPanResponderRelease: () => {
      isResizingRef.current = false;
    },
    onPanResponderTerminate: () => {
      isResizingRef.current = false;
    },
  });

  const resizeResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => interactive && !room.isSizeLocked,
    onMoveShouldSetPanResponder: () => interactive && !room.isSizeLocked,
    onPanResponderGrant: () => {
      if (room.isSizeLocked) return;
      isResizingRef.current = true;
      resizeOriginRef.current = { width: room.width, height: room.height };
      onSelect(room.id);
    },
    onPanResponderMove: (_, gesture) => {
      if (room.isSizeLocked) return;
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
    if (!interactive) return;

    event?.stopPropagation?.();
    onSelect(room.id);
    interactionStateRef.current = {
      mode: 'drag',
      startMouseX: event?.nativeEvent?.clientX ?? 0,
      startMouseY: event?.nativeEvent?.clientY ?? 0,
      startCenterX: room.centerX,
      startCenterY: room.centerY,
    };
  };

  const startResizeWeb = (event: any) => {
    if (!interactive || room.isSizeLocked) return;

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


  const viewportBaseLeft = viewportWidth / 2 - SCENE_CENTER_X;
  const viewportBaseTop = viewportHeight / 2 - SCENE_CENTER_Y;
  const rootViewportLeft = viewportBaseLeft + (visualBounds.x + camera.panX) * camera.zoom;
  const rootViewportTop = viewportBaseTop + (visualBounds.y + camera.panY) * camera.zoom;

  const anchorViewportX = viewportBaseLeft + (corners.topRight.x + camera.panX) * camera.zoom - MENU_MAX_WIDTH / 2;
  const anchorViewportY = viewportBaseTop + (corners.topRight.y + camera.panY) * camera.zoom + MENU_VERTICAL_OFFSET;
  const menuPlacement = getRoomMenuPlacement({
    anchorX: anchorViewportX,
    anchorY: anchorViewportY,
    menuWidth: MENU_MAX_WIDTH,
    menuMaxHeight: MENU_PREFERRED_MAX_HEIGHT,
    viewportWidth: Math.max(0, viewportWidth || windowDimensions.width || 0),
    viewportHeight: Math.max(0, viewportHeight || windowDimensions.height || 0),
    margin: MENU_SAFE_MARGIN,
  });

  const menuStyle = {
    left: (menuPlacement.left - rootViewportLeft) / Math.max(camera.zoom, 0.0001),
    top: (menuPlacement.top - rootViewportTop) / Math.max(camera.zoom, 0.0001),
    maxHeight: menuPlacement.maxHeight / Math.max(camera.zoom, 0.0001),
  };

  const webDragProps = Platform.OS === 'web' ? ({ onMouseDown: startDragWeb } as any) : {};
  const webResizeProps = Platform.OS === 'web' ? ({ onMouseDown: startResizeWeb } as any) : {};
  const shouldShowRoomControls = selected && interactive && !isMenuOpen;

  return (
    <View
      style={[
        styles.root,
        {
          left: visualBounds.x,
          top: visualBounds.y,
          width: visualBounds.width,
          height: visualBounds.height,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        {...(Platform.OS === 'web' || !interactive ? {} : dragResponder.panHandlers)}
        {...webDragProps}
        onPress={() => {
          if (!interactive) return;

          onSelect(room.id);
        }}
        style={styles.hitLayer}
      >
        <View
          style={[
            styles.geometryLayer,
            {
              left: roomFrameLeft - visualBounds.x,
              top: roomFrameTop - visualBounds.y,
              width: room.width,
              height: room.height,
              transform: [{ rotate: `${roomRotation}deg` }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.roomBody, selected ? styles.roomSelected : null]} />
        </View>

        <View style={styles.overlayLayer} pointerEvents="box-none">
          <Text style={styles.name}>{room.name}</Text>

          {isMenuOpen ? (
            <V2RoomMenu
              roomId={room.id}
              room={room}
              onRenamePreset={(roomId, name) => {
                onRenamePreset(roomId, name);
                setIsMenuOpen(false);
              }}
              onRenameCustom={onRenameCustom}
              onOpenSettings={(roomId) => {
                onOpenSettings(roomId);
              }}
              onOpenRoom={(roomId) => {
                onOpenRoom(roomId);
                setIsMenuOpen(false);
              }}
              onUpdateRoomSize={onUpdateRoomSize}
              onToggleSizeLock={(roomId, locked) => {
                onToggleSizeLock(roomId, locked);
              }}
              onToggleDimensionLinesPinned={(roomId, pinned) => {
                onToggleDimensionLinesPinned(roomId, pinned);
              }}
              onAddDoor={(roomId) => {
                onAddDoor(roomId);
                setIsMenuOpen(false);
              }}
              onAddWindow={(roomId) => {
                onAddWindow(roomId);
                setIsMenuOpen(false);
              }}
              dimensionUnit={dimensionUnit}
              onDimensionUnitChange={onDimensionUnitChange}
              menuStyle={menuStyle}
              scrollStyle={{ maxHeight: menuStyle.maxHeight }}
            />
          ) : null}

          {shouldShowRoomControls ? (
            <Pressable
              style={[
                styles.settingsHandle,
                {
                  left: corners.topRight.x - visualBounds.x - HANDLE_SIZE / 2,
                  top: corners.topRight.y - visualBounds.y - HANDLE_SIZE / 2,
                },
              ]}
              onPress={(event) => {
                event?.stopPropagation?.();
                onSelect(room.id);
                setIsMenuOpen((prev) => !prev);
              }}
              hitSlop={8}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>

      {shouldShowRoomControls ? (
        <Pressable
          style={[
            styles.rotateHandle,
            {
              left: corners.topLeft.x - visualBounds.x - HANDLE_SIZE / 2,
              top: corners.topLeft.y - visualBounds.y - HANDLE_SIZE / 2,
            },
          ]}
          onPress={(event) => {
            event?.stopPropagation?.();
            onRotate(room.id);
          }}
          hitSlop={8}
        >
          <Text style={styles.rotateIcon}>↻</Text>
        </Pressable>
      ) : null}

      {shouldShowRoomControls && !room.isSizeLocked ? (
        <Pressable
          {...(Platform.OS === 'web' || !interactive ? {} : resizeResponder.panHandlers)}
          {...webResizeProps}
          style={[
            styles.resizeHandle,
            {
              left: corners.bottomRight.x - visualBounds.x - RESIZE_HANDLE_SIZE / 2,
              top: corners.bottomRight.y - visualBounds.y - RESIZE_HANDLE_SIZE / 2,
            },
          ]}
          hitSlop={12}
        />
      ) : null}
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
  geometryLayer: {
    position: 'absolute',
  },
  roomBody: {
    flex: 1,
    backgroundColor: '#F7FAFF',
    borderWidth: 2,
    borderColor: '#2A3756',
    borderRadius: 6,
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomSelected: {
    borderColor: '#2D5ED2',
    backgroundColor: '#EDF3FF',
  },
  name: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(30, 42, 70, 0.62)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  rotateHandle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D5ED2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  rotateIcon: {
    color: '#2D5ED2',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsHandle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D5ED2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  settingsIcon: {
    color: '#2D5ED2',
    fontSize: 12,
    fontWeight: '700',
  },
  resizeHandle: {
    position: 'absolute',
    width: RESIZE_HANDLE_SIZE,
    height: RESIZE_HANDLE_SIZE,
    borderRadius: RESIZE_HANDLE_SIZE / 2,
    backgroundColor: '#2D5ED2',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    cursor: 'nwse-resize' as any,
  },
});
