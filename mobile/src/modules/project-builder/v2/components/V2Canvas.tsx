import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';
import { CompassViewMode } from '../model/orientation';
import { EditorState, RoomSurface } from '../model/editorTypes';
import { V2CanvasControls } from './V2CanvasControls';
import { V2Compass } from './V2Compass';
import { V2Grid } from './V2Grid';
import { V2RoomDimensions } from './V2RoomDimensions';
import { V2Room } from './V2Room';
import { V2SurfaceView } from './V2SurfaceView';
import { getSurfaceTitle } from '../utils/getSurfaceMetrics';

type Props = {
  rooms: RoomV2[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onMoveRoom: (roomId: string, centerX: number, centerY: number) => void;
  onResizeRoom: (roomId: string, width: number, height: number) => void;
  onRotateRoom: (roomId: string) => void;
  onBackgroundPress: () => void;
  onRenamePreset: (roomId: string, name: string) => void;
  onCustomRename: (roomId: string) => void;
  onOpenSettings: (roomId: string) => void;
  onOpenRoom: (roomId: string) => void;
  editorState: EditorState;
  onBackToProject: () => void;
  onOpenSurface: (surface: RoomSurface) => void;
  onBackToRoom: () => void;
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
  onCustomRename,
  onOpenSettings,
  onOpenRoom,
  editorState,
  onBackToProject,
  onOpenSurface,
  onBackToRoom,
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
}: Props) => {
  const surfaceTabs: Array<{ key: RoomSurface; label: string }> = [
    { key: 'north-wall', label: 'Север' },
    { key: 'east-wall', label: 'Восток' },
    { key: 'south-wall', label: 'Юг' },
    { key: 'west-wall', label: 'Запад' },
    { key: 'floor', label: 'Пол' },
    { key: 'ceiling', label: 'Потолок' },
  ];

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const activeRoom = rooms.find((room) => room.id === editorState.activeRoomId) ?? null;

  const handleCanvasMouseDown = (event: any) => {
    if (event?.target === event?.currentTarget) {
      onBackgroundPress();
    }
  };

  const webCanvasProps = Platform.OS === 'web' ? ({ onMouseDown: handleCanvasMouseDown } as any) : {};

  return (
    <View style={styles.canvas} {...webCanvasProps}>
      {Platform.OS === 'web' ? null : <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} />}
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
      {showCompass ? (
        <V2Compass viewMode={compassViewMode} onToggleOrientation={onToggleCompassOrientation} />
      ) : null}

      <Pressable style={styles.gearButton} onPress={onOpenTools}>
        <Text style={styles.gearIcon}>⚙️</Text>
      </Pressable>

      {editorState.viewMode === 'room' && activeRoom ? (
        <View style={styles.modeShell}>
          <View style={styles.modeHeader}>
            <Pressable style={styles.modeBackButton} onPress={onBackToProject}>
              <Text style={styles.modeBackButtonText}>← Проект</Text>
            </Pressable>

            <View style={styles.modeHeaderMeta}>
              <Text style={styles.modeRoomName}>{activeRoom.name}</Text>
              <Text style={styles.modeSubtitle}>Режим комнаты</Text>
            </View>
          </View>

          <View style={styles.surfaceTabsRow}>
            {surfaceTabs.map((tab) => {
              const isActive = editorState.activeSurface === tab.key;

              return (
                <Pressable
                  key={tab.key}
                  style={[styles.surfaceTab, isActive ? styles.surfaceTabActive : null]}
                  onPress={() => onOpenSurface(tab.key)}
                >
                  <Text style={[styles.surfaceTabText, isActive ? styles.surfaceTabTextActive : null]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {editorState.viewMode === 'surface' && activeRoom && editorState.activeSurface ? (
        <View style={styles.surfaceShell}>
          <View style={styles.modeHeader}>
            <Pressable style={styles.modeBackButton} onPress={onBackToRoom}>
              <Text style={styles.modeBackButtonText}>← К комнате</Text>
            </Pressable>

            <View style={styles.modeHeaderMeta}>
              <Text style={styles.modeRoomName}>{activeRoom.name}</Text>
              <Text style={styles.modeSubtitle}>{getSurfaceTitle(editorState.activeSurface)}</Text>
            </View>
          </View>

          <V2SurfaceView room={activeRoom} surface={editorState.activeSurface} />
        </View>
      ) : (
        <View
          style={[
            styles.sceneLayer,
            {
              transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale }],
            },
          ]}
          pointerEvents="box-none"
        >
          {rooms.map((room) => (
            <V2Room
              key={room.id}
              room={room}
              selected={selectedRoomId === room.id}
              onSelect={onSelectRoom}
              onMove={onMoveRoom}
              onResize={onResizeRoom}
              onRotate={onRotateRoom}
              onRenamePreset={onRenamePreset}
              onCustomRename={onCustomRename}
              onOpenSettings={onOpenSettings}
              onOpenRoom={onOpenRoom}
              onUpdateRoomSize={onUpdateRoomSize}
              onToggleSizeLock={onToggleSizeLock}
              onAddDoor={onAddDoor}
              onAddWindow={onAddWindow}
            />
          ))}

          {selectedRoom ? <V2RoomDimensions room={selectedRoom} /> : null}
        </View>
      )}
    </View>
  );
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
  sceneLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  modeShell: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 50,
    gap: 10,
  },
  surfaceShell: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 50,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeBackButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBC5DC',
    backgroundColor: '#FFFFFF',
  },
  modeBackButtonText: {
    color: '#2A3756',
    fontSize: 12,
    fontWeight: '700',
  },
  modeHeaderMeta: {
    flex: 1,
    gap: 2,
  },
  modeRoomName: {
    color: '#1F2A44',
    fontSize: 14,
    fontWeight: '700',
  },
  modeSubtitle: {
    color: '#5D6B89',
    fontSize: 12,
    fontWeight: '500',
  },
  surfaceTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    padding: 8,
  },
  surfaceTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBC5DC',
    backgroundColor: '#FFFFFF',
  },
  surfaceTabActive: {
    borderColor: '#4B84FF',
    backgroundColor: '#EAF1FF',
  },
  surfaceTabText: {
    color: '#2A3756',
    fontSize: 12,
    fontWeight: '700',
  },
  surfaceTabTextActive: {
    color: '#1C4CCC',
  },
});
