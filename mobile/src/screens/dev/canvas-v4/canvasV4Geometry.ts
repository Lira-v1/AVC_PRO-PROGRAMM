export type Point = {
  x: number;
  y: number;
};

export type LineSegmentLike = {
  startPoint: Point;
  endPoint: Point;
  length: number;
};

export type BoundingBoxLike = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export const normalizeAngle = (angle: number) => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const formatAngle = (angle: number) => {
  const normalized = normalizeAngle(angle);
  return normalized > 180 ? normalized - 360 : normalized;
};

export const getLineMetrics = (startPoint: Point, endPoint: Point) => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;

  return {
    length: Math.hypot(dx, dy),
    angle: normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI),
  };
};

export const angularDistance = (angleA: number, angleB: number) => {
  const diff = Math.abs(normalizeAngle(angleA) - normalizeAngle(angleB));
  return Math.min(diff, 360 - diff);
};

export const clampToRange = (value: number, min: number, max: number) => {
  if (max <= min) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
};

export const addPoints = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

export const scaleVector = (vector: Point, scale: number): Point => ({ x: vector.x * scale, y: vector.y * scale });

export const normalizeVector = (vector: Point): Point => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.000001) {
    return { x: 0, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

export const getSegmentUnitAndLeftNormal = (startPoint: Point, endPoint: Point) => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const unit = { x: dx / length, y: dy / length };

  return { unit, leftNormal: { x: -unit.y, y: unit.x } };
};

export const getNormalizedRect = (startPoint: Point, endPoint: Point) => ({
  minX: Math.min(startPoint.x, endPoint.x),
  maxX: Math.max(startPoint.x, endPoint.x),
  minY: Math.min(startPoint.y, endPoint.y),
  maxY: Math.max(startPoint.y, endPoint.y),
});

export const isPointInsideRect = (point: Point, rect: ReturnType<typeof getNormalizedRect>) =>
  point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY;

const getOrientation = (a: Point, b: Point, c: Point) => {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

  if (Math.abs(value) < 0.000001) {
    return 0;
  }

  return value > 0 ? 1 : 2;
};

const isPointOnSegment = (a: Point, b: Point, c: Point) =>
  b.x <= Math.max(a.x, c.x) + 0.000001 &&
  b.x + 0.000001 >= Math.min(a.x, c.x) &&
  b.y <= Math.max(a.y, c.y) + 0.000001 &&
  b.y + 0.000001 >= Math.min(a.y, c.y);

export const doSegmentsIntersect = (a: Point, b: Point, c: Point, d: Point) => {
  const o1 = getOrientation(a, b, c);
  const o2 = getOrientation(a, b, d);
  const o3 = getOrientation(c, d, a);
  const o4 = getOrientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  return (
    (o1 === 0 && isPointOnSegment(a, c, b)) ||
    (o2 === 0 && isPointOnSegment(a, d, b)) ||
    (o3 === 0 && isPointOnSegment(c, a, d)) ||
    (o4 === 0 && isPointOnSegment(c, b, d))
  );
};

export const getDistanceToSegment = (point: Point, startPoint: Point, endPoint: Point) => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const segmentLengthSq = dx * dx + dy * dy;

  if (segmentLengthSq === 0) {
    return Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - startPoint.x) * dx + (point.y - startPoint.y) * dy) / segmentLengthSq));
  const projection = {
    x: startPoint.x + t * dx,
    y: startPoint.y + t * dy,
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
};

export const projectPointToSegment = (point: Point, segment: LineSegmentLike) => {
  const dx = segment.endPoint.x - segment.startPoint.x;
  const dy = segment.endPoint.y - segment.startPoint.y;
  const segmentLengthSq = dx * dx + dy * dy;

  if (segmentLengthSq === 0) {
    return {
      point: segment.startPoint,
      distance: Math.hypot(point.x - segment.startPoint.x, point.y - segment.startPoint.y),
      positionOnSegment: 0,
    };
  }

  const t = Math.max(0, Math.min(1, ((point.x - segment.startPoint.x) * dx + (point.y - segment.startPoint.y) * dy) / segmentLengthSq));
  const projection = {
    x: segment.startPoint.x + t * dx,
    y: segment.startPoint.y + t * dy,
  };

  return {
    point: projection,
    distance: Math.hypot(point.x - projection.x, point.y - projection.y),
    positionOnSegment: t * segment.length,
  };
};

export const getPointOnSegmentAtDistance = (segment: LineSegmentLike, distance: number): Point => {
  const length = Math.max(segment.length, 1);
  const t = Math.max(0, Math.min(1, distance / length));

  return {
    x: segment.startPoint.x + (segment.endPoint.x - segment.startPoint.x) * t,
    y: segment.startPoint.y + (segment.endPoint.y - segment.startPoint.y) * t,
  };
};

export const getPolygonSignedArea = (points: Point[]) => {
  if (points.length < 3) {
    return 0;
  }

  return points.reduce((twiceArea, current, index) => {
    const next = points[(index + 1) % points.length];
    return twiceArea + current.x * next.y - next.x * current.y;
  }, 0) / 2;
};

export const getPolygonCentroid = (points: Point[]): Point | null => {
  if (points.length < 3) {
    return null;
  }

  let twiceArea = 0;
  let cx = 0;
  let cy = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }

  if (Math.abs(twiceArea) <= 0.000001) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }

  return {
    x: cx / (3 * twiceArea),
    y: cy / (3 * twiceArea),
  };
};

export const getPolygonPerimeter = (points: Point[]) => {
  if (points.length < 2) {
    return 0;
  }

  return points.reduce((perimeter, point, index) => {
    const next = points[(index + 1) % points.length];
    return perimeter + Math.hypot(next.x - point.x, next.y - point.y);
  }, 0);
};

export const clonePoint = (point: Point): Point => ({ ...point });

export const cloneBoundingBox = <T extends BoundingBoxLike>(box: T): T => ({ ...box });
