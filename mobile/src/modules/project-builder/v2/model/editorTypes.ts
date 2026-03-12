export type EditorLevel =
  | 'project'
  | 'room'
  | 'wall';


export type RoomSurface =
  | 'north'
  | 'east'
  | 'south'
  | 'west'
  | 'floor'
  | 'ceiling';


export type WallSurface = Extract<RoomSurface, 'north' | 'east' | 'south' | 'west'>;


export type RoomSurfaceObject = {
  id: string;
  roomId: string;
  surface: RoomSurface;
  widthMm: number;
  heightMm: number;
};


export type EditorState = {
  level: EditorLevel;

  activeRoomId: string | null;

  activeWall: WallSurface | null;
};
