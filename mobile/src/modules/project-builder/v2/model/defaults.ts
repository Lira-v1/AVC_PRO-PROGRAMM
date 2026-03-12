import { SceneStateV2 } from './types';

export const INITIAL_SCENE_V2: SceneStateV2 = {
  rooms: [
    {
      id: 'room-1',
      name: 'Комната 1',
      x: 80,
      y: 80,
      width: 220,
      height: 160,
    },
  ],
  selectedRoomId: null,
  activeTool: 'select',
};
