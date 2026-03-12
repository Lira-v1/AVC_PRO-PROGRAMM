import { SceneStateV2 } from './types';

export const INITIAL_SCENE_V2: SceneStateV2 = {
  rooms: [
    {
      id: 'room-1',
      name: 'Комната 1',
      // Room coordinates are in scene space (0..10000), so the scene center is 5000/5000.
      centerX: 5000,
      centerY: 5000,
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
