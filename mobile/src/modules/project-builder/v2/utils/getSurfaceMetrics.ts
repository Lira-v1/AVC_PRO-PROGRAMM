import { RoomSurface } from '../model/editorTypes';
import { RoomV2 } from '../model/types';

export const getSurfaceTitle = (surface: RoomSurface) => {
  switch (surface) {
    case 'north-wall':
      return 'Северная стена';
    case 'east-wall':
      return 'Восточная стена';
    case 'south-wall':
      return 'Южная стена';
    case 'west-wall':
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

export const getSurfaceWidthMm = (room: RoomV2, surface: RoomSurface) => {
  switch (surface) {
    case 'north-wall':
    case 'south-wall':
    case 'floor':
    case 'ceiling':
      return room.widthMm;

    case 'east-wall':
    case 'west-wall':
      return room.heightMm;

    default:
      return room.widthMm;
  }
};

export const getSurfaceHeightMm = (room: RoomV2, surface: RoomSurface) => {
  switch (surface) {
    case 'north-wall':
    case 'south-wall':
    case 'east-wall':
    case 'west-wall':
      return room.wallHeightMm ?? 2700;

    case 'floor':
    case 'ceiling':
      return room.heightMm;

    default:
      return room.heightMm;
  }
};
