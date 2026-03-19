import { RoomModel, RoomWorldGeometry, WorldBounds, WorldEdge, WorldPoint } from './CanvasTypes';

const toRadians = (deg: number) => (deg * Math.PI) / 180;

const rotatePoint = (point: WorldPoint, center: WorldPoint, rotationRad: number): WorldPoint => {
  const translatedX = point.x - center.x;
  const translatedY = point.y - center.y;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);

  return {
    x: center.x + translatedX * cos - translatedY * sin,
    y: center.y + translatedX * sin + translatedY * cos,
  };
};

const createBounds = (points: WorldPoint[]): WorldBounds => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};


const isPointOnSegment = (point: WorldPoint, from: WorldPoint, to: WorldPoint, epsilon = 0.001): boolean => {
  const cross = (point.y - from.y) * (to.x - from.x) - (point.x - from.x) * (to.y - from.y);

  if (Math.abs(cross) > epsilon) {
    return false;
  }

  const dot = (point.x - from.x) * (to.x - from.x) + (point.y - from.y) * (to.y - from.y);

  if (dot < -epsilon) {
    return false;
  }

  const squaredLength = (to.x - from.x) ** 2 + (to.y - from.y) ** 2;

  return dot <= squaredLength + epsilon;
};

const createEdge = (roomId: string, index: number, from: WorldPoint, to: WorldPoint): WorldEdge => ({
  id: `${roomId}-edge-${index}`,
  from,
  to,
});

export class RoomGeometry {
  static containsPoint(room: RoomModel, point: WorldPoint): boolean {
    const geometry = RoomGeometry.fromModel(room);
    const polygon = geometry.corners;
    let isInside = false;

    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index];
      const next = polygon[(index + 1) % polygon.length];

      if (isPointOnSegment(point, current, next)) {
        return true;
      }

      const intersects = current.y > point.y !== next.y > point.y && point.x < ((next.x - current.x) * (point.y - current.y)) / (next.y - current.y) + current.x;

      if (intersects) {
        isInside = !isInside;
      }
    }

    return isInside;
  }

  static fromModel(room: RoomModel): RoomWorldGeometry {
    const center = { x: room.centerX, y: room.centerY };
    const halfWidth = room.widthMm / 2;
    const halfHeight = room.heightMm / 2;
    const rotationRad = toRadians(room.rotationDeg);

    const baseCorners: [WorldPoint, WorldPoint, WorldPoint, WorldPoint] = [
      { x: center.x - halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y + halfHeight },
      { x: center.x - halfWidth, y: center.y + halfHeight },
    ];

    const corners = baseCorners.map((corner) => rotatePoint(corner, center, rotationRad)) as [WorldPoint, WorldPoint, WorldPoint, WorldPoint];
    const edges: [WorldEdge, WorldEdge, WorldEdge, WorldEdge] = [
      createEdge(room.roomId, 0, corners[0], corners[1]),
      createEdge(room.roomId, 1, corners[1], corners[2]),
      createEdge(room.roomId, 2, corners[2], corners[3]),
      createEdge(room.roomId, 3, corners[3], corners[0]),
    ];

    return {
      roomId: room.roomId,
      center,
      corners,
      edges,
      bounds: createBounds(corners),
    };
  }
}
