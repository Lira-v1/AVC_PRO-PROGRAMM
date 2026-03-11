import { useMemo, useState } from 'react';
import { createDefaultRoom, createInitialProject } from '../model/projectBuilderDefaults';
import { Project, Room, RoomType, ROOM_TYPE_LABELS } from '../types';

const MIN_ROOM_SIZE = 40;

type RoomDimensions = {
  width: number;
  height: number;
};

export const useProjectBuilder = () => {
  const [project, setProject] = useState<Project>(() => createInitialProject());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const addRoom = () => {
    const nextRoom = createDefaultRoom(project.rooms.length);

    setProject((prevProject) => {
      return {
        ...prevProject,
        rooms: [...prevProject.rooms, nextRoom],
        updatedAt: new Date().toISOString(),
      };
    });

    setSelectedRoomId(nextRoom.id);
  };

  const selectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  const updateRoom = (roomId: string, updater: (room: Room) => Room) => {
    setProject((prevProject) => ({
      ...prevProject,
      rooms: prevProject.rooms.map((room) => (room.id === roomId ? updater(room) : room)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const moveRoom = (roomId: string, x: number, y: number) => {
    updateRoom(roomId, (room) => ({ ...room, x: Math.max(0, x), y: Math.max(0, y) }));
  };

  const resizeRoom = (roomId: string, width: number, height: number) => {
    updateRoom(roomId, (room) => ({
      ...room,
      width: Math.max(MIN_ROOM_SIZE, width),
      height: Math.max(MIN_ROOM_SIZE, height),
    }));
  };

  const setRoomType = (roomId: string, type: RoomType) => {
    updateRoom(roomId, (room) => ({
      ...room,
      type,
      name: ROOM_TYPE_LABELS[type],
    }));
  };

  const setRoomDimensions = (roomId: string, dimensions: RoomDimensions) => {
    resizeRoom(roomId, dimensions.width, dimensions.height);
  };

  const removeRoom = (roomId: string) => {
    setProject((prevProject) => ({
      ...prevProject,
      rooms: prevProject.rooms.filter((room) => room.id !== roomId),
      updatedAt: new Date().toISOString(),
    }));

    setSelectedRoomId((currentSelected) => (currentSelected === roomId ? null : currentSelected));
  };

  const rooms = useMemo<Room[]>(() => project.rooms, [project.rooms]);
  const selectedRoom = useMemo<Room | null>(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  return {
    project,
    rooms,
    selectedRoom,
    selectedRoomId,
    addRoom,
    selectRoom,
    moveRoom,
    resizeRoom,
    setRoomType,
    setRoomDimensions,
    removeRoom,
  };
};
