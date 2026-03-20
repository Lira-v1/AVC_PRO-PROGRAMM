import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CanvasCameraState, RoomV2 } from '../model/types';
import { RoomSizeUnit } from '../utils/roomUnits';
import { getRoomCorners } from '../utils/getRoomCorners';
import { getRoomVisualBounds } from '../utils/getRoomVisualBounds';
import { V2RoomMenu } from './V2RoomMenu';
import { RoomMenuDebugState } from './V2DeveloperPanel';
import { viewportSceneBase, worldToScenePoint, worldToSceneRect } from '../utils/sceneCoordinates';

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
  onRoomMenuDebugChange?: (state: RoomMenuDebugState | null) => void;
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
      startCenterX: number;
      startCenterY: number;
      startWidth: number;
      startHeight: number;
    };

const RESIZE_HANDLE_SIZE = 20;
const MENU_MAX_WIDTH = 260;
const MENU_PREFERRED_MAX_HEIGHT = 320;
const MENU_SAFE_MARGIN = 12;
const SETTINGS_BUTTON_WIDTH = 22;
const SETTINGS_BUTTON_HEIGHT = 22;
const SETTINGS_BUTTON_RIGHT_OFFSET = -10;
const SETTINGS_BUTTON_TOP_OFFSET = -10;
const MIN_ROOM_SIZE = 1;

const clamp = (value: number, min: number, max: number) => {
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
};

const rotateWorldDeltaToLocal = (dx: number, dy: number, rotation: number) => {
  const normalizedRotation = ((rotation % 360) + 360) % 360;

  switch (normalizedRotation) {
    case 90:
      return { x: dy, y: -dx };
    case 180:
      return { x: -dx, y: -dy };
    case 270:
      return { x: -dy, y: dx };
    default:
      return { x: dx, y: dy };
  }
};

const rotateLocalDeltaToWorld = (dx: number, dy: number, rotation: number) => {
  const normalizedRotation = ((rotation % 360) + 360) % 360;

  switch (normalizedRotation) {
    case 90:
      return { x: -dy, y: dx };
    case 180:
      return { x: -dx, y: -dy };
    case 270:
      return { x: dy, y: -dx };
    default:
      return { x: dx, y: dy };
  }
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
  onRoomMenuDebugChange,
  camera,
  viewportWidth,
  viewportHeight,
}: Props) => {
  const interactionStateRef = useRef<InteractionState>({ mode: 'idle' });
  const dragOriginRef = useRef({ centerX: room.centerX, centerY: room.centerY });
  const resizeOriginRef = useRef({ width: room.width, height: room.height });
  const resizeCenterOriginRef = useRef({ centerX: room.centerX, centerY: room.centerY });
  const isResizingRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuAnchorPosition, setMenuAnchorPosition] = useState<{ x: number; y: number } | null>(null);
  const windowDimensions = useWindowDimensions();

  const roomRotation = room.rotation ?? 0;
  const roomCorners = useMemo(() => getRoomCorners(room), [room]);
  const visualBounds = useMemo(() => getRoomVisualBounds(room), [room]);
  const visualBoundsScene = useMemo(() => worldToSceneRect(visualBounds), [visualBounds]);

  const roomFrameLeft = room.centerX - room.width / 2;
  const roomFrameTop = room.centerY - room.height / 2;
  const resizeAnchorScene = useMemo(
    () => worldToScenePoint(roomCorners.bottomRight),
    [roomCorners.bottomRight],
  );
  const roomFrameScene = useMemo(
    () => worldToScenePoint({ x: roomFrameLeft, y: roomFrameTop }),
    [roomFrameLeft, roomFrameTop],
  );

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
        const worldDelta = {
          x: event.clientX - state.startMouseX,
          y: event.clientY - state.startMouseY,
        };
        const localDelta = rotateWorldDeltaToLocal(worldDelta.x, worldDelta.y, roomRotation);
        const nextWidth = Math.max(MIN_ROOM_SIZE, state.startWidth + localDelta.x);
        const nextHeight = Math.max(MIN_ROOM_SIZE, state.startHeight + localDelta.y);
        const widthDelta = nextWidth - state.startWidth;
        const heightDelta = nextHeight - state.startHeight;
        const worldCenterShift = rotateLocalDeltaToWorld(widthDelta / 2, heightDelta / 2, roomRotation);

        onMove(room.id, state.startCenterX + worldCenterShift.x, state.startCenterY + worldCenterShift.y);
        onResize(room.id, nextWidth, nextHeight);
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
  }, [onMove, onResize, room.id, roomRotation]);

  useEffect(() => {
    if (!selected) {
      setIsMenuOpen(false);
      setMenuAnchorPosition(null);
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
      resizeCenterOriginRef.current = { centerX: room.centerX, centerY: room.centerY };
      onSelect(room.id);
    },
    onPanResponderMove: (_, gesture) => {
      if (room.isSizeLocked) return;
      const localDelta = rotateWorldDeltaToLocal(gesture.dx, gesture.dy, roomRotation);
      const nextWidth = Math.max(MIN_ROOM_SIZE, resizeOriginRef.current.width + localDelta.x);
      const nextHeight = Math.max(MIN_ROOM_SIZE, resizeOriginRef.current.height + localDelta.y);
      const widthDelta = nextWidth - resizeOriginRef.current.width;
      const heightDelta = nextHeight - resizeOriginRef.current.height;
      const worldCenterShift = rotateLocalDeltaToWorld(widthDelta / 2, heightDelta / 2, roomRotation);

      onMove(
        room.id,
        resizeCenterOriginRef.current.centerX + worldCenterShift.x,
        resizeCenterOriginRef.current.centerY + worldCenterShift.y,
      );
      onResize(room.id, nextWidth, nextHeight);
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
      startCenterX: room.centerX,
      startCenterY: room.centerY,
      startWidth: room.width,
      startHeight: room.height,
    };
  };


  const viewportBase = viewportSceneBase(viewportWidth, viewportHeight);
  const safeZoom = Math.max(camera.zoom, 0.0001);
  const rootViewportLeft = viewportBase.left + camera.panX + visualBoundsScene.x * safeZoom;
  const rootViewportTop = viewportBase.top + camera.panY + visualBoundsScene.y * safeZoom;

  const fallbackViewportWidth = Math.max(0, viewportWidth || windowDimensions.width || 0);
  const fallbackViewportHeight = Math.max(0, viewportHeight || windowDimensions.height || 0);
  const settingsButtonAnchorViewport = useMemo(() => {
    const buttonCenterSceneX = visualBoundsScene.x + visualBoundsScene.width + SETTINGS_BUTTON_RIGHT_OFFSET + SETTINGS_BUTTON_WIDTH / 2;
    const buttonBottomSceneY = visualBoundsScene.y + SETTINGS_BUTTON_TOP_OFFSET + SETTINGS_BUTTON_HEIGHT;

    return {
      x: viewportBase.left + camera.panX + buttonCenterSceneX * safeZoom,
      y: viewportBase.top + camera.panY + buttonBottomSceneY * safeZoom,
    };
  }, [camera.panX, camera.panY, safeZoom, viewportBase.left, viewportBase.top, visualBoundsScene.width, visualBoundsScene.x, visualBoundsScene.y]);

  const anchorViewportX = menuAnchorPosition?.x ?? settingsButtonAnchorViewport.x;
  const anchorViewportY = menuAnchorPosition?.y ?? settingsButtonAnchorViewport.y;
  const menuPlacement = getRoomMenuPlacement({
    anchorX: anchorViewportX,
    anchorY: anchorViewportY,
    menuWidth: MENU_MAX_WIDTH,
    menuMaxHeight: MENU_PREFERRED_MAX_HEIGHT,
    viewportWidth: fallbackViewportWidth,
    viewportHeight: fallbackViewportHeight,
    margin: MENU_SAFE_MARGIN,
  });

  const menuStyle = {
    left: (menuPlacement.left - rootViewportLeft) / safeZoom,
    top: (menuPlacement.top - rootViewportTop) / safeZoom,
    maxHeight: menuPlacement.maxHeight / safeZoom,
  };

  useEffect(() => {
    if (!selected || !isMenuOpen) {
      onRoomMenuDebugChange?.(null);
      return;
    }

    onRoomMenuDebugChange?.({
      activeMenu: 'root',
      activeSubmenu: 'root',
      isMenuOpen: true,
      anchorPosition: { x: anchorViewportX, y: anchorViewportY },
    });
  }, [anchorViewportX, anchorViewportY, isMenuOpen, onRoomMenuDebugChange, selected]);

  useEffect(() => {
    if (!isMenuOpen) return;
    setMenuAnchorPosition(settingsButtonAnchorViewport);
  }, [isMenuOpen, settingsButtonAnchorViewport]);

  const webDragProps = Platform.OS === 'web' ? ({ onMouseDown: startDragWeb } as any) : {};
  const webResizeProps = Platform.OS === 'web' ? ({ onMouseDown: startResizeWeb } as any) : {};
  const shouldShowRoomControls = selected && interactive && !isMenuOpen;

  return (
    <View
      style={[
        styles.root,
        {
          left: visualBoundsScene.x,
          top: visualBoundsScene.y,
          width: visualBoundsScene.width,
          height: visualBoundsScene.height,
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
              left: roomFrameScene.x - visualBoundsScene.x,
              top: roomFrameScene.y - visualBoundsScene.y,
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
              onRotate={(roomId) => {
                onRotate(roomId);
                setIsMenuOpen(false);
              }}
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
              onDebugStateChange={({ submenu, isMenuOpen: isSubmenuOpen }) => {
                onRoomMenuDebugChange?.({
                  activeMenu: submenu,
                  activeSubmenu: submenu,
                  isMenuOpen: isSubmenuOpen,
                  anchorPosition: { x: anchorViewportX, y: anchorViewportY },
                });
              }}
            />
          ) : null}

          {shouldShowRoomControls ? (
            <Pressable
              style={styles.settingsHandle}
              onPress={(event) => {
                event?.stopPropagation?.();
                onSelect(room.id);
                if (isMenuOpen) {
                  setIsMenuOpen(false);
                  setMenuAnchorPosition(null);
                  return;
                }

                setMenuAnchorPosition(settingsButtonAnchorViewport);
                setIsMenuOpen(true);
              }}
              hitSlop={8}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>

      {shouldShowRoomControls && !room.isSizeLocked ? (
        <Pressable
          {...(Platform.OS === 'web' || !interactive ? {} : resizeResponder.panHandlers)}
          {...webResizeProps}
          style={[
            styles.resizeHandle,
            {
              left: resizeAnchorScene.x - visualBoundsScene.x - RESIZE_HANDLE_SIZE / 2,
              top: resizeAnchorScene.y - visualBoundsScene.y - RESIZE_HANDLE_SIZE / 2,
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
  settingsHandle: {
    position: 'absolute',
    right: -10,
    top: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
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
