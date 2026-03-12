import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';
import { CompassViewMode } from '../model/orientation';
import { EditorState, WallSurface } from '../model/editorTypes';
import { V2CanvasControls } from './V2CanvasControls';
import { V2Compass } from './V2Compass';
import { V2Grid } from './V2Grid';
import { V2RoomDimensions } from './V2RoomDimensions';
import { V2Room } from './V2Room';
import { buildRoomSurfaceObjects, formatMm, getSurfaceTitle } from '../utils/getSurfaceMetrics';
import { RoomSizeUnit } from '../utils/roomUnits';
import { RoomSurfaceObject } from '../model/surfaces';
import { SceneObject } from '../model/sceneObjects';
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
  scale: number;
  offsetX: number;
  offsetY: number;
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



const ROOM_SCENE_LAYOUT = {
  left: 70,
  top: 70,
  width: 420,
  gap: 12,
  rowHeight: 86,
};

const WALL_SCENE_LAYOUT = {
  left: 70,
  top: 100,
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
  scale,
  offsetX,
  offsetY,
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

  const handleCanvasMouseDown = (event: any) => {
    if (editorState.level !== 'project') return;

    if (event?.target === event?.currentTarget) {
      onBackgroundPress();
    }
  };

  const webCanvasProps = Platform.OS === 'web' ? ({ onMouseDown: handleCanvasMouseDown } as any) : {};

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

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
      x: WALL_SCENE_LAYOUT.left,
      y: WALL_SCENE_LAYOUT.top,
      width: WALL_SCENE_LAYOUT.width,
      height: WALL_SCENE_LAYOUT.activeWallHeight,
    };
  }, [activeWallObject]);

  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height) {
      return;
    }

    if (editorState.level === 'project') {
      const firstRoom = rooms[0] ?? null;
      if (!firstRoom) {
        return;
      }

      const bounds = getRoomVisualBounds(firstRoom);
      const centered = centerBoundsInViewport(bounds, viewportSize.width, viewportSize.height, scale);
      onSetCameraPosition(centered.panX, centered.panY);
      return;
    }

    if (editorState.level === 'room') {
      if (!roomSurfaceSceneItems.length) {
        return;
      }

      const bounds = getSurfaceSceneBounds(roomSurfaceSceneItems);
      const centered = centerBoundsInViewport(bounds, viewportSize.width, viewportSize.height, scale);
      onSetCameraPosition(centered.panX, centered.panY);
      return;
    }

    if (editorState.level === 'wall') {
      if (!activeWallSceneItem) {
        return;
      }

      const centered = centerBoundsInViewport(activeWallSceneItem, viewportSize.width, viewportSize.height, scale);
      onSetCameraPosition(centered.panX, centered.panY);
    }
  }, [
    activeWallSceneItem,
    editorState.activeRoomId,
    editorState.activeWall,
    editorState.level,
    onSetCameraPosition,
    roomSurfaceSceneItems,
    rooms,
    scale,
    viewportSize.height,
    viewportSize.width,
  ]);

  const renderProjectScene = () => (
    <View style={[styles.sceneLayer, styles.transformedScene, { transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale }] }]} pointerEvents="box-none">
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
    <View style={[styles.sceneLayer, styles.transformedScene, { transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale }] }]} pointerEvents="box-none">
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
    <View style={[styles.sceneLayer, styles.transformedScene, { transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale }] }]} pointerEvents="box-none">
      <View style={styles.wallSceneLayout} pointerEvents="box-none">
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
      style={styles.canvas}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewportSize({ width, height });
      }}
      {...webCanvasProps}
    >
      {Platform.OS === 'web' ? null : editorState.level === 'project' ? <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} /> : null}
      {showGrid ? <V2Grid /> : null}

      <V2CanvasControls
        isFullscreen={isFullscreen}
        showGrid={showGrid}
        scale={scale}
        onToggleFullscreen={onToggleFullscreen}
        onToggleGrid={onToggleGrid}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
      />

      {showCompass ? <V2Compass viewMode={compassViewMode} onToggleOrientation={onToggleCompassOrientation} /> : null}

      <Pressable style={styles.gearButton} onPress={onOpenTools}>
        <Text style={styles.gearIcon}>⚙️</Text>
      </Pressable>

      {editorState.level === 'room' ? (
        <Pressable style={styles.backButton} onPress={onBackToProject}>
          <Text style={styles.backButtonText}>← Проект</Text>
        </Pressable>
      ) : null}

      {editorState.level === 'wall' ? (
        <Pressable style={styles.backButton} onPress={onBackToRoom}>
          <Text style={styles.backButtonText}>← Комната</Text>
        </Pressable>
      ) : null}

      {renderSceneByLevel()}
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
  canvas: {
    flex: 1,
    backgroundColor: '#F9FBFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5DEEF',
    overflow: 'hidden',
    position: 'relative',
  },
  sceneLayer: {
    ...StyleSheet.absoluteFillObject,
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
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBC5DC',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  backButtonText: {
    color: '#2A3756',
    fontSize: 12,
    fontWeight: '700',
  },
  roomSceneLayout: {
    position: 'absolute',
    left: ROOM_SCENE_LAYOUT.left,
    top: ROOM_SCENE_LAYOUT.top,
    width: ROOM_SCENE_LAYOUT.width,
    gap: ROOM_SCENE_LAYOUT.gap,
  },
  wallSceneLayout: {
    position: 'absolute',
    left: WALL_SCENE_LAYOUT.left,
    top: WALL_SCENE_LAYOUT.top,
    width: WALL_SCENE_LAYOUT.width,
    height: 300,
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
