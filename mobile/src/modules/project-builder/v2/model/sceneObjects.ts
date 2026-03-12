import { RoomSurfaceDirection } from './surfaces';

export type SceneObjectType =
  | 'door'
  | 'window'
  | 'socket'
  | 'switch'
  | 'light';

export type SceneObject = {
  id: string;

  type: SceneObjectType;

  roomId: string;

  surfaceId: string;

  direction: RoomSurfaceDirection;

  offsetMm: number;

  widthMm: number;
  heightMm?: number;
};
