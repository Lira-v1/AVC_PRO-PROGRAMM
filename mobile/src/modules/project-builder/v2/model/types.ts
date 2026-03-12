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
