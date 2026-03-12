export type RoomRotation = 0 | 90 | 180 | 270;

export type RoomV2 = {
  id: string;
  name: string;

  centerX: number;
  centerY: number;

  width: number;
  height: number;

  widthMm: number;
  heightMm: number;

  rotation: RoomRotation;

  isSizeLocked?: boolean;
  projectZone?: 'north' | 'south' | 'west' | 'east' | 'center';
};

export type InputModeV2 =
  | { type: 'default' }
  | { type: 'rename-room'; roomId: string };

export type SceneStateV2 = {
  rooms: RoomV2[];
  selectedRoomId: string | null;
  activeTool: 'select';
};

export type CanvasViewportStateV2 = {
  scale: number;
  offsetX: number;
  offsetY: number;
};
