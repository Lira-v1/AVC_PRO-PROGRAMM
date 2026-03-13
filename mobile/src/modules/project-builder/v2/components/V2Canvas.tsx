import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';
import { CompassViewMode, getSurfaceLayoutSlotsByCompass } from '../model/orientation';
import { EditorState, WallSurface } from '../model/editorTypes';
import { V2CanvasControls } from './V2CanvasControls';
import { V2Compass } from './V2Compass';
import { V2Grid } from './V2Grid';
import { V2RoomDimensions } from './V2RoomDimensions';
import { V2Room } from './V2Room';
import { V2WallObject } from './V2WallObject';
import { buildRoomSurfaceObjects, formatMm, getSurfaceTitle } from '../utils/getSurfaceMetrics';
import { RoomSizeUnit } from '../utils/roomUnits';
import { RoomSurfaceObject } from '../model/surfaces';
import { SceneObject } from '../model/sceneObjects';
import { CanvasCameraState } from '../model/types';
import { buildSurfaceId } from '../utils/buildSurfaceId';
import { getSurfaceObjects } from '../utils/getSurfaceObjects';
import { getRoomVisualBounds } from '../utils/getRoomVisualBounds';
import { getSurfaceSceneBounds, SurfaceSceneItem } from '../utils/getSurfaceSceneBounds';
import { CANVAS_UNITS_PER_METER, GRID_CELLS_PER_METER } from '../model/metrics';

type Props = {
  rooms: RoomV2[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onMoveRoom: (roomId: string, centerX: number, centerY: number) => void;
  onResizeRoom: (roomId: string, width: number, height: number) => void;
  onRotateRoom: (roomId: string) => void;
  onBackgroundPress: () => void;
  onRenamePreset: (roomId: string, name: string) => void;
  onRenameCustom: (roomId: string, name: string) => void;
  onOpenSettings: (roomId: string) => void;
  onOpenRoom: (roomId: string) => void;
  editorState: EditorState;
  onBackToProject: () => void;
  onOpenWall: (wall: WallSurface) => void;
  onBackToRoom: () => void;
  sceneObjects: SceneObject[];
  onUpdateRoomSize: (roomId: string, widthMm: number, heightMm: number) => void;
  onToggleSizeLock: (roomId: string, locked: boolean) => void;
  onToggleDimensionLinesPinned: (roomId: string, pinned: boolean) => void;
  onAddDoor: (roomId: string) => void;
  onAddWindow: (roomId: string) => void;
  showGrid: boolean;
  showCompass: boolean;
  compassViewMode: CompassViewMode;
  isFullscreen: boolean;
  camera: CanvasCameraState;
  onToggleGrid: () => void;
  onToggleFullscreen: () => void;
  onZoomTo: (zoom: number, options: { anchorX: number; anchorY: number; baseCamera?: CanvasCameraState }) => void;
  onCenterOnBounds: (bounds: { x: number; y: number; width: number; height: number }, viewportWidth: number, viewportHeight: number, zoom?: number) => void;
  zoomStep: number;
  minZoom: number;
  maxZoom: number;
  onOpenTools: () => void;
  onToggleCompassOrientation: () => void;
  onSetCameraPosition: (panX: number, panY: number) => void;
  dimensionUnit: RoomSizeUnit;
  onDimensionUnitChange: (unit: RoomSizeUnit) => void;
};

const SCENE_WIDTH = 10000;
const SCENE_HEIGHT = 10000;
const SCENE_CENTER_X = SCENE_WIDTH / 2;
const SCENE_CENTER_Y = SCENE_HEIGHT / 2;
const GRID_CELL_SIZE = CANVAS_UNITS_PER_METER / GRID_CELLS_PER_METER;

const ROOM_SCENE_LAYOUT = {
  cardWidth: 204,
  cardHeight: 86,
  gap: 12,
};
const ROOM_SCENE_WIDTH = ROOM_SCENE_LAYOUT.cardWidth * 3 + ROOM_SCENE_LAYOUT.gap * 2;
const ROOM_SCENE_HEIGHT = ROOM_SCENE_LAYOUT.cardHeight * 4 + ROOM_SCENE_LAYOUT.gap * 3;


const getTouchDistance = (first: { locationX: number; locationY: number }, second: { locationX: number; locationY: number }) => {
  const dx = second.locationX - first.locationX;
  const dy = second.locationY - first.locationY;
  return Math.sqrt(dx * dx + dy * dy);
};

const WALL_SCENE_LAYOUT = {
  defaultX: SCENE_CENTER_X - 520 / 2,
  defaultY: SCENE_CENTER_Y - 220 / 2,
  width: 520,
  activeWallHeight: 220,
};

export const V2Canvas = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onMoveRoom,
  onResizeRoom,
  onRotateRoom,
  onBackgroundPress,
  onRenamePreset,
  onRenameCustom,
  onOpenSettings,
  onOpenRoom,
  editorState,
  onBackToProject,
  onOpenWall,
  onBackToRoom,
  sceneObjects,
  onUpdateRoomSize,
  onToggleSizeLock,
  onToggleDimensionLinesPinned,
  onAddDoor,
  onAddWindow,
  showGrid,
  showCompass,
  compassViewMode,
  isFullscreen,
  camera,
  onToggleGrid,
  onToggleFullscreen,
  onZoomTo,
  onCenterOnBounds,
  zoomStep,
  minZoom,
  maxZoom,
  onOpenTools,
  onToggleCompassOrientation,
  onSetCameraPosition,
  dimensionUnit,
  onDimensionUnitChange,
}: Props) => {
  const activeRoom = rooms.find((room) => room.id === editorState.activeRoomId) ?? null;

  const roomSurfaces = useMemo(() => {
    if (!activeRoom) return [];
    return buildRoomSurfaceObjects(activeRoom);
  }, [activeRoom]);

  const activeWallObject = roomSurfaces.find((surface) => surface.direction === editorState.activeWall) ?? null;

  const activeSurfaceId = useMemo(() => {
    if (!editorState.activeRoomId || !editorState.activeWall) {
      return null;
    }

    return buildSurfaceId(editorState.activeRoomId, editorState.activeWall);
  }, [editorState.activeRoomId, editorState.activeWall]);

  const wallObjects = useMemo(() => {
    if (!editorState.activeRoomId || !activeSurfaceId) {
      return [];
    }

    return getSurfaceObjects(sceneObjects, editorState.activeRoomId, activeSurfaceId);
  }, [activeSurfaceId, editorState.activeRoomId, sceneObjects]);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [lastCenteredSceneKey, setLastCenteredSceneKey] = useState<string | null>(null);
  const [wallScenePosition, setWallScenePosition] = useState({
    x: WALL_SCENE_LAYOUT.defaultX,
    y: WALL_SCENE_LAYOUT.defaultY,
  });
  const panStateRef = useRef({
    isPanning: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const roomSurfaceSceneItems = useMemo<SurfaceSceneItem[]>(() => {
    const cardWidth = ROOM_SCENE_LAYOUT.cardWidth;
    const cardHeight = ROOM_SCENE_LAYOUT.cardHeight;
    const gap = ROOM_SCENE_LAYOUT.gap;
    const left = SCENE_CENTER_X - ROOM_SCENE_WIDTH / 2;
    const top = SCENE_CENTER_Y - ROOM_SCENE_HEIGHT / 2;
    const middleColumnX = left + cardWidth + gap;
    const rightColumnX = middleColumnX + cardWidth + gap;

    return [
      { x: middleColumnX, y: top + cardHeight + gap, width: cardWidth, height: cardHeight },
      { x: left, y: top + (cardHeight + gap) * 2, width: cardWidth, height: cardHeight },
      { x: rightColumnX, y: top + (cardHeight + gap) * 2, width: cardWidth, height: cardHeight },
      { x: middleColumnX, y: top + (cardHeight + gap) * 3, width: cardWidth, height: cardHeight },
      { x: middleColumnX, y: top + (cardHeight + gap) * 2, width: cardWidth, height: cardHeight },
      { x: middleColumnX, y: top, width: cardWidth, height: cardHeight },
    ];
  }, []);

  const activeWallSceneItem = useMemo<SurfaceSceneItem | null>(() => {
    if (!activeWallObject) {
      return null;
    }

    return {
      x: wallScenePosition.x,
      y: wallScenePosition.y,
      width: WALL_SCENE_LAYOUT.width,
      height: WALL_SCENE_LAYOUT.activeWallHeight,
    };
  }, [activeWallObject, wallScenePosition.x, wallScenePosition.y]);

  const roomsRef = useRef(rooms);
  const roomSurfaceSceneItemsRef = useRef(roomSurfaceSceneItems);
  const activeWallSceneItemRef = useRef(activeWallSceneItem);

  roomsRef.current = rooms;
  roomSurfaceSceneItemsRef.current = roomSurfaceSceneItems;
  activeWallSceneItemRef.current = activeWallSceneItem;

  const sceneCenterKey =
    editorState.level === 'project'
      ? 'project'
      : editorState.level === 'room'
      ? `room:${editorState.activeRoomId ?? 'none'}`
      : `wall:${editorState.activeRoomId ?? 'none'}:${editorState.activeWall ?? 'none'}`;

  const touchStateRef = useRef({
    pinchStartDistance: 0,
    pinchStartCamera: null as CanvasCameraState | null,
    pinchCenterX: 0,
    pinchCenterY: 0,
  });

  const getFocusBounds = useCallback(() => {
    if (editorState.level === 'project') {
      if (!roomsRef.current.length) {
        return null;
      }

      const focusRoom = roomsRef.current.find((room) => room.id === selectedRoomId) ?? roomsRef.current[0];
      return getRoomVisualBounds(focusRoom);
    }

    if (editorState.level === 'room') {
      if (!roomSurfaceSceneItemsRef.current.length) {
        return null;
      }

      return getSurfaceSceneBounds(roomSurfaceSceneItemsRef.current);
    }

    return activeWallSceneItemRef.current;
  }, [editorState.level, selectedRoomId]);

  const centerCurrentScene = useCallback(
    (zoom = camera.zoom) => {
      if (!viewportSize.width || !viewportSize.height) {
        return;
      }

      const bounds = getFocusBounds();
      if (!bounds) {
        return;
      }

      onCenterOnBounds(bounds, viewportSize.width, viewportSize.height, zoom);
    },
    [camera.zoom, getFocusBounds, onCenterOnBounds, viewportSize.height, viewportSize.width],
  );

  useEffect(() => {
    if (editorState.level !== 'wall') {
      setSelectedWallId(null);
      return;
    }

    if (activeWallObject) {
      setSelectedWallId(activeWallObject.id);
    }
  }, [activeWallObject, editorState.level]);

  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height) {
      return;
    }

    if (lastCenteredSceneKey === sceneCenterKey) {
      return;
    }

    centerCurrentScene(camera.zoom);
    setLastCenteredSceneKey(sceneCenterKey);
  }, [camera.zoom, centerCurrentScene, lastCenteredSceneKey, sceneCenterKey, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = (event: MouseEvent) => {
      const state = panStateRef.current;

      if (!state.isPanning) {
        return;
      }

      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;

      onSetCameraPosition(state.startPanX + dx, state.startPanY + dy);
    };

    const handleMouseUp = () => {
      panStateRef.current.isPanning = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onSetCameraPosition]);

  const startCanvasPan = (event: any) => {
    const native = event?.nativeEvent;

    panStateRef.current = {
      isPanning: true,
      startX: native?.clientX ?? 0,
      startY: native?.clientY ?? 0,
      startPanX: camera.panX,
      startPanY: camera.panY,
    };

    if (editorState.level === 'project') {
      onBackgroundPress();
    }
  };

  const webBackgroundPanProps = Platform.OS === 'web' ? ({ onMouseDown: startCanvasPan } as any) : {};

  const handleWheelZoom = useCallback(
    (event: any) => {
      if (Platform.OS !== 'web') {
        return;
      }

      const native = event?.nativeEvent;
      const deltaY = native?.deltaY ?? 0;
      if (!deltaY) {
        return;
      }

      event.preventDefault?.();
      const nextZoom = Number(Math.max(minZoom, Math.min(maxZoom, camera.zoom + (deltaY < 0 ? zoomStep : -zoomStep))).toFixed(2));
      if (nextZoom === camera.zoom) {
        return;
      }

      const anchorX = native?.locationX ?? viewportSize.width / 2;
      const anchorY = native?.locationY ?? viewportSize.height / 2;
      onZoomTo(nextZoom, { anchorX, anchorY });
    },
    [camera.zoom, maxZoom, minZoom, onZoomTo, viewportSize.height, viewportSize.width, zoomStep],
  );

  const handleTouchStart = useCallback((event: any) => {
    const touches = event?.nativeEvent?.touches;
    if (!touches || touches.length !== 2) {
      return;
    }

    const first = touches[0];
    const second = touches[1];
    touchStateRef.current = {
      pinchStartDistance: getTouchDistance(first, second),
      pinchStartCamera: camera,
      pinchCenterX: (first.locationX + second.locationX) / 2,
      pinchCenterY: (first.locationY + second.locationY) / 2,
    };
  }, [camera]);

  const handleTouchMove = useCallback(
    (event: any) => {
      const touches = event?.nativeEvent?.touches;
      if (!touches || touches.length !== 2) {
        return;
      }

      const pinchState = touchStateRef.current;
      if (!pinchState.pinchStartDistance || !pinchState.pinchStartCamera) {
        return;
      }

      const nextDistance = getTouchDistance(touches[0], touches[1]);
      if (!nextDistance) {
        return;
      }

      const ratio = nextDistance / pinchState.pinchStartDistance;
      const nextZoom = pinchState.pinchStartCamera.zoom * ratio;

      onZoomTo(nextZoom, {
        anchorX: pinchState.pinchCenterX,
        anchorY: pinchState.pinchCenterY,
        baseCamera: pinchState.pinchStartCamera,
      });
    },
    [onZoomTo],
  );

  const handleTouchEnd = useCallback((event: any) => {
    const touches = event?.nativeEvent?.touches;
    if (!touches || touches.length < 2) {
      touchStateRef.current = {
        pinchStartDistance: 0,
        pinchStartCamera: null,
        pinchCenterX: 0,
        pinchCenterY: 0,
      };
    }
  }, []);

  const renderProjectScene = () => (
    <View style={styles.transformedScene} pointerEvents="box-none">
      {rooms.map((room) => {
        const shouldShowDimensions = selectedRoomId === room.id || room.showDimensionsPinned;

        return shouldShowDimensions ? <V2RoomDimensions key={`dimensions-${room.id}`} room={room} unit={dimensionUnit} /> : null;
      })}
      {rooms.map((room) => (
        <V2Room
          key={room.id}
          room={room}
          selected={selectedRoomId === room.id}
          interactive
          onSelect={onSelectRoom}
          onMove={onMoveRoom}
          onResize={onResizeRoom}
          onRotate={onRotateRoom}
          onRenamePreset={onRenamePreset}
          onRenameCustom={onRenameCustom}
          onOpenSettings={onOpenSettings}
          onOpenRoom={onOpenRoom}
          onUpdateRoomSize={onUpdateRoomSize}
          onToggleSizeLock={onToggleSizeLock}
          onToggleDimensionLinesPinned={onToggleDimensionLinesPinned}
          onAddDoor={onAddDoor}
          onAddWindow={onAddWindow}
          dimensionUnit={dimensionUnit}
          onDimensionUnitChange={onDimensionUnitChange}
          camera={camera}
          viewportWidth={viewportSize.width}
          viewportHeight={viewportSize.height}
        />
      ))}
    </View>
  );

  const wallLayoutSlots = getSurfaceLayoutSlotsByCompass(compassViewMode);

  const renderRoomScene = () => (
    <View style={styles.transformedScene} pointerEvents="box-none">
      <View
        style={[
          styles.roomSceneLayout,
          {
            left: SCENE_CENTER_X - ROOM_SCENE_WIDTH / 2,
            top: SCENE_CENTER_Y - ROOM_SCENE_HEIGHT / 2,
            width: ROOM_SCENE_WIDTH,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.rowTriple}>
          <View style={styles.surfaceSlotSpacer} />
          <View style={styles.surfaceSlot}>
            {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === 'ceiling') ?? null, false, onOpenWall)}
          </View>
          <View style={styles.surfaceSlotSpacer} />
        </View>
        <View style={styles.rowTriple}>
          <View style={styles.surfaceSlotSpacer} />
          <View style={styles.surfaceSlot}>
            {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === wallLayoutSlots.top) ?? null, true, onOpenWall)}
          </View>
          <View style={styles.surfaceSlotSpacer} />
        </View>
        <View style={styles.rowTriple}>
          <View style={styles.surfaceSlot}>
            {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === wallLayoutSlots.left) ?? null, true, onOpenWall)}
          </View>
          <View style={styles.surfaceSlot}>
            {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === 'floor') ?? null, false, onOpenWall)}
          </View>
          <View style={styles.surfaceSlot}>
            {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === wallLayoutSlots.right) ?? null, true, onOpenWall)}
          </View>
        </View>
        <View style={styles.rowTriple}>
          <View style={styles.surfaceSlotSpacer} />
          <View style={styles.surfaceSlot}>
            {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === wallLayoutSlots.bottom) ?? null, true, onOpenWall)}
          </View>
          <View style={styles.surfaceSlotSpacer} />
        </View>
      </View>
    </View>
  );

  const renderWallScene = () => (
    <View style={styles.transformedScene} pointerEvents="box-none">
      {activeWallObject ? (
        <V2WallObject
          wall={activeWallObject}
          selected={selectedWallId === activeWallObject.id}
          x={wallScenePosition.x}
          y={wallScenePosition.y}
          width={WALL_SCENE_LAYOUT.width}
          height={WALL_SCENE_LAYOUT.activeWallHeight}
          onSelect={setSelectedWallId}
          onMove={(_, x, y) => {
            setWallScenePosition({ x, y });
          }}
          onRotatePlaceholder={(wallId) => {
            console.log('rotate wall placeholder', wallId);
          }}
          onOpenSettingsPlaceholder={(wallId) => {
            console.log('wall settings placeholder', wallId);
          }}
        />
      ) : null}

      <View style={styles.wallMetaLayer} pointerEvents="none">
        {renderSurfaceCard(activeWallObject, false, onOpenWall, true, activeSurfaceId, wallObjects.length)}
      </View>
    </View>
  );


  const handleZoomStep = useCallback(
    (direction: 'in' | 'out') => {
      const zoomDelta = direction === 'in' ? zoomStep : -zoomStep;
      const nextZoom = Number(Math.max(minZoom, Math.min(maxZoom, camera.zoom + zoomDelta)).toFixed(2));

      if (nextZoom === camera.zoom) {
        return;
      }

      centerCurrentScene(nextZoom);
    },
    [camera.zoom, centerCurrentScene, maxZoom, minZoom, zoomStep],
  );

  const handleZoomIn = useCallback(() => {
    handleZoomStep('in');
  }, [handleZoomStep]);

  const handleZoomOut = useCallback(() => {
    handleZoomStep('out');
  }, [handleZoomStep]);

  const handleResetToProjectDefault = useCallback(() => {
    centerCurrentScene(1);
  }, [centerCurrentScene]);

  const renderSceneByLevel = () => {
    if (editorState.level === 'wall') {
      return renderWallScene();
    }

    if (editorState.level === 'room') {
      return renderRoomScene();
    }

    return renderProjectScene();
  };

  return (
    <View
      style={styles.canvasViewport}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewportSize({ width, height });
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...(Platform.OS === 'web' ? ({ onWheel: handleWheelZoom } as any) : {})}
    >
      <V2CanvasControls
        backLabel={editorState.level === 'room' ? '← Проект' : editorState.level === 'wall' ? '← Комната' : null}
        isFullscreen={isFullscreen}
        showGrid={showGrid}
        scale={camera.zoom}
        onBackPress={editorState.level === 'room' ? onBackToProject : editorState.level === 'wall' ? onBackToRoom : undefined}
        onToggleFullscreen={onToggleFullscreen}
        onToggleGrid={onToggleGrid}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetToProjectDefault={handleResetToProjectDefault}
      />

      {showCompass ? <V2Compass viewMode={compassViewMode} onToggleOrientation={onToggleCompassOrientation} /> : null}

      <Pressable
        style={StyleSheet.absoluteFill}
        {...webBackgroundPanProps}
        onPress={editorState.level === 'project' ? onBackgroundPress : undefined}
      />

      <View
        style={[
          styles.sceneLayer,
          {
            width: SCENE_WIDTH,
            height: SCENE_HEIGHT,
            left: viewportSize.width / 2 - SCENE_CENTER_X,
            top: viewportSize.height / 2 - SCENE_CENTER_Y,
            transform: [{ translateX: camera.panX }, { translateY: camera.panY }, { scale: camera.zoom }],
          },
        ]}
        pointerEvents="box-none"
      >
        {showGrid ? <V2Grid sceneWidth={SCENE_WIDTH} sceneHeight={SCENE_HEIGHT} cellSize={GRID_CELL_SIZE} /> : null}
        {renderSceneByLevel()}
      </View>

      <Pressable style={styles.gearButton} onPress={onOpenTools}>
        <Text style={styles.gearIcon}>⚙️</Text>
      </Pressable>
    </View>
  );
};

const renderSurfaceCard = (
  surface: RoomSurfaceObject | null,
  clickableWall: boolean,
  onOpenWall: (wall: WallSurface) => void,
  wallFocus = false,
  surfaceId: string | null = null,
  objectCount?: number,
) => {
  if (!surface) return <View style={styles.surfaceMissing} />;

  const isWall = surface.direction === 'north' || surface.direction === 'east' || surface.direction === 'south' || surface.direction === 'west';
  const content = (
    <View style={[styles.surfaceCard, wallFocus ? styles.surfaceCardWallFocus : null]}>
      <Text style={styles.surfaceTitle}>{getSurfaceTitle(surface.direction)}</Text>
      <Text style={styles.surfaceMeta}>{surface.id}</Text>
      <Text style={styles.surfaceMeta}>roomId: {surface.roomId}</Text>
      <Text style={styles.surfaceMeta}>surfaceId: {surfaceId ?? surface.id}</Text>
      <Text style={styles.surfaceMeta}>direction: {surface.direction}</Text>
      {typeof objectCount === 'number' ? <Text style={styles.surfaceMeta}>objects: {objectCount}</Text> : null}
      <Text style={styles.surfaceMeta}>
        {formatMm(surface.widthMm)} × {formatMm(surface.heightMm)}
      </Text>
    </View>
  );

  if (clickableWall && isWall) {
    return (
      <Pressable onPress={() => onOpenWall(surface.direction as WallSurface)} style={styles.surfacePressable}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.surfacePressable}>{content}</View>;
};

const styles = StyleSheet.create({
  canvasViewport: {
    flex: 1,
    backgroundColor: '#F9FBFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5DEEF',
    overflow: 'hidden',
    position: 'relative',
  },
  sceneLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  transformedScene: {
    zIndex: 5,
  },
  gearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#DCE3F2',
    zIndex: 20,
  },
  gearIcon: { fontSize: 18 },
  roomSceneLayout: {
    position: 'absolute',
    gap: ROOM_SCENE_LAYOUT.gap,
  },
  wallMetaLayer: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: 260,
  },
  rowTriple: {
    flexDirection: 'row',
    gap: 12,
  },
  surfaceSlot: {
    width: ROOM_SCENE_LAYOUT.cardWidth,
  },
  surfaceSlotSpacer: {
    width: ROOM_SCENE_LAYOUT.cardWidth,
  },
  surfacePressable: {
    flex: 1,
  },
  surfaceCard: {
    minHeight: 86,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#AFC0E6',
    backgroundColor: '#EAF1FF',
    padding: 10,
    gap: 3,
  },
  surfaceCardWallFocus: {
    backgroundColor: '#DFE9FF',
    borderColor: '#638DF5',
    minHeight: 220,
  },
  surfaceTitle: {
    color: '#1F2A44',
    fontSize: 13,
    fontWeight: '700',
  },
  surfaceMeta: {
    color: '#4A5B7D',
    fontSize: 11,
    fontWeight: '500',
  },
  surfaceMissing: {
    flex: 1,
    minHeight: 50,
  },
});
