import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EditorState } from '../model/editorTypes';
import { RoomSurfaceObject } from '../model/surfaces';
import { CompassViewMode } from '../model/orientation';
import { RoomV2, CanvasCameraState } from '../model/types';
import { SceneObject } from '../model/sceneObjects';

type RoomMenuDebugState = {
  activeMenu: 'root' | 'name' | 'settings' | null;
  activeSubmenu: 'root' | 'name' | 'settings' | null;
  isMenuOpen: boolean;
  anchorPosition: { x: number; y: number } | null;
};

type UiDebugElement = {
  id: string;
  type: string;
  roomId?: string | null;
  surfaceId?: string | null;
  anchor: string;
  coordSpace: 'world' | 'room' | 'screen' | 'viewport';
  x: number;
  y: number;
  source: string;
};

type Props = {
  visible: boolean;
  editorState: EditorState;
  selectedRoomId: string | null;
  activeRoom: RoomV2 | null;
  selectedRoom: RoomV2 | null;
  roomSurfaces: RoomSurfaceObject[];
  activeObject: SceneObject | null;
  showGrid: boolean;
  showCompass: boolean;
  compassViewMode: CompassViewMode;
  camera: CanvasCameraState;
  roomMenuState: RoomMenuDebugState | null;
  uiElements: UiDebugElement[];
};

const line = (label: string, value: unknown) => `${label}: ${value == null ? 'null' : String(value)}`;

export const V2DeveloperPanel = ({
  visible,
  editorState,
  selectedRoomId,
  activeRoom,
  selectedRoom,
  roomSurfaces,
  activeObject,
  showGrid,
  showCompass,
  compassViewMode,
  camera,
  roomMenuState,
  uiElements,
}: Props) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'done' | 'error'>('idle');

  const debugText = useMemo(() => {
    const sections: string[] = [];

    sections.push(
      [
        '=== EDITOR STATE ===',
        line('editor.level', editorState.level),
        line('selectedRoomId', selectedRoomId),
        line('activeRoomId', editorState.activeRoomId),
        line('activeWall', editorState.activeWall),
        line('showGrid', showGrid),
        line('showCompass', showCompass),
        line('compassViewMode', compassViewMode),
        line('camera.zoom', camera.zoom),
        line('camera.panX', camera.panX),
        line('camera.panY', camera.panY),
      ].join('\n'),
    );

    if (selectedRoom) {
      sections.push(
        [
          '=== ROOM ===',
          line('room.id', selectedRoom.id),
          line('room.name', selectedRoom.name),
          line('room.widthMm', selectedRoom.widthMm),
          line('room.heightMm', selectedRoom.heightMm),
          line('room.rotation', selectedRoom.rotation),
          line('room.centerX', selectedRoom.centerX),
          line('room.centerY', selectedRoom.centerY),
          line('room.isSizeLocked', selectedRoom.isSizeLocked ?? false),
          line('room.showDimensionsPinned', selectedRoom.showDimensionsPinned ?? false),
        ].join('\n'),
      );
    }

    if (activeRoom && roomSurfaces.length) {
      sections.push(
        [
          '=== SURFACES ===',
          ...roomSurfaces.map((surface) =>
            [
              line('surface.id', surface.id),
              line('surface.roomId', surface.roomId),
              line('surface.direction', surface.direction),
              line('surface.widthMm', surface.widthMm),
              line('surface.heightMm', surface.heightMm),
              '---',
            ].join('\n'),
          ),
        ].join('\n'),
      );
    }

    if (activeObject) {
      sections.push(
        [
          '=== ACTIVE OBJECT ===',
          line('object.id', activeObject.id),
          line('object.type', activeObject.type),
          line('object.roomId', activeObject.roomId),
          line('object.surfaceId', activeObject.surfaceId),
          line('object.direction', activeObject.direction),
          line('object.offsetMm', activeObject.offsetMm),
          line('object.widthMm', activeObject.widthMm),
          line('object.heightMm', activeObject.heightMm ?? null),
        ].join('\n'),
      );
    }

    if (roomMenuState) {
      sections.push(
        [
          '=== ROOM MENU STATE ===',
          line('active menu', roomMenuState.activeMenu),
          line('active submenu', roomMenuState.activeSubmenu),
          line('isMenuOpen', roomMenuState.isMenuOpen),
          line('anchor position menu x', roomMenuState.anchorPosition?.x ?? null),
          line('anchor position menu y', roomMenuState.anchorPosition?.y ?? null),
        ].join('\n'),
      );
    }

    if (uiElements.length) {
      sections.push(
        [
          '=== UI ELEMENTS ===',
          ...uiElements.map((ui) =>
            [
              line('ui.id', ui.id),
              line('ui.type', ui.type),
              line('ui.roomId', ui.roomId ?? null),
              line('ui.surfaceId', ui.surfaceId ?? null),
              line('ui.anchor', ui.anchor),
              line('ui.coordSpace', ui.coordSpace),
              line('ui.x', ui.x),
              line('ui.y', ui.y),
              line('ui.source', ui.source),
              '---',
            ].join('\n'),
          ),
        ].join('\n'),
      );
    }

    return sections.join('\n\n');
  }, [activeObject, activeRoom, camera.panX, camera.panY, camera.zoom, compassViewMode, editorState.activeRoomId, editorState.activeWall, editorState.level, roomMenuState, roomSurfaces, selectedRoom, selectedRoomId, showCompass, showGrid, uiElements]);

  if (!visible) {
    return null;
  }

  const handleCopy = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(debugText);
        setCopyStatus('done');
        return;
      }

      setCopyStatus('error');
    } catch (_error) {
      setCopyStatus('error');
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Developer inspector</Text>
        <Pressable style={styles.copyButton} onPress={handleCopy}>
          <Text style={styles.copyButtonText}>Копировать</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text selectable style={styles.codeText}>{debugText}</Text>
      </ScrollView>

      {copyStatus === 'done' ? <Text style={styles.statusSuccess}>Скопировано в буфер обмена</Text> : null}
      {copyStatus === 'error' ? <Text style={styles.statusError}>Копирование доступно в web-сборке</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 360,
    maxWidth: '92%',
    maxHeight: '68%',
    backgroundColor: 'rgba(12, 19, 36, 0.95)',
    borderWidth: 1,
    borderColor: '#2F436D',
    borderRadius: 12,
    zIndex: 80,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2F436D',
  },
  title: {
    color: '#DDE9FF',
    fontSize: 13,
    fontWeight: '700',
  },
  copyButton: {
    backgroundColor: '#2550BF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    maxHeight: 340,
  },
  contentContainer: {
    padding: 12,
  },
  codeText: {
    color: '#BFD4FF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'monospace',
    lineHeight: 16,
  },
  statusSuccess: {
    color: '#9EF0B1',
    fontSize: 11,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  statusError: {
    color: '#FFB4B4',
    fontSize: 11,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
});

export type { RoomMenuDebugState };
export type { UiDebugElement };
