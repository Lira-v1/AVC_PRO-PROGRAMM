import { ROOM_BASE_SIZE_CM } from './metrics';
import { SceneStateV2 } from './types';

export const INITIAL_SCENE_V2: SceneStateV2 = {
  rooms: [
    {
      id: 'room-1',
      name: 'Комната 1',
      centerX: 130,
      centerY: 130,
      width: 100,
      height: 100,
      widthCm: ROOM_BASE_SIZE_CM,
      heightCm: ROOM_BASE_SIZE_CM,
      rotation: 0,
      isSizeLocked: false,
    },
  ],
  selectedRoomId: null,
  activeTool: 'select',
};
