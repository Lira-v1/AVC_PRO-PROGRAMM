import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RoomV2 } from '../model/types';
import { CompassViewMode } from '../model/orientation';
import { V2CanvasControls } from './V2CanvasControls';
import { V2Compass } from './V2Compass';
import { V2Grid } from './V2Grid';
import { V2RoomDimensions } from './V2RoomDimensions';
import { V2Room } from './V2Room';

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
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

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
});
