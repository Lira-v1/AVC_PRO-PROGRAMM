export type RoomV2 = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  widthCm?: number;
  heightCm?: number;
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
