import { Room } from './types';

export type CeilingPlane = {
  roomId: string;
  width: number;
  height: number;
};

export const createCeilingPlane = (room: Room): CeilingPlane => ({
  roomId: room.id,
  width: room.width,
  height: room.height,
});
