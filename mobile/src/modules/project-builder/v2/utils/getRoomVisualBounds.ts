import { getRoomCorners } from './getRoomCorners';

export const getRoomVisualBounds = (room: {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotation?: 0 | 90 | 180 | 270;
}) => {
  const corners = getRoomCorners(room);

  const xs = [
    corners.topLeft.x,
    corners.topRight.x,
    corners.bottomRight.x,
    corners.bottomLeft.x,
  ];

  const ys = [
    corners.topLeft.y,
    corners.topRight.y,
    corners.bottomRight.y,
    corners.bottomLeft.y,
  ];

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};
