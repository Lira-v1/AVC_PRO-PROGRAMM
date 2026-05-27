import { angularDistance, normalizeAngle } from './canvasV4Geometry';
import type { Point } from './canvasV4Geometry';

export type SurfaceDirection = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
export type LogicalWallOrientation = 'horizontal' | 'vertical' | 'diagonal';

const DIRECTION_VECTOR_EPSILON = 0.000001;
const LOGICAL_WALL_AXIS_ALIGNMENT_TOLERANCE_DEG = 15;

export const SURFACE_DIRECTION_LABELS: Record<SurfaceDirection, string> = {
  north: 'Северная стена',
  south: 'Южная стена',
  east: 'Восточная стена',
  west: 'Западная стена',
  northeast: 'Северо-восточная стена',
  northwest: 'Северо-западная стена',
  southeast: 'Юго-восточная стена',
  southwest: 'Юго-западная стена',
};

const getAdjustedVector = (vector: Point, compassRotationDeg: number) => {
  if (Math.abs(compassRotationDeg) <= DIRECTION_VECTOR_EPSILON) {
    return vector;
  }

  const radians = (-compassRotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
};

const getDirectionFromAngle = (angle: number): SurfaceDirection => {
  const directionsByAngle: SurfaceDirection[] = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
  const directionIndex = Math.round(normalizeAngle(angle) / 45) % directionsByAngle.length;

  return directionsByAngle[directionIndex];
};

const getCardinalDirectionFromVector = (vector: Point, compassRotationDeg = 0): SurfaceDirection => {
  const adjustedVector = getAdjustedVector(vector, compassRotationDeg);

  if (Math.abs(adjustedVector.x) >= Math.abs(adjustedVector.y)) {
    return adjustedVector.x >= 0 ? 'east' : 'west';
  }

  return adjustedVector.y >= 0 ? 'south' : 'north';
};

const getAxisDirectionFromRoomVector = (
  vector: Point,
  wallOrientation: Extract<LogicalWallOrientation, 'horizontal' | 'vertical'>,
  compassRotationDeg = 0,
): SurfaceDirection => {
  const adjustedVector = getAdjustedVector(vector, compassRotationDeg);

  if (wallOrientation === 'horizontal' && Math.abs(adjustedVector.y) > DIRECTION_VECTOR_EPSILON) {
    return adjustedVector.y >= 0 ? 'south' : 'north';
  }

  if (wallOrientation === 'vertical' && Math.abs(adjustedVector.x) > DIRECTION_VECTOR_EPSILON) {
    return adjustedVector.x >= 0 ? 'east' : 'west';
  }

  return getCardinalDirectionFromVector(vector, compassRotationDeg);
};

export const getLogicalWallOrientation = (wallVector: Point, compassRotationDeg = 0): LogicalWallOrientation => {
  if (Math.abs(wallVector.x) < DIRECTION_VECTOR_EPSILON && Math.abs(wallVector.y) < DIRECTION_VECTOR_EPSILON) {
    return 'horizontal';
  }

  const wallAngle = normalizeAngle((Math.atan2(wallVector.y, wallVector.x) * 180) / Math.PI - compassRotationDeg);
  const horizontalDistance = Math.min(angularDistance(wallAngle, 0), angularDistance(wallAngle, 180));
  const verticalDistance = Math.min(angularDistance(wallAngle, 90), angularDistance(wallAngle, 270));

  if (horizontalDistance <= LOGICAL_WALL_AXIS_ALIGNMENT_TOLERANCE_DEG) {
    return 'horizontal';
  }

  if (verticalDistance <= LOGICAL_WALL_AXIS_ALIGNMENT_TOLERANCE_DEG) {
    return 'vertical';
  }

  return 'diagonal';
};

export const getSurfaceDirectionFromRoomVector = (vector: Point, compassRotationDeg = 0): SurfaceDirection => {
  if (Math.abs(vector.x) < DIRECTION_VECTOR_EPSILON && Math.abs(vector.y) < DIRECTION_VECTOR_EPSILON) {
    return 'north';
  }

  const screenAngle = normalizeAngle((Math.atan2(vector.y, vector.x) * 180) / Math.PI - compassRotationDeg);

  return getDirectionFromAngle(screenAngle);
};

export const getSurfaceDirectionFromLogicalWall = (
  startPoint: Point,
  endPoint: Point,
  roomCenter: Point,
  compassRotationDeg = 0,
): SurfaceDirection => {
  const wallVector = {
    x: endPoint.x - startPoint.x,
    y: endPoint.y - startPoint.y,
  };
  const roomSideVector = {
    x: (startPoint.x + endPoint.x) / 2 - roomCenter.x,
    y: (startPoint.y + endPoint.y) / 2 - roomCenter.y,
  };
  const orientation = getLogicalWallOrientation(wallVector, compassRotationDeg);

  if (orientation === 'horizontal' || orientation === 'vertical') {
    return getAxisDirectionFromRoomVector(roomSideVector, orientation, compassRotationDeg);
  }

  return getSurfaceDirectionFromRoomVector(roomSideVector, compassRotationDeg);
};
