import { RoomSurfaceDirection, WallSurfaceDirection } from './surfaces';

export type EditorLevel =
  | 'project'
  | 'room'
  | 'wall';

export type EditorState = {
  level: EditorLevel;

  activeRoomId: string | null;

  activeWall: WallSurfaceDirection | null;

  dimensionUnit: 'mm' | 'cm' | 'm';
};

export type RoomSurface = RoomSurfaceDirection;
export type WallSurface = WallSurfaceDirection;
