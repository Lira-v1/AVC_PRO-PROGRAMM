import { useMemo, useState } from 'react';
import { INITIAL_SCENE_V2 } from '../model/defaults';
import { ROOM_MIN_SIZE_CM } from '../model/metrics';
import { INITIAL_PROJECT_ORIENTATION_V2, ProjectOrientationV2 } from '../model/orientation';

export const useProjectBuilderV2 = () => {
  const [scene, setScene] = useState(INITIAL_SCENE_V2);
  const [orientation, setOrientation] = useState<ProjectOrientationV2>(INITIAL_PROJECT_ORIENTATION_V2);

  const selectedRoom = useMemo(() => scene.rooms.find((room) => room.id === scene.selectedRoomId) ?? null, [scene.rooms, scene.selectedRoomId]);

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

  const moveRoom = (roomId: string, x: number, y: number) => {
    setScene((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => (room.id === roomId ? { ...room, x, y } : room)),
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
                widthCm: nextWidth,
                heightCm: nextHeight,
              };
            })()
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

  return {
    scene,
    rooms: scene.rooms,
    selectedRoomId: scene.selectedRoomId,
    selectedRoom,
    activeTool: scene.activeTool,
    orientation,
    selectRoom,
    deselectRoom,
    moveRoom,
    resizeRoom,
    rotateRoom,
    renameRoom,
    toggleCompassOrientation,
  };
};
