export type RoomV2 = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

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

export type CompassOrientation = 'default' | 'flipped';
