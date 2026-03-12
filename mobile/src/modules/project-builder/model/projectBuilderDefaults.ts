import { createId } from '../utils/ids';
import { DEFAULT_PROJECT_ORIENTATION } from './orientation';
import { Project, Room, RoomType, ROOM_TYPE_LABELS } from '../types';

export const DEFAULT_ROOM_SIZE = {
  width: 120,
  height: 90,
};

const ROOM_STEP = 28;
const DEFAULT_PROJECT_NAME = 'Новый проект';

export const createInitialProject = (): Project => {
  const now = new Date().toISOString();

  return {
    id: createId('project'),
    name: DEFAULT_PROJECT_NAME,
    title: DEFAULT_PROJECT_NAME,
    objectType: 'apartment',
    orientation: DEFAULT_PROJECT_ORIENTATION,
    rooms: [],
    elements: [],
    summary: {
      byType: {},
      byRoom: {},
    },
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultRoom = (roomIndex: number, type: RoomType = 'other'): Room => ({
  id: createId('room'),
  x: 40 + ROOM_STEP * roomIndex,
  y: 40 + ROOM_STEP * roomIndex,
  width: DEFAULT_ROOM_SIZE.width,
  height: DEFAULT_ROOM_SIZE.height,
  type,
  name: ROOM_TYPE_LABELS[type],
});
