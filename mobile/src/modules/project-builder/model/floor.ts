import { Room } from './types';

export type FloorPlane = {
  roomId: string;
  width: number;
  height: number;
};

export const createFloorPlane = (room: Room): FloorPlane => ({
  roomId: room.id,
  width: room.width,
  height: room.height,
});
