export type RoomSurfaceDirection =
  | 'north'
  | 'east'
  | 'south'
  | 'west'
  | 'floor'
  | 'ceiling';

export type WallSurfaceDirection = Extract<RoomSurfaceDirection, 'north' | 'east' | 'south' | 'west'>;

export type RoomSurfaceObject = {
  id: string;
  roomId: string;
  direction: RoomSurfaceDirection;
  widthMm: number;
  heightMm: number;
};

