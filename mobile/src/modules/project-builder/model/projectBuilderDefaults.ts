import { Project, Room, RoomType, ROOM_TYPE_LABELS } from '../types';

export const DEFAULT_ROOM_SIZE = {
  width: 120,
  height: 90,
};

const ROOM_STEP = 18;

const DEFAULT_PROJECT_NAME = 'Новый проект';

export const createInitialProject = (): Project => {
  const now = new Date().toISOString();

  return {
    id: `project-${Date.now()}`,
    name: DEFAULT_PROJECT_NAME,
    rooms: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultRoom = (roomIndex: number, type: RoomType = 'other'): Room => ({
  id: `room-${Date.now()}-${roomIndex + 1}`,
  x: 16 + ROOM_STEP * roomIndex,
  y: 16 + ROOM_STEP * roomIndex,
  width: DEFAULT_ROOM_SIZE.width,
  height: DEFAULT_ROOM_SIZE.height,
  type,
  name: ROOM_TYPE_LABELS[type],
});
