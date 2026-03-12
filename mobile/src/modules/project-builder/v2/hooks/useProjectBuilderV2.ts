import { useMemo, useState } from 'react';
import { INITIAL_SCENE_V2 } from '../model/defaults';

const MIN_ROOM_SIZE = 80;

export const useProjectBuilderV2 = () => {
  const [scene, setScene] = useState(INITIAL_SCENE_V2);

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
          ? {
              ...room,
              width: Math.max(MIN_ROOM_SIZE, width),
              height: Math.max(MIN_ROOM_SIZE, height),
            }
          : room,
      ),
    }));
  };

  return {
    scene,
    rooms: scene.rooms,
    selectedRoomId: scene.selectedRoomId,
    selectedRoom,
    activeTool: scene.activeTool,
    selectRoom,
    deselectRoom,
    moveRoom,
    resizeRoom,
  };
};
