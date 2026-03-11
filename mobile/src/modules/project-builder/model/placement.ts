import { clamp, distanceToRoom, isPointInRoom, Point } from '../utils/geometry';
import { createId } from '../utils/ids';
import { getNearestWall, getWallRotation, getRoomWalls } from './walls';
import { ElementNode, ElementType, Room, Wall } from './types';

const WALL_BOUND_TYPES: ElementType[] = [
  'socket',
  'double_socket',
  'switch',
  'double_switch',
  'junction_box',
  'panel',
  'door',
  'window',
];

export const isWallBoundType = (type: ElementType): boolean => WALL_BOUND_TYPES.includes(type);

export const getRoomByPoint = (rooms: Room[], point: Point): Room | null => {
  return rooms.find((room) => isPointInRoom(room, point)) ?? null;
};

const getRoomNearPoint = (rooms: Room[], point: Point, maxDistance = 28): Room | null => {
  const nearest = rooms.reduce<{ room: Room | null; distance: number }>(
    (acc, room) => {
      const distance = distanceToRoom(room, point);
      return distance < acc.distance ? { room, distance } : acc;
    },
    { room: null, distance: Number.POSITIVE_INFINITY },
  );

  if (!nearest.room || nearest.distance > maxDistance) {
    return null;
  }

  return nearest.room;
};

const projectPointToWall = (wall: Wall, point: Point): Point => {
  if (wall.side === 'top' || wall.side === 'bottom') {
    return { x: clamp(point.x, Math.min(wall.x1, wall.x2), Math.max(wall.x1, wall.x2)), y: wall.y1 };
  }

  return { x: wall.x1, y: clamp(point.y, Math.min(wall.y1, wall.y2), Math.max(wall.y1, wall.y2)) };
};

const getWallOffset = (wall: Wall, point: Point): number => {
  if (wall.side === 'top' || wall.side === 'bottom') {
    return Math.round(Math.abs(point.x - wall.x1));
  }

  return Math.round(Math.abs(point.y - wall.y1));
};

export const placeWallBoundElement = (rooms: Room[], point: Point, type: ElementType): ElementNode | null => {
  const room = getRoomByPoint(rooms, point) ?? getRoomNearPoint(rooms, point);
  if (!room) {
    return null;
  }

  const wall = getNearestWall(room, point);
  const wallPoint = projectPointToWall(wall, point);

  return {
    id: createId('el'),
    type,
    roomId: room.id,
    wallId: wall.id,
    wallCardinal: wall.cardinal,
    x: wallPoint.x,
    y: wallPoint.y,
    rotation: getWallRotation(wall.side),
    offsetMm: getWallOffset(wall, wallPoint),
  };
};

export const placeInteriorElement = (rooms: Room[], point: Point, type: ElementType): ElementNode | null => {
  const room = getRoomByPoint(rooms, point);
  if (!room) {
    return null;
  }

  return {
    id: createId('el'),
    type,
    roomId: room.id,
    wallId: null,
    wallCardinal: undefined,
    x: point.x,
    y: point.y,
    rotation: 0,
  };
};

export const recalculateElementBinding = (rooms: Room[], element: ElementNode, point: Point): ElementNode | null => {
  const type = element.type;
  if (type === 'light_point') {
    const room = getRoomByPoint(rooms, point);
    if (!room) return null;
    return { ...element, roomId: room.id, wallId: null, wallCardinal: undefined, x: point.x, y: point.y, rotation: 0, offsetMm: undefined };
  }

  const room = getRoomByPoint(rooms, point) ?? getRoomNearPoint(rooms, point);
  if (!room) return null;

  const wall = getNearestWall(room, point);
  const wallPoint = projectPointToWall(wall, point);

  return {
    ...element,
    roomId: room.id,
    wallId: wall.id,
    wallCardinal: wall.cardinal,
    x: wallPoint.x,
    y: wallPoint.y,
    rotation: getWallRotation(wall.side),
    offsetMm: getWallOffset(wall, wallPoint),
  };
};

export const getWallsMap = (rooms: Room[]): Record<string, Wall> => {
  return rooms.reduce<Record<string, Wall>>((acc, room) => {
    getRoomWalls(room).forEach((wall) => {
      acc[wall.id] = wall;
    });
    return acc;
  }, {});
};
