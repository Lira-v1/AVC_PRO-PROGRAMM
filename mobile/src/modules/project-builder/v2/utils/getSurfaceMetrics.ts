import { RoomSurfaceDirection, RoomSurfaceObject } from '../model/surfaces';
import { RoomV2 } from '../model/types';
import { buildSurfaceId } from './buildSurfaceId';

export const getSurfaceTitle = (surface: RoomSurfaceDirection) => {
  switch (surface) {
    case 'north':
      return 'Северная стена';
    case 'east':
      return 'Восточная стена';
    case 'south':
      return 'Южная стена';
    case 'west':
      return 'Западная стена';
    case 'floor':
      return 'Пол';
    case 'ceiling':
      return 'Потолок';
    default:
      return 'Поверхность';
  }
};

export const formatMm = (valueMm: number) => {
  return `${(valueMm / 1000).toFixed(2)} м`;
};

export const getSurfaceWidthMm = (room: RoomV2, surface: RoomSurfaceDirection) => {
  switch (surface) {
    case 'north':
    case 'south':
    case 'floor':
    case 'ceiling':
      return room.widthMm;

    case 'east':
    case 'west':
      return room.heightMm;

    default:
      return room.widthMm;
  }
};

export const getSurfaceHeightMm = (room: RoomV2, surface: RoomSurfaceDirection) => {
  switch (surface) {
    case 'north':
    case 'south':
    case 'east':
    case 'west':
      return room.wallHeightMm ?? 2700;

    case 'floor':
    case 'ceiling':
      return room.heightMm;

    default:
      return room.heightMm;
  }
};

export const buildRoomSurfaceObjects = (room: RoomV2): RoomSurfaceObject[] => {
  const surfaces: RoomSurfaceDirection[] = ['north', 'east', 'south', 'west', 'floor', 'ceiling'];

  return surfaces.map((direction) => ({
    id: buildSurfaceId(room.id, direction),
    roomId: room.id,
    direction,
    widthMm: getSurfaceWidthMm(room, direction),
    heightMm: getSurfaceHeightMm(room, direction),
  }));
};
