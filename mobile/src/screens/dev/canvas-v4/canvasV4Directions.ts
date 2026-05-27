import { normalizeAngle } from './canvasV4Geometry';
import type { Point } from './canvasV4Geometry';

export type SurfaceDirection = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';

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

export const getSurfaceDirectionFromRoomVector = (vector: Point, compassRotationDeg = 0): SurfaceDirection => {
  if (Math.abs(vector.x) < 0.000001 && Math.abs(vector.y) < 0.000001) {
    return 'north';
  }

  const screenAngle = normalizeAngle((Math.atan2(vector.y, vector.x) * 180) / Math.PI - compassRotationDeg);
  const directionsByAngle: SurfaceDirection[] = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
  const directionIndex = Math.round(screenAngle / 45) % directionsByAngle.length;

  return directionsByAngle[directionIndex];
};
