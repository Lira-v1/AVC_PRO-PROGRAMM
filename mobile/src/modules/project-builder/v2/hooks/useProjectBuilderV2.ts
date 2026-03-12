import { useMemo, useState } from 'react';
import { INITIAL_SCENE_V2 } from '../model/defaults';
import { EditorState, RoomSurface } from '../model/editorTypes';
import { ROOM_MIN_SIZE_CM } from '../model/metrics';
import { INITIAL_PROJECT_ORIENTATION_V2, ProjectOrientationV2 } from '../model/orientation';

export const useProjectBuilderV2 = () => {
  const [scene, setScene] = useState(INITIAL_SCENE_V2);
  const [orientation, setOrientation] = useState<ProjectOrientationV2>(INITIAL_PROJECT_ORIENTATION_V2);
  const [editorState, setEditorState] = useState<EditorState>({
    viewMode: 'project',
    activeRoomId: null,
    activeSurface: null,
  });

  const selectedRoom = useMemo(() => scene.rooms.find((room) => room.id === scene.selectedRoomId) ?? null, [scene.rooms, scene.selectedRoomId]);

  const MM_PER_CANVAS_UNIT = 10;

  const selectRoom = (roomId: string) => {
    setScene((prev) => ({
      ...prev,
      selectedRoomId: roomId,
    }));
  };

  const deselectRoom = () => {
    setScene((prev) => ({
      ...prev,
      selectedRoomId: null,
    }));
  };

  const moveRoom = (roomId: string, centerX: number, centerY: number) => {
    setScene((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => (room.id === roomId ? { ...room, centerX, centerY } : room)),
    }));
  };

  const resizeRoom = (roomId: string, width: number, height: number) => {
    setScene((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? (() => {
              const nextWidth = Math.max(ROOM_MIN_SIZE_CM, width);
              const nextHeight = Math.max(ROOM_MIN_SIZE_CM, height);

              return {
                ...room,
                width: nextWidth,
                height: nextHeight,
                widthMm: Math.round(nextWidth * MM_PER_CANVAS_UNIT),
                heightMm: Math.round(nextHeight * MM_PER_CANVAS_UNIT),
              };
            })()
          : room,
      ),
    }));
  };

  const updateRoomSize = (roomId: string, widthMm: number, heightMm: number) => {
    const safeWidthMm = Math.max(1, widthMm);
    const safeHeightMm = Math.max(1, heightMm);

    setScene((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              widthMm: safeWidthMm,
              heightMm: safeHeightMm,
              width: safeWidthMm / MM_PER_CANVAS_UNIT,
              height: safeHeightMm / MM_PER_CANVAS_UNIT,
            }
          : room,
      ),
    }));
  };

  const setRoomSizeLocked = (roomId: string, locked: boolean) => {
    setScene((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              isSizeLocked: locked,
            }
          : room,
      ),
    }));
  };

  const rotateRoom = (roomId: string) => {
    setScene((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => {
        if (room.id !== roomId) return room;

        const current = room.rotation ?? 0;
        const next = current === 270 ? 0 : ((current + 90) as 0 | 90 | 180 | 270);

        return {
          ...room,
          rotation: next,
        };
      }),
    }));
  };

  const renameRoom = (roomId: string, newName: string) => {
    const safeName = newName.trim();
    if (!safeName) return;

    setScene((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => (room.id === roomId ? { ...room, name: safeName } : room)),
    }));
  };

  const toggleCompassOrientation = () => {
    setOrientation((prev) => ({
      ...prev,
      viewMode: prev.viewMode === 'default' ? 'flipped' : 'default',
    }));
  };

  const openRoom = (roomId: string) => {
    setEditorState({
      viewMode: 'room',
      activeRoomId: roomId,
      activeSurface: null,
    });
  };

  const openSurface = (surface: RoomSurface) => {
    setEditorState((prev) => ({
      ...prev,
      viewMode: 'surface',
      activeSurface: surface,
    }));
  };

  const backToRoom = () => {
    setEditorState((prev) => ({
      ...prev,
      viewMode: 'room',
      activeSurface: null,
    }));
  };

  const backToProject = () => {
    setEditorState({
      viewMode: 'project',
      activeRoomId: null,
      activeSurface: null,
    });
  };

  return {
    scene,
    rooms: scene.rooms,
    selectedRoomId: scene.selectedRoomId,
    selectedRoom,
    activeTool: scene.activeTool,
    orientation,
    editorState,
    setEditorState,
    selectRoom,
    deselectRoom,
    moveRoom,
    resizeRoom,
    updateRoomSize,
    setRoomSizeLocked,
    rotateRoom,
    renameRoom,
    toggleCompassOrientation,
    openRoom,
    openSurface,
    backToRoom,
    backToProject,
  };
};
