import { SceneStateV2 } from './types';

export const INITIAL_SCENE_V2: SceneStateV2 = {
  rooms: [
    {
      id: 'room-1',
      name: 'Комната 1',
      // Room coordinates are in world space where (0, 0) is the center of the scene.
      centerX: 0,
      centerY: 0,
      width: 100,
      height: 100,
      widthMm: 1000,
      heightMm: 1000,
      wallHeightMm: 2700,
      rotation: 0,
      isSizeLocked: false,
      showDimensionsPinned: false,
    },
  ],
  sceneObjects: [],
  selectedRoomId: null,
  activeTool: 'select',
};
