import { SceneObject } from './sceneObjects';

export type RoomRotation = 0 | 90 | 180 | 270;

export type RoomV2 = {
  id: string;
  name: string;

  // World coordinates: (0, 0) is scene center; +X right, +Y down.
  centerX: number;
  centerY: number;

  width: number;
  height: number;

  widthMm: number;
  heightMm: number;
  wallHeightMm?: number;

  rotation: RoomRotation;

  isSizeLocked?: boolean;
  showDimensionsPinned?: boolean;
  projectZone?: 'north' | 'south' | 'west' | 'east' | 'center';
};

export type InputModeV2 =
  | { type: 'default' }
  | { type: 'rename-room'; roomId: string };

export type SceneStateV2 = {
  rooms: RoomV2[];
  sceneObjects: SceneObject[];
  selectedRoomId: string | null;
  activeTool: 'select';
};

export type CanvasCameraState = {
  zoom: number;
  panX: number;
  panY: number;
};
