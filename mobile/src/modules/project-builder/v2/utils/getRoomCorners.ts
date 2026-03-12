export type Point = {
  x: number;
  y: number;
};

export type RoomCorners = {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
};

const rotatePoint = (
  pointX: number,
  pointY: number,
  centerX: number,
  centerY: number,
  angleDeg: number,
): Point => {
  const angle = (angleDeg * Math.PI) / 180;

  const dx = pointX - centerX;
  const dy = pointY - centerY;

  const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

  return {
    x: centerX + rotatedX,
    y: centerY + rotatedY,
  };
};

export const getRoomCorners = (room: {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotation?: 0 | 90 | 180 | 270;
}): RoomCorners => {
  const rotation = room.rotation ?? 0;

  const halfWidth = room.width / 2;
  const halfHeight = room.height / 2;

  const rawTopLeft = {
    x: room.centerX - halfWidth,
    y: room.centerY - halfHeight,
  };

  const rawTopRight = {
    x: room.centerX + halfWidth,
    y: room.centerY - halfHeight,
  };

  const rawBottomRight = {
    x: room.centerX + halfWidth,
    y: room.centerY + halfHeight,
  };

  const rawBottomLeft = {
    x: room.centerX - halfWidth,
    y: room.centerY + halfHeight,
  };

  return {
    topLeft: rotatePoint(rawTopLeft.x, rawTopLeft.y, room.centerX, room.centerY, rotation),
    topRight: rotatePoint(rawTopRight.x, rawTopRight.y, room.centerX, room.centerY, rotation),
    bottomRight: rotatePoint(rawBottomRight.x, rawBottomRight.y, room.centerX, room.centerY, rotation),
    bottomLeft: rotatePoint(rawBottomLeft.x, rawBottomLeft.y, room.centerX, room.centerY, rotation),
  };
};
