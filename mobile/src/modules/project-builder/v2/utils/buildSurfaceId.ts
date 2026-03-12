import { RoomSurfaceDirection } from '../model/surfaces';

export const buildSurfaceId = (
  roomId: string,
  direction: RoomSurfaceDirection,
) => {
  return `${roomId}:${direction}`;
};
