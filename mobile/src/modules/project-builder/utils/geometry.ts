import { Room } from '../model/types';

export type Point = { x: number; y: number };

export const isPointInRoom = (room: Room, point: Point): boolean => {
  return point.x >= room.x && point.x <= room.x + room.width && point.y >= room.y && point.y <= room.y + room.height;
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const distanceToRoom = (room: Room, point: Point): number => {
  const dx = Math.max(room.x - point.x, 0, point.x - (room.x + room.width));
  const dy = Math.max(room.y - point.y, 0, point.y - (room.y + room.height));
  return Math.hypot(dx, dy);
};
