import { DimensionLabelWorldGeometry, RoomModel, RoomWorldGeometry, WorldPoint } from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';

const LABEL_OFFSET_MM = 320;
const MILLIMETERS_IN_METER = 1000;

const normalizeVector = (vector: WorldPoint): WorldPoint => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.0001) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
};

const formatDimensionValue = (valueMm: number): string => {
  if (valueMm < MILLIMETERS_IN_METER) {
    return `${Math.round(valueMm)} мм`;
  }

  return `${(valueMm / MILLIMETERS_IN_METER).toFixed(1)} м`;
};

export class DimensionLabelSystem {
  static getLabelsForRoom(room: RoomModel | null, roomGeometry?: RoomWorldGeometry | null): DimensionLabelWorldGeometry[] {
    if (!room) {
      return [];
    }

    const geometry = roomGeometry ?? RoomGeometry.fromModel(room);
    const topEdge = geometry.edges[0];
    const rightEdge = geometry.edges[1];
    const topAnchor = {
      x: (topEdge.from.x + topEdge.to.x) / 2,
      y: (topEdge.from.y + topEdge.to.y) / 2,
    };
    const sideAnchor = {
      x: (rightEdge.from.x + rightEdge.to.x) / 2,
      y: (rightEdge.from.y + rightEdge.to.y) / 2,
    };

    return [
      {
        id: `${room.roomId}-dimension-length`,
        roomId: room.roomId,
        kind: 'length',
        title: 'длина',
        valueMm: room.widthMm,
        formattedValue: formatDimensionValue(room.widthMm),
        anchor: topAnchor,
        normal: normalizeVector({ x: topAnchor.x - geometry.center.x, y: topAnchor.y - geometry.center.y }),
        offsetMm: LABEL_OFFSET_MM,
      },
      {
        id: `${room.roomId}-dimension-width`,
        roomId: room.roomId,
        kind: 'width',
        title: 'ширина',
        valueMm: room.heightMm,
        formattedValue: formatDimensionValue(room.heightMm),
        anchor: sideAnchor,
        normal: normalizeVector({ x: sideAnchor.x - geometry.center.x, y: sideAnchor.y - geometry.center.y }),
        offsetMm: LABEL_OFFSET_MM,
      },
    ];
  }
}
