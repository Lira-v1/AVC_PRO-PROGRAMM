import { DimensionLineWorldGeometry, DimensionUnit, RoomModel, RoomWorldGeometry, WorldPoint } from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';

const DIMENSION_OFFSET_MM = 320;
const TICK_HALF_SIZE_MM = 90;
const formatDimensionValue = (valueMm: number, unit: DimensionUnit): string => {
  if (unit === 'mm') {
    return `${Math.round(valueMm)} мм`;
  }

  if (unit === 'cm') {
    return `${(valueMm / 10).toFixed(1)} см`;
  }

  return `${(valueMm / 1000).toFixed(2)} м`;
};

const createTick = (center: WorldPoint, axis: 'horizontal' | 'vertical') => {
  if (axis === 'horizontal') {
    return {
      from: { x: center.x, y: center.y - TICK_HALF_SIZE_MM },
      to: { x: center.x, y: center.y + TICK_HALF_SIZE_MM },
    };
  }

  return {
    from: { x: center.x - TICK_HALF_SIZE_MM, y: center.y },
    to: { x: center.x + TICK_HALF_SIZE_MM, y: center.y },
  };
};

export class DimensionLabelSystem {
  static getLabelsForRoom(room: RoomModel | null, roomGeometry?: RoomWorldGeometry | null): DimensionLineWorldGeometry[] {
    if (!room) {
      return [];
    }

    const geometry = roomGeometry ?? RoomGeometry.fromModel(room);
    const unit = room.settings?.dimensionUnit ?? 'm';
    const { minX, maxX, minY, maxY, width, height } = geometry.bounds;
    const topY = minY - DIMENSION_OFFSET_MM;
    const leftX = minX - DIMENSION_OFFSET_MM;
    const topLineFrom = { x: minX, y: topY };
    const topLineTo = { x: maxX, y: topY };
    const leftLineFrom = { x: leftX, y: minY };
    const leftLineTo = { x: leftX, y: maxY };

    return [
      {
        id: `${room.roomId}-dimension-length`,
        roomId: room.roomId,
        kind: 'length',
        axis: 'horizontal',
        valueMm: width,
        formattedValue: formatDimensionValue(width, unit),
        lineFrom: topLineFrom,
        lineTo: topLineTo,
        textAnchor: { x: (minX + maxX) / 2, y: topY },
        ticks: [createTick(topLineFrom, 'horizontal'), createTick(topLineTo, 'horizontal')],
      },
      {
        id: `${room.roomId}-dimension-width`,
        roomId: room.roomId,
        kind: 'width',
        axis: 'vertical',
        valueMm: height,
        formattedValue: formatDimensionValue(height, unit),
        lineFrom: leftLineFrom,
        lineTo: leftLineTo,
        textAnchor: { x: leftX, y: (minY + maxY) / 2 },
        ticks: [createTick(leftLineFrom, 'vertical'), createTick(leftLineTo, 'vertical')],
      },
    ];
  }
}
