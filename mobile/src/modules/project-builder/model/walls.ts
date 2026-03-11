import { Room, Wall, WallSide } from './types';

export const getRoomWalls = (room: Room): Wall[] => {
  const { x, y, width, height, id } = room;
  return [
    { id: `${id}-top`, roomId: id, side: 'top', x1: x, y1: y, x2: x + width, y2: y },
    { id: `${id}-right`, roomId: id, side: 'right', x1: x + width, y1: y, x2: x + width, y2: y + height },
    { id: `${id}-bottom`, roomId: id, side: 'bottom', x1: x, y1: y + height, x2: x + width, y2: y + height },
    { id: `${id}-left`, roomId: id, side: 'left', x1: x, y1: y, x2: x, y2: y + height },
  ];
};

export const getNearestWall = (room: Room, point: { x: number; y: number }): Wall => {
  const distances: Record<WallSide, number> = {
    top: Math.abs(point.y - room.y),
    right: Math.abs(point.x - (room.x + room.width)),
    bottom: Math.abs(point.y - (room.y + room.height)),
    left: Math.abs(point.x - room.x),
  };

  const nearestSide = (Object.keys(distances) as WallSide[]).reduce((closest, side) =>
    distances[side] < distances[closest] ? side : closest,
  'top');

  return getRoomWalls(room).find((wall) => wall.side === nearestSide) as Wall;
};

export const getWallRotation = (side: WallSide): number => {
  if (side === 'left') return -90;
  if (side === 'right') return 90;
  if (side === 'bottom') return 180;
  return 0;
};
