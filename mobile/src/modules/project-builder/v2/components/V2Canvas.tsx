import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';
import { CompassViewMode } from '../model/orientation';
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
import { centerBoundsInViewport } from '../utils/centerBoundsInViewport';
import { getSurfaceSceneBounds, SurfaceSceneItem } from '../utils/getSurfaceSceneBounds';

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
  onAddDoor: (roomId: string) => void;
  onAddWindow: (roomId: string) => void;
  showGrid: boolean;
  showCompass: boolean;
  compassViewMode: CompassViewMode;
  isFullscreen: boolean;
  camera: CanvasCameraState;
  onToggleGrid: () => void;
  onToggleFullscreen: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenTools: () => void;
  onToggleCompassOrientation: () => void;
  onSetCameraPosition: (panX: number, panY: number) => void;
  dimensionUnit: RoomSizeUnit;
  onDimensionUnitChange: (unit: RoomSizeUnit) => void;
};

const SCENE_WIDTH = 10000;
const SCENE_HEIGHT = 10000;


const ROOM_SCENE_LAYOUT = {
  left: 70,
  top: 70,
  width: 420,
  gap: 12,
  rowHeight: 86,
};

const WALL_SCENE_LAYOUT = {
  defaultX: 240,
  defaultY: 180,
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
  onAddDoor,
  onAddWindow,
  showGrid,
  showCompass,
  compassViewMode,
  isFullscreen,
  camera,
  onToggleGrid,
  onToggleFullscreen,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenTools,
  onToggleCompassOrientation,
  onSetCameraPosition,
  dimensionUnit,
  onDimensionUnitChange,
}: Props) => {
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
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
    const rowSplitWidth = (ROOM_SCENE_LAYOUT.width - ROOM_SCENE_LAYOUT.gap) / 2;
    const top = ROOM_SCENE_LAYOUT.top;
    const left = ROOM_SCENE_LAYOUT.left;
    const gap = ROOM_SCENE_LAYOUT.gap;
    const rowHeight = ROOM_SCENE_LAYOUT.rowHeight;

    return [
      { x: left, y: top, width: ROOM_SCENE_LAYOUT.width, height: rowHeight },
      { x: left, y: top + rowHeight + gap, width: rowSplitWidth, height: rowHeight },
      { x: left + rowSplitWidth + gap, y: top + rowHeight + gap, width: rowSplitWidth, height: rowHeight },
      { x: left, y: top + (rowHeight + gap) * 2, width: ROOM_SCENE_LAYOUT.width, height: rowHeight },
      { x: left, y: top + (rowHeight + gap) * 3, width: rowSplitWidth, height: rowHeight },
      { x: left + rowSplitWidth + gap, y: top + (rowHeight + gap) * 3, width: rowSplitWidth, height: rowHeight },
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

    if (editorState.level === 'project') {
      const firstRoom = roomsRef.current[0] ?? null;
      if (!firstRoom) {
        return;
      }

      const bounds = getRoomVisualBounds(firstRoom);
      const centered = centerBoundsInViewport(bounds, viewportSize.width, viewportSize.height, camera.zoom);
      onSetCameraPosition(centered.panX, centered.panY);
      setLastCenteredSceneKey(sceneCenterKey);
      return;
    }

    if (editorState.level === 'room') {
      if (!roomSurfaceSceneItemsRef.current.length) {
        return;
      }

      const bounds = getSurfaceSceneBounds(roomSurfaceSceneItemsRef.current);
      const centered = centerBoundsInViewport(bounds, viewportSize.width, viewportSize.height, camera.zoom);
      onSetCameraPosition(centered.panX, centered.panY);
      setLastCenteredSceneKey(sceneCenterKey);
      return;
    }

    if (editorState.level === 'wall') {
      const wallSceneItem = activeWallSceneItemRef.current;
      if (!wallSceneItem) {
        return;
      }

      const centered = centerBoundsInViewport(wallSceneItem, viewportSize.width, viewportSize.height, camera.zoom);
      onSetCameraPosition(centered.panX, centered.panY);
      setLastCenteredSceneKey(sceneCenterKey);
    }
  }, [
    editorState.level,
    lastCenteredSceneKey,
    onSetCameraPosition,
    sceneCenterKey,
    camera.zoom,
    viewportSize.height,
    viewportSize.width,
  ]);

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

  const renderProjectScene = () => (
    <View style={styles.transformedScene} pointerEvents="box-none">
      {selectedRoom ? <V2RoomDimensions room={selectedRoom} unit={dimensionUnit} /> : null}
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
          onAddDoor={onAddDoor}
          onAddWindow={onAddWindow}
          dimensionUnit={dimensionUnit}
          onDimensionUnitChange={onDimensionUnitChange}
        />
      ))}
    </View>
  );

  const renderRoomScene = () => (
    <View style={styles.transformedScene} pointerEvents="box-none">
      <View style={styles.roomSceneLayout} pointerEvents="box-none">
        <View style={styles.rowWide}>
          {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === 'north') ?? null, true, onOpenWall)}
        </View>
        <View style={styles.rowSplit}>
          {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === 'west') ?? null, true, onOpenWall)}
          {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === 'east') ?? null, true, onOpenWall)}
        </View>
        <View style={styles.rowWide}>
          {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === 'south') ?? null, true, onOpenWall)}
        </View>
        <View style={styles.rowSplit}>
          {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === 'floor') ?? null, false, onOpenWall)}
          {renderSurfaceCard(roomSurfaces.find((surface) => surface.direction === 'ceiling') ?? null, false, onOpenWall)}
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
    >
      <V2CanvasControls
        backLabel={editorState.level === 'room' ? '← Проект' : editorState.level === 'wall' ? '← Комната' : null}
        isFullscreen={isFullscreen}
        showGrid={showGrid}
        scale={camera.zoom}
        onBackPress={editorState.level === 'room' ? onBackToProject : editorState.level === 'wall' ? onBackToRoom : undefined}
        onToggleFullscreen={onToggleFullscreen}
        onToggleGrid={onToggleGrid}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
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
            transform: [{ translateX: camera.panX }, { translateY: camera.panY }, { scale: camera.zoom }],
          },
        ]}
        pointerEvents="box-none"
      >
        {showGrid ? <V2Grid /> : null}
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
    left: ROOM_SCENE_LAYOUT.left,
    top: ROOM_SCENE_LAYOUT.top,
    width: ROOM_SCENE_LAYOUT.width,
    gap: ROOM_SCENE_LAYOUT.gap,
  },
  wallMetaLayer: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: 260,
  },
  rowWide: {
    flexDirection: 'row',
  },
  rowSplit: {
    flexDirection: 'row',
    gap: 12,
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
