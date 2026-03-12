import { SceneStateV2 } from './types';

export const INITIAL_SCENE_V2: SceneStateV2 = {
  rooms: [
    {
      id: 'room-1',
      name: 'Комната 1',
      centerX: 0,
      centerY: 0,
      width: 100,
      height: 100,
      widthMm: 1000,
      heightMm: 1000,
      wallHeightMm: 2700,
      rotation: 0,
      isSizeLocked: false,
    },
  ],
  sceneObjects: [],
  selectedRoomId: null,
  activeTool: 'select',
};
