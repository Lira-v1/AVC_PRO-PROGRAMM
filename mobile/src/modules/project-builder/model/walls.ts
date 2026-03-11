import { CardinalDirection, Room, Wall, WallSide } from './types';

const SIDE_TO_CARDINAL: Record<WallSide, CardinalDirection> = {
  top: 'north',
  right: 'east',
  bottom: 'south',
  left: 'west',
};

export const mapWallSideToCardinal = (side: WallSide): CardinalDirection => SIDE_TO_CARDINAL[side];

export const getWallLength = (wall: Pick<Wall, 'x1' | 'y1' | 'x2' | 'y2'>): number => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const getRoomWalls = (room: Room): Wall[] => {
  const { x, y, width, height, id } = room;
  return [
    { id: `${id}-top`, roomId: id, side: 'top', cardinal: 'north', x1: x, y1: y, x2: x + width, y2: y, length: width },
    {
      id: `${id}-right`,
      roomId: id,
      side: 'right',
      cardinal: 'east',
      x1: x + width,
      y1: y,
      x2: x + width,
      y2: y + height,
      length: height,
    },
    {
      id: `${id}-bottom`,
      roomId: id,
      side: 'bottom',
      cardinal: 'south',
      x1: x,
      y1: y + height,
      x2: x + width,
      y2: y + height,
      length: width,
    },
    { id: `${id}-left`, roomId: id, side: 'left', cardinal: 'west', x1: x, y1: y, x2: x, y2: y + height, length: height },
  ];
};

export const getWallByCardinal = (room: Room, cardinal: CardinalDirection): Wall | null => {
  return getRoomWalls(room).find((wall) => wall.cardinal === cardinal) ?? null;
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
