import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../../components/AppHeader';

type Point = {
  x: number;
  y: number;
};

type ToolMode = 'idle' | 'line' | 'polyline' | 'select' | 'door';
type WallSegmentType = 'external' | 'internal';
type WallAlignmentMode = 'inside' | 'center';
type CornerJoinMode = 'bevel';

type CanvasV4WallSegment = {
  entityId: string;
  segmentId: string;
  lineId: string;
  entityType: 'wall-segment';
  polylineId?: string;
  startPoint: Point;
  endPoint: Point;
  length: number;
  angle: number;
  wallThickness: number;
  wallAlignmentMode: WallAlignmentMode;
  cornerJoinMode: CornerJoinMode;
  segmentType: WallSegmentType;
  connectedSegmentIds: string[];
  doorIds: string[];
  windowIds: string[];
};

type CanvasV4LineEntity = CanvasV4WallSegment;

type DoorSwingDirection = 'right';

type CanvasV4Door = {
  doorId: string;
  segmentId: string;
  positionOnSegment: number;
  width: number;
  swingDirection: DoorSwingDirection;
  createdAt: number;
};

type HistoryAction =
  | { type: 'CREATE_WALL_SEGMENT'; entity: CanvasV4LineEntity; index: number }
  | { type: 'CREATE_POLYLINE_WALL_SEGMENT'; entity: CanvasV4LineEntity; index: number }
  | { type: 'DELETE_WALL_SEGMENT'; entity: CanvasV4LineEntity; index: number; doors: Array<{ door: CanvasV4Door; index: number }> }
  | { type: 'DELETE_SELECTED_WALL_SEGMENTS'; entities: Array<{ entity: CanvasV4LineEntity; index: number }>; doors: Array<{ door: CanvasV4Door; index: number }> }
  | { type: 'MOVE_SELECTED_WALL_SEGMENTS'; beforeEntities: CanvasV4LineEntity[]; afterEntities: CanvasV4LineEntity[]; beforeDoors: CanvasV4Door[]; afterDoors: CanvasV4Door[]; delta: Point }
  | { type: 'RESIZE_WALL_SEGMENT'; beforeEntities: CanvasV4LineEntity[]; afterEntities: CanvasV4LineEntity[]; beforeDoors: CanvasV4Door[]; afterDoors: CanvasV4Door[]; handleId: string }
  | { type: 'RESIZE_WALL_SELECTION'; beforeEntities: CanvasV4LineEntity[]; afterEntities: CanvasV4LineEntity[]; beforeDoors: CanvasV4Door[]; afterDoors: CanvasV4Door[]; handleId: string; scaleX: number; scaleY: number }
  | { type: 'CREATE_DOOR'; door: CanvasV4Door; doorIndex: number; beforeEntity: CanvasV4LineEntity; afterEntity: CanvasV4LineEntity }
  | { type: 'MOVE_DOOR'; beforeDoor: CanvasV4Door; afterDoor: CanvasV4Door }
  | { type: 'DELETE_DOOR'; door: CanvasV4Door; doorIndex: number; beforeEntity: CanvasV4LineEntity; afterEntity: CanvasV4LineEntity };

type SnapType = 'none' | 'endpoint' | 'grid' | 'angle';

type SnapResult = {
  point: Point;
  activeSnapType: SnapType;
  activeSnapTargetId: string | null;
  activeSnapDistance: number | null;
  gridSnappedEndPoint: Point | null;
  angleHelperActive: boolean;
};

type EndpointSnapTarget = {
  targetId: string;
  point: Point;
  distance: number;
};

type InteractionMode = 'idle' | 'pan' | 'selection-box' | 'move-selection' | 'resize-line' | 'resize-selection' | 'move-door';
type HitTestTargetType = 'resize-handle' | 'selected-geometry' | 'wall-geometry' | 'door-geometry' | 'empty-canvas';
type SelectionMode = 'single' | 'box' | 'move';
type LastInteractionType =
  | 'init'
  | 'tap-select'
  | 'tap-empty'
  | 'double-tap-clear'
  | 'pan-canvas'
  | 'selection-box'
  | 'move-selection'
  | 'move-door'
  | 'resize-line'
  | 'resize-selection'
  | 'draw-line'
  | 'draw-polyline'
  | 'tool-change'
  | 'zoom'
  | 'reset-view';
type TransformMode = 'idle' | 'resize-line' | 'resize-selection';
type ResizeAxis = 'none' | 'x' | 'y' | 'xy';
type TransformHandleId =
  | 'single-start'
  | 'single-end'
  | 'bbox-nw'
  | 'bbox-n'
  | 'bbox-ne'
  | 'bbox-e'
  | 'bbox-se'
  | 'bbox-s'
  | 'bbox-sw'
  | 'bbox-w';

type BoundingBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type DragSession = {
  started: boolean;
  moved: boolean;
  pointerId: number | null;
  interactionMode: InteractionMode;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moveEntityIds: string[];
  moveOriginalEntities: CanvasV4LineEntity[];
  moveDoorId: string | null;
  moveOriginalDoor: CanvasV4Door | null;
  resizeHandleId: TransformHandleId | null;
  resizeAxis: ResizeAxis;
  resizeOriginalEntities: CanvasV4LineEntity[];
  resizeOriginalBoundingBox: BoundingBox | null;
  resizeAnchorPoint: Point | null;
  resizeActivePoint: Point | null;
  startTime: number;
  canStartSelectionBox: boolean;
  isPanningCanvas: boolean;
};

type SelectionBoxState = {
  active: boolean;
  startPoint: Point;
  currentPoint: Point;
};

const GRID_STEP_MM = 100;
const DEFAULT_ZOOM = 0.08;
const MIN_ZOOM = 0.025;
const MAX_ZOOM = 0.6;
const ZOOM_OUT_FACTOR = 0.8;
const ZOOM_IN_FACTOR = 1.25;
const DRAG_THRESHOLD_PX = 3;
const SELECTION_BOX_HOLD_DELAY_MS = 180;
const DOUBLE_TAP_DELAY_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 18;
const HIT_TOLERANCE_PX = 12;
const ENDPOINT_SNAP_THRESHOLD_PX = 14;
const TRANSFORM_HANDLE_SIZE_PX = 14;
const TRANSFORM_HANDLE_HIT_RADIUS_PX = 14;
const SNAP_ANGLE_STEP_DEG = 45;
const ANGLE_HELPER_TOLERANCE_DEG = 6;
const SNAP_PRIORITY_LABEL = 'endpoint > grid > angle';
const LINE_DIMENSION_LABEL_OFFSET_PX = 22;
const LINE_DIMENSION_LABEL_WIDTH_PX = 68;
const LINE_DIMENSION_LABEL_HEIGHT_PX = 24;
const POINT_MATCH_EPSILON = 0.001;
const DEFAULT_WALL_THICKNESS_MM = 100;
const WALL_THICKNESS_VISUAL = false;
const WALL_THICKNESS_FROZEN = true;
const DEFAULT_CORNER_JOIN_MODE: CornerJoinMode = 'bevel';
const DEFAULT_DOOR_WIDTH_MM = 800;
const DOOR_HIT_TOLERANCE_PX = 16;
const DOOR_LEAF_DEPTH_MM = 650;

type LineScreenGeometry = {
  length: number;
  centerX: number;
  centerY: number;
  angleDeg: number;
  screenStart: Point;
  screenEnd: Point;
};

type WallRenderGeometry = LineScreenGeometry & {
  alignmentMode: WallAlignmentMode;
  cornerJoinMode: CornerJoinMode;
  wallThicknessPx: number;
  renderCenterX: number;
  renderCenterY: number;
  outwardNormalScreen: Point;
};

type WallJoinNode = {
  id: string;
  point: Point;
  segmentType: WallSegmentType;
  wallThickness: number;
  alignmentMode: WallAlignmentMode;
  cornerJoinMode: CornerJoinMode;
  segmentIds: string[];
  outwardNormal: Point | null;
};

type DimensionLabelPlacementMode = 'line-normal-offset' | 'closed-contour-outside';

type DimensionLabelPlacement = {
  left: number;
  top: number;
  rotationDeg: number;
  offsetPx: number;
  placementMode: DimensionLabelPlacementMode;
};

const formatLineLength = (lengthMm: number) => `${(lengthMm / 1000).toFixed(2)} м`;

const EMPTY_DRAG_SESSION: DragSession = {
  started: false,
  moved: false,
  pointerId: null,
  interactionMode: 'idle',
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  moveEntityIds: [],
  moveOriginalEntities: [],
  moveDoorId: null,
  moveOriginalDoor: null,
  resizeHandleId: null,
  resizeAxis: 'none',
  resizeOriginalEntities: [],
  resizeOriginalBoundingBox: null,
  resizeAnchorPoint: null,
  resizeActivePoint: null,
  startTime: 0,
  canStartSelectionBox: false,
  isPanningCanvas: false,
};

const normalizeAngle = (angle: number) => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const formatAngle = (angle: number) => {
  const normalized = normalizeAngle(angle);
  return normalized > 180 ? normalized - 360 : normalized;
};

const getLineMetrics = (startPoint: Point, endPoint: Point) => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;

  return {
    length: Math.hypot(dx, dy),
    angle: normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI),
  };
};

const snapPointToGrid = (point: Point): Point => ({
  x: Math.round(point.x / GRID_STEP_MM) * GRID_STEP_MM,
  y: Math.round(point.y / GRID_STEP_MM) * GRID_STEP_MM,
});

const angularDistance = (angleA: number, angleB: number) => {
  const diff = Math.abs(normalizeAngle(angleA) - normalizeAngle(angleB));
  return Math.min(diff, 360 - diff);
};

const snapEndPointToAngleHelper = (startPoint: Point, gridEndPoint: Point): { point: Point; active: boolean } => {
  const dx = gridEndPoint.x - startPoint.x;
  const dy = gridEndPoint.y - startPoint.y;

  if (dx === 0 && dy === 0) {
    return { point: gridEndPoint, active: false };
  }

  const rawAngle = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI);
  const helperAngle = normalizeAngle(Math.round(rawAngle / SNAP_ANGLE_STEP_DEG) * SNAP_ANGLE_STEP_DEG);

  if (angularDistance(rawAngle, helperAngle) > ANGLE_HELPER_TOLERANCE_DEG) {
    return { point: gridEndPoint, active: false };
  }

  const horizontalSign = Math.cos((helperAngle * Math.PI) / 180) >= 0 ? 1 : -1;
  const verticalSign = Math.sin((helperAngle * Math.PI) / 180) >= 0 ? 1 : -1;

  if (helperAngle === 0 || helperAngle === 180) {
    const xSteps = Math.max(1, Math.round(Math.abs(dx) / GRID_STEP_MM));
    return { point: { x: startPoint.x + horizontalSign * xSteps * GRID_STEP_MM, y: startPoint.y }, active: true };
  }

  if (helperAngle === 90 || helperAngle === 270) {
    const ySteps = Math.max(1, Math.round(Math.abs(dy) / GRID_STEP_MM));
    return { point: { x: startPoint.x, y: startPoint.y + verticalSign * ySteps * GRID_STEP_MM }, active: true };
  }

  const diagonalSteps = Math.max(1, Math.round((Math.abs(dx) + Math.abs(dy)) / 2 / GRID_STEP_MM));
  return {
    point: {
      x: startPoint.x + horizontalSign * diagonalSteps * GRID_STEP_MM,
      y: startPoint.y + verticalSign * diagonalSteps * GRID_STEP_MM,
    },
    active: true,
  };
};

const findNearestEndpointSnapTarget = (entities: CanvasV4LineEntity[], rawPoint: Point, threshold: number, excludedTargetIds = new Set<string>()): EndpointSnapTarget | null => {
  let nearestTarget: EndpointSnapTarget | null = null;

  entities.forEach((entity) => {
    ([
      { targetId: `${entity.entityId}:startPoint`, point: entity.startPoint },
      { targetId: `${entity.entityId}:endPoint`, point: entity.endPoint },
    ] as Array<{ targetId: string; point: Point }>).forEach((candidate) => {
      if (excludedTargetIds.has(candidate.targetId)) {
        return;
      }

      const distance = Math.hypot(rawPoint.x - candidate.point.x, rawPoint.y - candidate.point.y);

      if (distance <= threshold && (!nearestTarget || distance < nearestTarget.distance)) {
        nearestTarget = {
          targetId: candidate.targetId,
          point: candidate.point,
          distance,
        };
      }
    });
  });

  return nearestTarget;
};

const resolveCanvasV4Snap = (entities: CanvasV4LineEntity[], rawPoint: Point, endpointThreshold: number, startPoint?: Point | null, excludedTargetIds = new Set<string>()): SnapResult => {
  const endpointTarget = findNearestEndpointSnapTarget(entities, rawPoint, endpointThreshold, excludedTargetIds);

  if (endpointTarget) {
    return {
      point: endpointTarget.point,
      activeSnapType: 'endpoint',
      activeSnapTargetId: endpointTarget.targetId,
      activeSnapDistance: endpointTarget.distance,
      gridSnappedEndPoint: null,
      angleHelperActive: false,
    };
  }

  const gridPoint = snapPointToGrid(rawPoint);

  if (!startPoint) {
    return {
      point: gridPoint,
      activeSnapType: 'grid',
      activeSnapTargetId: null,
      activeSnapDistance: Math.hypot(rawPoint.x - gridPoint.x, rawPoint.y - gridPoint.y),
      gridSnappedEndPoint: gridPoint,
      angleHelperActive: false,
    };
  }

  const angleHelper = snapEndPointToAngleHelper(startPoint, gridPoint);

  return {
    point: angleHelper.point,
    activeSnapType: angleHelper.active ? 'angle' : 'grid',
    activeSnapTargetId: null,
    activeSnapDistance: Math.hypot(rawPoint.x - angleHelper.point.x, rawPoint.y - angleHelper.point.y),
    gridSnappedEndPoint: gridPoint,
    angleHelperActive: angleHelper.active,
  };
};

const arePointsEqual = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= POINT_MATCH_EPSILON;

const getWallAlignmentMode = (segmentType: WallSegmentType): WallAlignmentMode => (segmentType === 'external' ? 'inside' : 'center');

const addPoints = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

const scaleVector = (vector: Point, scale: number): Point => ({ x: vector.x * scale, y: vector.y * scale });

const normalizeVector = (vector: Point): Point => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.000001) {
    return { x: 0, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

const getSegmentUnitAndLeftNormal = (startPoint: Point, endPoint: Point) => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const unit = { x: dx / length, y: dy / length };

  return { unit, leftNormal: { x: -unit.y, y: unit.x } };
};

const createWallSegment = (startPoint: Point, endPoint: Point, segmentType: WallSegmentType = 'internal', polylineId?: string): CanvasV4WallSegment => {
  const metrics = getLineMetrics(startPoint, endPoint);
  const segmentId = `wall-segment-${Date.now()}-${Math.round(Math.random() * 100000)}`;

  return {
    entityId: segmentId,
    segmentId,
    lineId: segmentId,
    entityType: 'wall-segment',
    polylineId,
    startPoint,
    endPoint,
    length: metrics.length,
    angle: metrics.angle,
    wallThickness: DEFAULT_WALL_THICKNESS_MM,
    wallAlignmentMode: getWallAlignmentMode(segmentType),
    cornerJoinMode: DEFAULT_CORNER_JOIN_MODE,
    segmentType,
    connectedSegmentIds: [],
    doorIds: [],
    windowIds: [],
  };
};



const getEndpointPairs = (entity: CanvasV4LineEntity) => [
  { segmentId: entity.segmentId, point: entity.startPoint },
  { segmentId: entity.segmentId, point: entity.endPoint },
];

const normalizeWallSegmentConnectivity = (entities: CanvasV4LineEntity[]) => {
  const connectedBySegmentId = new Map(entities.map((entity) => [entity.segmentId, new Set<string>()]));

  entities.forEach((entity, entityIndex) => {
    entities.slice(entityIndex + 1).forEach((candidate) => {
      const isConnected = getEndpointPairs(entity).some((endpoint) =>
        getEndpointPairs(candidate).some((candidateEndpoint) => arePointsEqual(endpoint.point, candidateEndpoint.point)),
      );

      if (isConnected) {
        connectedBySegmentId.get(entity.segmentId)?.add(candidate.segmentId);
        connectedBySegmentId.get(candidate.segmentId)?.add(entity.segmentId);
      }
    });
  });

  return entities.map((entity) => ({
    ...entity,
    connectedSegmentIds: Array.from(connectedBySegmentId.get(entity.segmentId) ?? []).sort(),
  }));
};

const moveLineEntity = (entity: CanvasV4LineEntity, delta: Point): CanvasV4LineEntity => {
  const startPoint = { x: entity.startPoint.x + delta.x, y: entity.startPoint.y + delta.y };
  const endPoint = { x: entity.endPoint.x + delta.x, y: entity.endPoint.y + delta.y };
  const metrics = getLineMetrics(startPoint, endPoint);

  return {
    ...entity,
    startPoint,
    endPoint,
    length: metrics.length,
    angle: metrics.angle,
  };
};

const updateLineEntityGeometry = (entity: CanvasV4LineEntity, startPoint: Point, endPoint: Point): CanvasV4LineEntity => {
  const metrics = getLineMetrics(startPoint, endPoint);

  return {
    ...entity,
    startPoint,
    endPoint,
    length: metrics.length,
    angle: metrics.angle,
  };
};

const getEntitiesBoundingBox = (entities: CanvasV4LineEntity[]): BoundingBox | null => {
  if (entities.length === 0) {
    return null;
  }

  return entities.reduce<BoundingBox>(
    (box, entity) => ({
      minX: Math.min(box.minX, entity.startPoint.x, entity.endPoint.x),
      maxX: Math.max(box.maxX, entity.startPoint.x, entity.endPoint.x),
      minY: Math.min(box.minY, entity.startPoint.y, entity.endPoint.y),
      maxY: Math.max(box.maxY, entity.startPoint.y, entity.endPoint.y),
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
  );
};

const getResizeAxisForHandle = (handleId: TransformHandleId): ResizeAxis => {
  if (handleId === 'bbox-n' || handleId === 'bbox-s') {
    return 'y';
  }

  if (handleId === 'bbox-e' || handleId === 'bbox-w') {
    return 'x';
  }

  return 'xy';
};

const getBoundingBoxHandlePoint = (box: BoundingBox, handleId: TransformHandleId): Point => {
  const centerX = (box.minX + box.maxX) / 2;
  const centerY = (box.minY + box.maxY) / 2;

  switch (handleId) {
    case 'bbox-nw':
      return { x: box.minX, y: box.minY };
    case 'bbox-n':
      return { x: centerX, y: box.minY };
    case 'bbox-ne':
      return { x: box.maxX, y: box.minY };
    case 'bbox-e':
      return { x: box.maxX, y: centerY };
    case 'bbox-se':
      return { x: box.maxX, y: box.maxY };
    case 'bbox-s':
      return { x: centerX, y: box.maxY };
    case 'bbox-sw':
      return { x: box.minX, y: box.maxY };
    case 'bbox-w':
      return { x: box.minX, y: centerY };
    default:
      return { x: centerX, y: centerY };
  }
};

const getBoundingBoxAnchorPoint = (box: BoundingBox, handleId: TransformHandleId): Point => {
  const centerX = (box.minX + box.maxX) / 2;
  const centerY = (box.minY + box.maxY) / 2;

  switch (handleId) {
    case 'bbox-nw':
      return { x: box.maxX, y: box.maxY };
    case 'bbox-n':
      return { x: centerX, y: box.maxY };
    case 'bbox-ne':
      return { x: box.minX, y: box.maxY };
    case 'bbox-e':
      return { x: box.minX, y: centerY };
    case 'bbox-se':
      return { x: box.minX, y: box.minY };
    case 'bbox-s':
      return { x: centerX, y: box.minY };
    case 'bbox-sw':
      return { x: box.maxX, y: box.minY };
    case 'bbox-w':
      return { x: box.maxX, y: centerY };
    default:
      return { x: centerX, y: centerY };
  }
};

const scalePointFromAnchor = (point: Point, anchorPoint: Point, scaleX: number, scaleY: number): Point => ({
  x: anchorPoint.x + (point.x - anchorPoint.x) * scaleX,
  y: anchorPoint.y + (point.y - anchorPoint.y) * scaleY,
});

const getNormalizedRect = (startPoint: Point, endPoint: Point) => ({
  minX: Math.min(startPoint.x, endPoint.x),
  maxX: Math.max(startPoint.x, endPoint.x),
  minY: Math.min(startPoint.y, endPoint.y),
  maxY: Math.max(startPoint.y, endPoint.y),
});

const isPointInsideRect = (point: Point, rect: ReturnType<typeof getNormalizedRect>) => point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY;

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

const doSegmentsIntersect = (a: Point, b: Point, c: Point, d: Point) => {
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

const doesLineIntersectRect = (entity: CanvasV4LineEntity, rect: ReturnType<typeof getNormalizedRect>) => {
  if (isPointInsideRect(entity.startPoint, rect) || isPointInsideRect(entity.endPoint, rect)) {
    return true;
  }

  const topLeft = { x: rect.minX, y: rect.minY };
  const topRight = { x: rect.maxX, y: rect.minY };
  const bottomRight = { x: rect.maxX, y: rect.maxY };
  const bottomLeft = { x: rect.minX, y: rect.maxY };

  return (
    doSegmentsIntersect(entity.startPoint, entity.endPoint, topLeft, topRight) ||
    doSegmentsIntersect(entity.startPoint, entity.endPoint, topRight, bottomRight) ||
    doSegmentsIntersect(entity.startPoint, entity.endPoint, bottomRight, bottomLeft) ||
    doSegmentsIntersect(entity.startPoint, entity.endPoint, bottomLeft, topLeft)
  );
};

const insertEntityAtIndex = (entities: CanvasV4LineEntity[], entity: CanvasV4LineEntity, index: number) => {
  const next = entities.filter((item) => item.entityId !== entity.entityId);
  next.splice(Math.min(index, next.length), 0, entity);
  return next;
};

const getDistanceToSegment = (point: Point, startPoint: Point, endPoint: Point) => {
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


const projectPointToSegment = (point: Point, segment: CanvasV4LineEntity) => {
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

const getDoorPositionLimit = (segment: CanvasV4LineEntity, width = DEFAULT_DOOR_WIDTH_MM) => Math.max(0, segment.length - width / 2);

const clampDoorPositionOnSegment = (segment: CanvasV4LineEntity, positionOnSegment: number, width = DEFAULT_DOOR_WIDTH_MM) => {
  const min = Math.min(segment.length, width / 2);
  const max = Math.max(min, getDoorPositionLimit(segment, width));
  return Math.max(min, Math.min(max, positionOnSegment));
};

const getPointOnSegmentAtDistance = (segment: CanvasV4LineEntity, distance: number): Point => {
  const length = Math.max(segment.length, 1);
  const t = Math.max(0, Math.min(1, distance / length));

  return {
    x: segment.startPoint.x + (segment.endPoint.x - segment.startPoint.x) * t,
    y: segment.startPoint.y + (segment.endPoint.y - segment.startPoint.y) * t,
  };
};

const createDoor = (segment: CanvasV4LineEntity, positionOnSegment: number): CanvasV4Door => ({
  doorId: `door-${Date.now()}-${Math.round(Math.random() * 100000)}`,
  segmentId: segment.segmentId,
  positionOnSegment: clampDoorPositionOnSegment(segment, positionOnSegment),
  width: DEFAULT_DOOR_WIDTH_MM,
  swingDirection: 'right',
  createdAt: Date.now(),
});

const insertDoorAtIndex = (doors: CanvasV4Door[], door: CanvasV4Door, index: number) => {
  const next = doors.filter((item) => item.doorId !== door.doorId);
  next.splice(Math.min(index, next.length), 0, door);
  return next;
};

const withDoorAttachedToSegment = (entity: CanvasV4LineEntity, doorId: string): CanvasV4LineEntity => ({
  ...entity,
  doorIds: entity.doorIds.includes(doorId) ? entity.doorIds : [...entity.doorIds, doorId],
});

const withDoorDetachedFromSegment = (entity: CanvasV4LineEntity, doorId: string): CanvasV4LineEntity => ({
  ...entity,
  doorIds: entity.doorIds.filter((id) => id !== doorId),
});

const clampDoorsToSegments = (doors: CanvasV4Door[], entities: CanvasV4LineEntity[]) => {
  const segmentsById = new Map(entities.map((entity) => [entity.segmentId, entity]));

  return doors.map((door) => {
    const segment = segmentsById.get(door.segmentId);

    if (!segment) {
      return door;
    }

    return {
      ...door,
      positionOnSegment: clampDoorPositionOnSegment(segment, door.positionOnSegment, door.width),
    };
  });
};

const getScreenPoint = (nativeEvent: any): Point => ({
  x: nativeEvent.locationX ?? nativeEvent.offsetX ?? 0,
  y: nativeEvent.locationY ?? nativeEvent.offsetY ?? 0,
});


const getPolygonCentroid = (points: Point[]): Point | null => {
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

const getClosedPolylineCentroidForEntity = (entity: CanvasV4LineEntity, entities: CanvasV4LineEntity[]) => {
  if (!entity.polylineId) {
    return null;
  }

  const contourSegments = entities.filter((candidate) => candidate.polylineId === entity.polylineId);

  if (contourSegments.length < 3) {
    return null;
  }

  const isSequentialContour = contourSegments.every((segment, index) => {
    const nextSegment = contourSegments[(index + 1) % contourSegments.length];
    return arePointsEqual(segment.endPoint, nextSegment.startPoint);
  });

  if (!isSequentialContour) {
    return null;
  }

  return getPolygonCentroid(contourSegments.map((segment) => segment.startPoint));
};


const getEntityEndpoint = (entity: CanvasV4LineEntity, endpointKey: 'startPoint' | 'endPoint') => (endpointKey === 'startPoint' ? entity.startPoint : entity.endPoint);

const getEntityOutwardNormal = (entity: CanvasV4LineEntity, entities: CanvasV4LineEntity[]): Point => {
  const { leftNormal } = getSegmentUnitAndLeftNormal(entity.startPoint, entity.endPoint);

  if (entity.segmentType !== 'external') {
    return leftNormal;
  }

  const contourCentroid = getClosedPolylineCentroidForEntity(entity, entities);

  if (!contourCentroid) {
    return getPreferredOpenLineNormal(leftNormal);
  }

  const midpoint = {
    x: (entity.startPoint.x + entity.endPoint.x) / 2,
    y: (entity.startPoint.y + entity.endPoint.y) / 2,
  };
  const leftProbe = addPoints(midpoint, scaleVector(leftNormal, entity.wallThickness));
  const rightNormal = scaleVector(leftNormal, -1);
  const rightProbe = addPoints(midpoint, scaleVector(rightNormal, entity.wallThickness));
  const leftDistance = Math.hypot(leftProbe.x - contourCentroid.x, leftProbe.y - contourCentroid.y);
  const rightDistance = Math.hypot(rightProbe.x - contourCentroid.x, rightProbe.y - contourCentroid.y);

  return leftDistance >= rightDistance ? leftNormal : rightNormal;
};

const getWallJoinNodes = (entities: CanvasV4LineEntity[]): WallJoinNode[] => {
  const endpointGroups = new Map<string, Array<{ entity: CanvasV4LineEntity; endpointKey: 'startPoint' | 'endPoint' }>>();

  entities.forEach((entity) => {
    (['startPoint', 'endPoint'] as const).forEach((endpointKey) => {
      const point = getEntityEndpoint(entity, endpointKey);
      const key = `${point.x.toFixed(3)}:${point.y.toFixed(3)}`;
      endpointGroups.set(key, [...(endpointGroups.get(key) ?? []), { entity, endpointKey }]);
    });
  });

  return Array.from(endpointGroups.entries()).flatMap(([key, endpointGroup]) => {
    if (endpointGroup.length < 2) {
      return [];
    }

    const joinsByType = new Map<WallSegmentType, typeof endpointGroup>();
    endpointGroup.forEach((endpoint) => {
      joinsByType.set(endpoint.entity.segmentType, [...(joinsByType.get(endpoint.entity.segmentType) ?? []), endpoint]);
    });

    return Array.from(joinsByType.entries()).flatMap(([segmentType, typeGroup]) => {
      if (typeGroup.length < 2) {
        return [];
      }

      const firstEntity = typeGroup[0].entity;
      const point = getEntityEndpoint(firstEntity, typeGroup[0].endpointKey);
      const outwardNormal = segmentType === 'external'
        ? normalizeVector(typeGroup.reduce<Point>((sum, endpoint) => addPoints(sum, getEntityOutwardNormal(endpoint.entity, entities)), { x: 0, y: 0 }))
        : null;

      return [{
        id: `${key}:${segmentType}`,
        point,
        segmentType,
        wallThickness: Math.max(...typeGroup.map((endpoint) => endpoint.entity.wallThickness)),
        alignmentMode: getWallAlignmentMode(segmentType),
        cornerJoinMode: DEFAULT_CORNER_JOIN_MODE,
        segmentIds: typeGroup.map((endpoint) => endpoint.entity.segmentId).sort(),
        outwardNormal,
      }];
    });
  });
};

const normalizeDimensionLabelRotation = (angleDeg: number) => {
  const normalized = ((angleDeg + 180) % 360) - 180;

  if (normalized > 90) {
    return normalized - 180;
  }

  if (normalized < -90) {
    return normalized + 180;
  }

  return normalized;
};

const getPreferredOpenLineNormal = (normal: Point) => {
  if (Math.abs(normal.x) > Math.abs(normal.y)) {
    return normal.x < 0 ? { x: -normal.x, y: -normal.y } : normal;
  }

  return normal.y > 0 ? { x: -normal.x, y: -normal.y } : normal;
};

const getDimensionLabelPlacement = (geometry: LineScreenGeometry, contourCentroidScreenPoint: Point | null): DimensionLabelPlacement => {
  const dx = geometry.screenEnd.x - geometry.screenStart.x;
  const dy = geometry.screenEnd.y - geometry.screenStart.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const unitX = dx / length;
  const unitY = dy / length;
  const leftNormal = { x: -unitY, y: unitX };
  let offsetNormal = getPreferredOpenLineNormal(leftNormal);
  let placementMode: DimensionLabelPlacementMode = 'line-normal-offset';

  if (contourCentroidScreenPoint) {
    const midpoint = { x: geometry.centerX, y: geometry.centerY };
    const candidatePoint = {
      x: midpoint.x + leftNormal.x * LINE_DIMENSION_LABEL_OFFSET_PX,
      y: midpoint.y + leftNormal.y * LINE_DIMENSION_LABEL_OFFSET_PX,
    };
    const mirroredPoint = {
      x: midpoint.x - leftNormal.x * LINE_DIMENSION_LABEL_OFFSET_PX,
      y: midpoint.y - leftNormal.y * LINE_DIMENSION_LABEL_OFFSET_PX,
    };
    const candidateDistance = Math.hypot(candidatePoint.x - contourCentroidScreenPoint.x, candidatePoint.y - contourCentroidScreenPoint.y);
    const mirroredDistance = Math.hypot(mirroredPoint.x - contourCentroidScreenPoint.x, mirroredPoint.y - contourCentroidScreenPoint.y);

    offsetNormal = candidateDistance >= mirroredDistance ? leftNormal : { x: -leftNormal.x, y: -leftNormal.y };
    placementMode = 'closed-contour-outside';
  }

  const anchorX = geometry.centerX + offsetNormal.x * LINE_DIMENSION_LABEL_OFFSET_PX;
  const anchorY = geometry.centerY + offsetNormal.y * LINE_DIMENSION_LABEL_OFFSET_PX;

  return {
    left: anchorX - LINE_DIMENSION_LABEL_WIDTH_PX / 2,
    top: anchorY - LINE_DIMENSION_LABEL_HEIGHT_PX / 2,
    rotationDeg: normalizeDimensionLabelRotation(geometry.angleDeg),
    offsetPx: LINE_DIMENSION_LABEL_OFFSET_PX,
    placementMode,
  };
};

export const CanvasV4DevScreen = () => {
  const canvasRef = useRef<View | null>(null);
  const dragSessionRef = useRef<DragSession>(EMPTY_DRAG_SESSION);
  const lastTapRef = useRef<{ time: number; point: Point; wasEmpty: boolean } | null>(null);
  const { height: windowHeight } = useWindowDimensions();

  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  const [cameraZoom, setCameraZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isGridVisible, setGridVisible] = useState(true);
  const [showLineDimensions, setShowLineDimensions] = useState(true);
  const [isInspectorVisible, setInspectorVisible] = useState(false);
  const [currentToolMode, setCurrentToolMode] = useState<ToolMode>('select');
  const [newSegmentType, setNewSegmentType] = useState<WallSegmentType>('internal');
  const [entities, setEntities] = useState<CanvasV4LineEntity[]>([]);
  const [doors, setDoors] = useState<CanvasV4Door[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null);
  const [lineStartPoint, setLineStartPoint] = useState<Point | null>(null);
  const [polylineLastPoint, setPolylineLastPoint] = useState<Point | null>(null);
  const [activePolylineId, setActivePolylineId] = useState<string | null>(null);
  const [pointerWorldPoint, setPointerWorldPoint] = useState<Point | null>(null);
  const [lastActionType, setLastActionType] = useState<string>('INIT_CANVAS_V4');
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const [lastUndoAction, setLastUndoAction] = useState<string>('null');
  const [lastRedoAction, setLastRedoAction] = useState<string>('null');
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const [lastInteractionType, setLastInteractionType] = useState<LastInteractionType>('init');
  const [isMovingSelection, setIsMovingSelection] = useState(false);
  const [moveDeltaMm, setMoveDeltaMm] = useState<Point>({ x: 0, y: 0 });
  const [lastMoveAction, setLastMoveAction] = useState<string>('null');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [transformMode, setTransformMode] = useState<TransformMode>('idle');
  const [activeHandleId, setActiveHandleId] = useState<TransformHandleId | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeAxis, setResizeAxis] = useState<ResizeAxis>('none');
  const [resizeScale, setResizeScale] = useState({ x: 1, y: 1 });
  const [hitTestTargetType, setHitTestTargetType] = useState<HitTestTargetType>('empty-canvas');
  const [lastHitTestEntityId, setLastHitTestEntityId] = useState<string | null>(null);

  const worldToScreen = useCallback(
    (point: Point): Point => ({
      x: point.x * cameraZoom + viewport.width / 2 + pan.x,
      y: point.y * cameraZoom + viewport.height / 2 + pan.y,
    }),
    [cameraZoom, pan.x, pan.y, viewport.height, viewport.width],
  );

  const screenToWorld = useCallback(
    (point: Point): Point => ({
      x: (point.x - viewport.width / 2 - pan.x) / cameraZoom,
      y: (point.y - viewport.height / 2 - pan.y) / cameraZoom,
    }),
    [cameraZoom, pan.x, pan.y, viewport.height, viewport.width],
  );

  const endpointSnapThreshold = ENDPOINT_SNAP_THRESHOLD_PX / cameraZoom;
  const activeDrawingStartPoint = currentToolMode === 'line' ? lineStartPoint : currentToolMode === 'polyline' ? polylineLastPoint : null;

  const activeSnap = useMemo<SnapResult>(() => {
    if (!pointerWorldPoint) {
      return {
        point: { x: 0, y: 0 },
        activeSnapType: 'none',
        activeSnapTargetId: null,
        activeSnapDistance: null,
        gridSnappedEndPoint: null,
        angleHelperActive: false,
      };
    }

    return resolveCanvasV4Snap(entities, pointerWorldPoint, endpointSnapThreshold, activeDrawingStartPoint);
  }, [activeDrawingStartPoint, endpointSnapThreshold, entities, pointerWorldPoint]);

  const previewLine = useMemo(() => {
    if (!activeDrawingStartPoint || !pointerWorldPoint) {
      return null;
    }

    const endPoint = activeSnap.point;
    const metrics = getLineMetrics(activeDrawingStartPoint, endPoint);

    return {
      startPoint: activeDrawingStartPoint,
      endPoint,
      length: metrics.length,
      angle: metrics.angle,
    };
  }, [activeDrawingStartPoint, activeSnap.point, pointerWorldPoint]);

  const getLineScreenGeometry = useCallback(
    (startPoint: Point, endPoint: Point): LineScreenGeometry => {
      const screenStart = worldToScreen(startPoint);
      const screenEnd = worldToScreen(endPoint);
      const length = Math.hypot(screenEnd.x - screenStart.x, screenEnd.y - screenStart.y);
      const centerX = (screenStart.x + screenEnd.x) / 2;
      const centerY = (screenStart.y + screenEnd.y) / 2;
      const angleDeg = (Math.atan2(screenEnd.y - screenStart.y, screenEnd.x - screenStart.x) * 180) / Math.PI;

      return { length, centerX, centerY, angleDeg, screenStart, screenEnd };
    },
    [worldToScreen],
  );

  const getWallRenderGeometry = useCallback(
    (entity: CanvasV4LineEntity): WallRenderGeometry => {
      const geometry = getLineScreenGeometry(entity.startPoint, entity.endPoint);
      const wallThicknessPx = Math.max(entity.wallThickness * cameraZoom, 4);
      const worldOutwardNormal = getEntityOutwardNormal(entity, entities);
      const screenOutwardNormal = normalizeVector({ x: worldOutwardNormal.x, y: worldOutwardNormal.y });
      const alignmentMode = entity.wallAlignmentMode ?? getWallAlignmentMode(entity.segmentType);
      const offsetPx = alignmentMode === 'inside' ? wallThicknessPx / 2 : 0;

      return {
        ...geometry,
        alignmentMode,
        cornerJoinMode: entity.cornerJoinMode ?? DEFAULT_CORNER_JOIN_MODE,
        wallThicknessPx,
        renderCenterX: geometry.centerX + screenOutwardNormal.x * offsetPx,
        renderCenterY: geometry.centerY + screenOutwardNormal.y * offsetPx,
        outwardNormalScreen: screenOutwardNormal,
      };
    },
    [cameraZoom, entities, getLineScreenGeometry],
  );

  const getPreviewWallRenderGeometry = useCallback(
    (geometry: LineScreenGeometry): WallRenderGeometry => {
      const wallThicknessPx = Math.max(DEFAULT_WALL_THICKNESS_MM * cameraZoom, 4);
      const dx = previewLine ? previewLine.endPoint.x - previewLine.startPoint.x : 0;
      const dy = previewLine ? previewLine.endPoint.y - previewLine.startPoint.y : 0;
      const worldLength = Math.max(Math.hypot(dx, dy), 1);
      const leftNormal = { x: -dy / worldLength, y: dx / worldLength };
      const outwardNormal = newSegmentType === 'external' ? getPreferredOpenLineNormal(leftNormal) : leftNormal;
      const screenOutwardNormal = normalizeVector(outwardNormal);
      const alignmentMode = getWallAlignmentMode(newSegmentType);
      const offsetPx = alignmentMode === 'inside' ? wallThicknessPx / 2 : 0;

      return {
        ...geometry,
        alignmentMode,
        cornerJoinMode: DEFAULT_CORNER_JOIN_MODE,
        wallThicknessPx,
        renderCenterX: geometry.centerX + screenOutwardNormal.x * offsetPx,
        renderCenterY: geometry.centerY + screenOutwardNormal.y * offsetPx,
        outwardNormalScreen: screenOutwardNormal,
      };
    },
    [cameraZoom, newSegmentType, previewLine],
  );

  const getEntityDimensionLabelPlacement = useCallback(
    (entity: CanvasV4LineEntity, geometry: LineScreenGeometry) => {
      const contourCentroid = getClosedPolylineCentroidForEntity(entity, entities);
      return getDimensionLabelPlacement(geometry, contourCentroid ? worldToScreen(contourCentroid) : null);
    },
    [entities, worldToScreen],
  );

  const getPreviewDimensionLabelPlacement = useCallback(
    (geometry: LineScreenGeometry) => getDimensionLabelPlacement(geometry, null),
    [],
  );

  const gridLines = useMemo(() => {
    if (!isGridVisible || viewport.width <= 1 || viewport.height <= 1) {
      return [];
    }

    const topLeft = screenToWorld({ x: 0, y: 0 });
    const bottomRight = screenToWorld({ x: viewport.width, y: viewport.height });
    const minX = Math.floor(Math.min(topLeft.x, bottomRight.x) / GRID_STEP_MM) * GRID_STEP_MM;
    const maxX = Math.ceil(Math.max(topLeft.x, bottomRight.x) / GRID_STEP_MM) * GRID_STEP_MM;
    const minY = Math.floor(Math.min(topLeft.y, bottomRight.y) / GRID_STEP_MM) * GRID_STEP_MM;
    const maxY = Math.ceil(Math.max(topLeft.y, bottomRight.y) / GRID_STEP_MM) * GRID_STEP_MM;
    const lines: Array<{ id: string; axis: 'x' | 'y'; position: number; isMajor: boolean }> = [];

    for (let x = minX; x <= maxX; x += GRID_STEP_MM) {
      lines.push({ id: `v-${x}`, axis: 'y', position: worldToScreen({ x, y: 0 }).x, isMajor: x % 1000 === 0 });
    }

    for (let y = minY; y <= maxY; y += GRID_STEP_MM) {
      lines.push({ id: `h-${y}`, axis: 'x', position: worldToScreen({ x: 0, y }).y, isMajor: y % 1000 === 0 });
    }

    return lines;
  }, [isGridVisible, screenToWorld, viewport.height, viewport.width, worldToScreen]);

  const pushHistoryAction = useCallback((action: HistoryAction) => {
    setUndoStack((current) => [...current, action]);
    setRedoStack([]);
    setLastUndoAction('null');
    setLastRedoAction('null');
    setLastActionType(action.type);
  }, []);

  const findEntityAtWorldPoint = useCallback(
    (worldPoint: Point) => {
      const tolerance = HIT_TOLERANCE_PX / cameraZoom;

      return [...entities]
        .reverse()
        .find((entity) => getDistanceToSegment(worldPoint, entity.startPoint, entity.endPoint) <= tolerance)?.entityId ?? null;
    },
    [cameraZoom, entities],
  );

  const findNearestSegmentProjection = useCallback(
    (worldPoint: Point): { entity: CanvasV4LineEntity; positionOnSegment: number; distance: number } | null => {
      const tolerance = HIT_TOLERANCE_PX / cameraZoom;

      return entities.reduce<{ entity: CanvasV4LineEntity; positionOnSegment: number; distance: number } | null>((nearest, entity) => {
        const projection = projectPointToSegment(worldPoint, entity);

        if (projection.distance <= tolerance && (!nearest || projection.distance < nearest.distance)) {
          return { entity, positionOnSegment: projection.positionOnSegment, distance: projection.distance };
        }

        return nearest;
      }, null);
    },
    [cameraZoom, entities],
  );

  const findDoorAtWorldPoint = useCallback(
    (worldPoint: Point) => {
      const tolerance = DOOR_HIT_TOLERANCE_PX / cameraZoom;
      const segmentsById = new Map(entities.map((entity) => [entity.segmentId, entity]));

      return [...doors]
        .reverse()
        .find((door) => {
          const segment = segmentsById.get(door.segmentId);

          if (!segment) {
            return false;
          }

          const centerPoint = getPointOnSegmentAtDistance(segment, door.positionOnSegment);
          const alongDistance = Math.abs(projectPointToSegment(worldPoint, segment).positionOnSegment - door.positionOnSegment);
          const centerDistance = Math.hypot(worldPoint.x - centerPoint.x, worldPoint.y - centerPoint.y);

          return alongDistance <= door.width / 2 + tolerance && centerDistance <= Math.max(door.width / 2, DOOR_LEAF_DEPTH_MM) + tolerance;
        })?.doorId ?? null;
    },
    [cameraZoom, doors, entities],
  );

  const selectedEntities = useMemo(() => {
    const selectedSet = new Set(selectedEntityIds);
    return entities.filter((entity) => selectedSet.has(entity.entityId));
  }, [entities, selectedEntityIds]);

  const selectedDoor = useMemo(() => doors.find((door) => door.doorId === selectedDoorId) ?? null, [doors, selectedDoorId]);
  const selectedBoundingBox = useMemo(() => getEntitiesBoundingBox(selectedEntities), [selectedEntities]);
  const selectedSegment = selectedEntities.length === 1 ? selectedEntities[0] : null;
  const selectedLineLength = selectedSegment?.length ?? null;

  const transformHandles = useMemo(() => {
    if (!selectedDoorId && selectedEntities.length === 1) {
      const entity = selectedEntities[0];
      return [
        { id: 'single-start' as TransformHandleId, point: entity.startPoint, axis: 'xy' as ResizeAxis },
        { id: 'single-end' as TransformHandleId, point: entity.endPoint, axis: 'xy' as ResizeAxis },
      ];
    }

    if (!selectedDoorId && selectedEntities.length > 1 && selectedBoundingBox) {
      const handleIds: TransformHandleId[] = ['bbox-nw', 'bbox-n', 'bbox-ne', 'bbox-e', 'bbox-se', 'bbox-s', 'bbox-sw', 'bbox-w'];
      return handleIds.map((id) => ({ id, point: getBoundingBoxHandlePoint(selectedBoundingBox, id), axis: getResizeAxisForHandle(id) }));
    }

    return [];
  }, [selectedBoundingBox, selectedDoorId, selectedEntities]);

  const findTransformHandleAtScreenPoint = useCallback(
    (screenPoint: Point) => {
      return [...transformHandles]
        .reverse()
        .find((handle) => {
          const handleScreenPoint = worldToScreen(handle.point);
          return Math.hypot(screenPoint.x - handleScreenPoint.x, screenPoint.y - handleScreenPoint.y) <= TRANSFORM_HANDLE_HIT_RADIUS_PX;
        }) ?? null;
    },
    [transformHandles, worldToScreen],
  );

  const applyZoom = useCallback((factor: number) => {
    setCameraZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current * factor)));
    setLastActionType('ZOOM_CHANGE');
    setLastInteractionType('zoom');
  }, []);

  const resetView = useCallback(() => {
    setCameraZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
    setLastActionType('RESET_VIEW');
    setLastInteractionType('reset-view');
  }, []);

  const deleteSelectedEntities = useCallback(() => {
    if (selectedDoorId) {
      const doorIndex = doors.findIndex((door) => door.doorId === selectedDoorId);
      const door = doorIndex >= 0 ? doors[doorIndex] : null;
      const beforeEntity = door ? entities.find((entity) => entity.segmentId === door.segmentId) ?? null : null;

      if (!door || !beforeEntity) {
        return;
      }

      const afterEntity = withDoorDetachedFromSegment(beforeEntity, door.doorId);
      pushHistoryAction({ type: 'DELETE_DOOR', door, doorIndex, beforeEntity, afterEntity });
      setDoors((current) => current.filter((item) => item.doorId !== door.doorId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === afterEntity.entityId ? afterEntity : entity))));
      setSelectedDoorId(null);
      setLastActionType('DELETE_DOOR');
      return;
    }

    if (selectedEntityIds.length === 0) {
      return;
    }

    const selectedSet = new Set(selectedEntityIds);
    const deletedEntities = entities
      .map((entity, index) => ({ entity, index }))
      .filter(({ entity }) => selectedSet.has(entity.entityId));

    if (deletedEntities.length === 0) {
      return;
    }

    const deletedSegmentIds = new Set(deletedEntities.map(({ entity }) => entity.segmentId));
    const deletedDoors = doors
      .map((door, index) => ({ door, index }))
      .filter(({ door }) => deletedSegmentIds.has(door.segmentId));
    const deletedDoorIds = new Set(deletedDoors.map(({ door }) => door.doorId));
    const action: HistoryAction =
      deletedEntities.length === 1
        ? { type: 'DELETE_WALL_SEGMENT', entity: deletedEntities[0].entity, index: deletedEntities[0].index, doors: deletedDoors }
        : { type: 'DELETE_SELECTED_WALL_SEGMENTS', entities: deletedEntities, doors: deletedDoors };

    pushHistoryAction(action);
    setEntities((current) => normalizeWallSegmentConnectivity(current.filter((entity) => !selectedSet.has(entity.entityId))));
    setDoors((current) => current.filter((door) => !deletedDoorIds.has(door.doorId)));
    setSelectedEntityIds([]);
    setSelectedDoorId(null);
  }, [doors, entities, pushHistoryAction, selectedDoorId, selectedEntityIds]);

  const applyHistoryUndo = useCallback((action: HistoryAction) => {
    if (action.type === 'CREATE_WALL_SEGMENT' || action.type === 'CREATE_POLYLINE_WALL_SEGMENT') {
      setEntities((current) => normalizeWallSegmentConnectivity(current.filter((entity) => entity.entityId !== action.entity.entityId)));
      setSelectedEntityIds([]);
      return;
    }

    if (action.type === 'DELETE_WALL_SEGMENT') {
      setEntities((current) => normalizeWallSegmentConnectivity(insertEntityAtIndex(current, action.entity, action.index)));
      setDoors((current) =>
        [...action.doors]
          .sort((a, b) => a.index - b.index)
          .reduce((next, item) => insertDoorAtIndex(next, item.door, item.index), current),
      );
      setSelectedEntityIds([action.entity.entityId]);
      setSelectedDoorId(null);
      return;
    }

    if (action.type === 'DELETE_SELECTED_WALL_SEGMENTS') {
      setEntities((current) =>
        normalizeWallSegmentConnectivity(
          [...action.entities]
            .sort((a, b) => a.index - b.index)
            .reduce((next, item) => insertEntityAtIndex(next, item.entity, item.index), current),
        ),
      );
      setDoors((current) =>
        [...action.doors]
          .sort((a, b) => a.index - b.index)
          .reduce((next, item) => insertDoorAtIndex(next, item.door, item.index), current),
      );
      setSelectedEntityIds(action.entities.map(({ entity }) => entity.entityId));
      setSelectedDoorId(null);
      return;
    }

    if (action.type === 'CREATE_DOOR') {
      setDoors((current) => current.filter((door) => door.doorId !== action.door.doorId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.beforeEntity.entityId ? action.beforeEntity : entity))));
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      return;
    }

    if (action.type === 'DELETE_DOOR') {
      setDoors((current) => insertDoorAtIndex(current, action.door, action.doorIndex));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.beforeEntity.entityId ? action.beforeEntity : entity))));
      setSelectedDoorId(action.door.doorId);
      setSelectedEntityIds([]);
      return;
    }

    if (action.type === 'MOVE_DOOR') {
      setDoors((current) => current.map((door) => (door.doorId === action.beforeDoor.doorId ? action.beforeDoor : door)));
      setSelectedDoorId(action.beforeDoor.doorId);
      setSelectedEntityIds([]);
      return;
    }

    const beforeById = new Map(action.beforeEntities.map((entity) => [entity.entityId, entity]));
    setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => beforeById.get(entity.entityId) ?? entity)));
    setDoors(action.beforeDoors);
    setSelectedEntityIds(action.beforeEntities.map((entity) => entity.entityId));
    setSelectedDoorId(null);
  }, []);

  const applyHistoryRedo = useCallback((action: HistoryAction) => {
    if (action.type === 'CREATE_WALL_SEGMENT' || action.type === 'CREATE_POLYLINE_WALL_SEGMENT') {
      setEntities((current) => normalizeWallSegmentConnectivity(insertEntityAtIndex(current, action.entity, action.index)));
      setSelectedEntityIds([action.entity.entityId]);
      return;
    }

    if (action.type === 'DELETE_WALL_SEGMENT') {
      const deletedDoorIds = new Set(action.doors.map(({ door }) => door.doorId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.filter((entity) => entity.entityId !== action.entity.entityId)));
      setDoors((current) => current.filter((door) => !deletedDoorIds.has(door.doorId)));
      setSelectedEntityIds([]);
      setSelectedDoorId(null);
      return;
    }

    if (action.type === 'DELETE_SELECTED_WALL_SEGMENTS') {
      const deletedEntityIds = new Set(action.entities.map(({ entity }) => entity.entityId));
      const deletedDoorIds = new Set(action.doors.map(({ door }) => door.doorId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.filter((entity) => !deletedEntityIds.has(entity.entityId))));
      setDoors((current) => current.filter((door) => !deletedDoorIds.has(door.doorId)));
      setSelectedEntityIds([]);
      setSelectedDoorId(null);
      return;
    }

    if (action.type === 'CREATE_DOOR') {
      setDoors((current) => insertDoorAtIndex(current, action.door, action.doorIndex));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.afterEntity.entityId ? action.afterEntity : entity))));
      setSelectedDoorId(action.door.doorId);
      setSelectedEntityIds([]);
      return;
    }

    if (action.type === 'DELETE_DOOR') {
      setDoors((current) => current.filter((door) => door.doorId !== action.door.doorId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.afterEntity.entityId ? action.afterEntity : entity))));
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      return;
    }

    if (action.type === 'MOVE_DOOR') {
      setDoors((current) => current.map((door) => (door.doorId === action.afterDoor.doorId ? action.afterDoor : door)));
      setSelectedDoorId(action.afterDoor.doorId);
      setSelectedEntityIds([]);
      return;
    }

    const afterById = new Map(action.afterEntities.map((entity) => [entity.entityId, entity]));
    setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => afterById.get(entity.entityId) ?? entity)));
    setDoors(action.afterDoors);
    setSelectedEntityIds(action.afterEntities.map((entity) => entity.entityId));
    setSelectedDoorId(null);
  }, []);

  const undoLastAction = useCallback(() => {
    const action = undoStack[undoStack.length - 1];

    if (!action) {
      return;
    }

    applyHistoryUndo(action);
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, action]);
    setLastUndoAction(action.type);
    setLastRedoAction('null');
    setLastActionType(`UNDO_${action.type}`);
  }, [applyHistoryUndo, undoStack]);

  const redoLastAction = useCallback(() => {
    const action = redoStack[redoStack.length - 1];

    if (!action) {
      return;
    }

    applyHistoryRedo(action);
    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, action]);
    setLastRedoAction(action.type);
    setLastUndoAction('null');
    setLastActionType(`REDO_${action.type}`);
  }, [applyHistoryRedo, redoStack]);

  const selectEntitiesInsideBox = useCallback(
    (startPoint: Point, endPoint: Point) => {
      const worldStart = screenToWorld(startPoint);
      const worldEnd = screenToWorld(endPoint);
      const worldRect = getNormalizedRect(worldStart, worldEnd);
      const nextSelectedIds = entities.filter((entity) => doesLineIntersectRect(entity, worldRect)).map((entity) => entity.entityId);

      setSelectedEntityIds(nextSelectedIds);
      setSelectionMode('box');
      setLastActionType(nextSelectedIds.length > 0 ? 'SELECTION_BOX_SELECT' : 'SELECTION_BOX_CLEAR');
      setLastInteractionType('selection-box');
    },
    [entities, screenToWorld],
  );

  const finishClick = useCallback(
    (screenPoint: Point) => {
      const rawWorldPoint = screenToWorld(screenPoint);
      const isDrawingTool = currentToolMode === 'line' || currentToolMode === 'polyline';
      const clickSnap = resolveCanvasV4Snap(entities, rawWorldPoint, endpointSnapThreshold, currentToolMode === 'line' ? lineStartPoint : currentToolMode === 'polyline' ? polylineLastPoint : null);
      setPointerWorldPoint(rawWorldPoint);

      if (currentToolMode === 'line') {
        setLastInteractionType('draw-line');

        if (!lineStartPoint) {
          setLineStartPoint(clickSnap.point);
          setSelectedEntityIds([]);
          setSelectedDoorId(null);
          setLastActionType('SET_LINE_START');
          return;
        }

        const endPoint = clickSnap.point;
        const entity = createWallSegment(lineStartPoint, endPoint, newSegmentType);
        pushHistoryAction({ type: 'CREATE_WALL_SEGMENT', entity, index: entities.length });
        setEntities((current) => normalizeWallSegmentConnectivity([...current, entity]));
        setLineStartPoint(null);
        setSelectedEntityIds([entity.entityId]);
        setSelectedDoorId(null);
        return;
      }

      if (currentToolMode === 'polyline') {
        setLastInteractionType('draw-polyline');

        if (!polylineLastPoint) {
          setPolylineLastPoint(clickSnap.point);
          setActivePolylineId(`polyline-${Date.now()}`);
          setSelectedEntityIds([]);
          setSelectedDoorId(null);
          setLastActionType('SET_POLYLINE_START');
          return;
        }

        const endPoint = clickSnap.point;
        const entity = createWallSegment(polylineLastPoint, endPoint, newSegmentType, activePolylineId ?? undefined);
        pushHistoryAction({ type: 'CREATE_POLYLINE_WALL_SEGMENT', entity, index: entities.length });
        setEntities((current) => normalizeWallSegmentConnectivity([...current, entity]));
        setPolylineLastPoint(endPoint);
        setSelectedEntityIds([entity.entityId]);
        setSelectedDoorId(null);
        return;
      }

      if (currentToolMode === 'door') {
        const target = findNearestSegmentProjection(rawWorldPoint);

        if (!target) {
          setLastActionType('DOOR_EMPTY_TAP');
          setLastInteractionType('tap-empty');
          return;
        }

        const door = createDoor(target.entity, target.positionOnSegment);
        const afterEntity = withDoorAttachedToSegment(target.entity, door.doorId);
        pushHistoryAction({ type: 'CREATE_DOOR', door, doorIndex: doors.length, beforeEntity: target.entity, afterEntity });
        setDoors((current) => [...current, door]);
        setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === afterEntity.entityId ? afterEntity : entity))));
        setSelectedEntityIds([]);
        setSelectedDoorId(door.doorId);
        setLastInteractionType('tap-select');
        return;
      }

      if (!isDrawingTool) {
        const hitDoorId = findDoorAtWorldPoint(rawWorldPoint);
        const hitEntityId = hitDoorId ? null : findEntityAtWorldPoint(rawWorldPoint);
        const now = Date.now();
        setHitTestTargetType(hitDoorId ? 'door-geometry' : hitEntityId && selectedEntityIds.includes(hitEntityId) ? 'selected-geometry' : hitEntityId ? 'wall-geometry' : 'empty-canvas');
        setLastHitTestEntityId(hitDoorId ?? hitEntityId);

        if (hitDoorId) {
          setSelectedDoorId(hitDoorId);
          setSelectedEntityIds([]);
          setSelectionMode('single');
          setLastActionType('SELECT_DOOR');
          setLastInteractionType('tap-select');
          lastTapRef.current = { time: now, point: screenPoint, wasEmpty: false };
          return;
        }

        if (hitEntityId) {
          setSelectedEntityIds([hitEntityId]);
          setSelectedDoorId(null);
          setSelectionMode('single');
          setLastActionType('SELECT_ENTITY');
          setLastInteractionType('tap-select');
          lastTapRef.current = { time: now, point: screenPoint, wasEmpty: false };
          return;
        }

        const previousTap = lastTapRef.current;
        const isDoubleTapEmpty =
          !!previousTap?.wasEmpty &&
          now - previousTap.time <= DOUBLE_TAP_DELAY_MS &&
          Math.hypot(screenPoint.x - previousTap.point.x, screenPoint.y - previousTap.point.y) <= DOUBLE_TAP_DISTANCE_PX;

        if (isDoubleTapEmpty) {
          setSelectedEntityIds([]);
          setSelectedDoorId(null);
          setSelectionMode('single');
          setLastActionType('DOUBLE_TAP_CLEAR_SELECTION');
          setLastInteractionType('double-tap-clear');
          lastTapRef.current = null;
          return;
        }

        setLastActionType('EMPTY_TAP_KEEP_SELECTION');
        setLastInteractionType('tap-empty');
        lastTapRef.current = { time: now, point: screenPoint, wasEmpty: true };
      }
    },
    [activePolylineId, currentToolMode, doors.length, endpointSnapThreshold, entities, findDoorAtWorldPoint, findEntityAtWorldPoint, findNearestSegmentProjection, lineStartPoint, newSegmentType, polylineLastPoint, pushHistoryAction, screenToWorld, selectedEntityIds],
  );

  const setToolMode = useCallback((mode: ToolMode) => {
    setCurrentToolMode(mode);
    setLineStartPoint(null);
    setPolylineLastPoint(null);
    setActivePolylineId(null);
    setPointerWorldPoint(null);
    setSelectionBox(null);
    setSelectedDoorId(null);
    setInteractionMode('idle');
    setIsPanningCanvas(false);
    setLastInteractionType('tool-change');
    setTransformMode('idle');
    setActiveHandleId(null);
    setIsResizing(false);
    setResizeAxis('none');
    setResizeScale({ x: 1, y: 1 });
    setLastActionType(`SET_TOOL_${mode.toUpperCase()}`);
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  }, []);

  const beginInteraction = useCallback(
    (screenPoint: Point, pointerId?: number) => {
      const rawWorldPoint = screenToWorld(screenPoint);
      const selectedSet = new Set(selectedEntityIds);
      const isNavigationSelectionMode = currentToolMode !== 'line' && currentToolMode !== 'polyline' && currentToolMode !== 'door';
      const hitDoorId = isNavigationSelectionMode ? findDoorAtWorldPoint(rawWorldPoint) : null;
      const transformHandle = isNavigationSelectionMode && !hitDoorId ? findTransformHandleAtScreenPoint(screenPoint) : null;
      const isLineResize = !!transformHandle && selectedEntities.length === 1;
      const isSelectionResize = !!transformHandle && selectedEntities.length > 1;
      const tolerance = HIT_TOLERANCE_PX / cameraZoom;
      const hitSelectedEntityId = isNavigationSelectionMode && !hitDoorId && !transformHandle
        ? [...selectedEntities].reverse().find((entity) => getDistanceToSegment(rawWorldPoint, entity.startPoint, entity.endPoint) <= tolerance)?.entityId ?? null
        : null;
      const hitEntityId = isNavigationSelectionMode && !hitDoorId && !transformHandle ? hitSelectedEntityId ?? findEntityAtWorldPoint(rawWorldPoint) : null;
      const shouldMoveDoor = isNavigationSelectionMode && !!hitDoorId && selectedDoorId === hitDoorId;
      const shouldMoveSelection = isNavigationSelectionMode && !!hitSelectedEntityId && selectedSet.has(hitSelectedEntityId);
      const hitTargetType: HitTestTargetType = transformHandle
        ? 'resize-handle'
        : hitDoorId
          ? 'door-geometry'
        : hitSelectedEntityId
          ? 'selected-geometry'
          : hitEntityId
            ? 'wall-geometry'
            : 'empty-canvas';
      const canStartSelectionBox = isNavigationSelectionMode && !transformHandle && !hitDoorId && !hitEntityId;
      const initialInteractionMode: InteractionMode = isLineResize
        ? 'resize-line'
        : isSelectionResize
          ? 'resize-selection'
          : shouldMoveDoor
            ? 'move-door'
          : shouldMoveSelection
            ? 'move-selection'
            : 'pan';
      const moveOriginalEntities = shouldMoveSelection ? selectedEntities : [];
      const resizeOriginalEntities = isLineResize || isSelectionResize ? selectedEntities : [];
      const resizeOriginalBoundingBox = isSelectionResize ? selectedBoundingBox : null;
      const resizeAnchorPoint = isSelectionResize && selectedBoundingBox && transformHandle ? getBoundingBoxAnchorPoint(selectedBoundingBox, transformHandle.id) : null;
      const resizeActivePoint = isSelectionResize && selectedBoundingBox && transformHandle ? getBoundingBoxHandlePoint(selectedBoundingBox, transformHandle.id) : null;

      dragSessionRef.current = {
        started: true,
        moved: false,
        pointerId: pointerId ?? null,
        interactionMode: initialInteractionMode,
        startX: screenPoint.x,
        startY: screenPoint.y,
        lastX: screenPoint.x,
        lastY: screenPoint.y,
        moveEntityIds: moveOriginalEntities.map((entity) => entity.entityId),
        moveOriginalEntities,
        moveDoorId: shouldMoveDoor ? hitDoorId : null,
        moveOriginalDoor: shouldMoveDoor ? doors.find((door) => door.doorId === hitDoorId) ?? null : null,
        resizeHandleId: transformHandle?.id ?? null,
        resizeAxis: transformHandle?.axis ?? 'none',
        resizeOriginalEntities,
        resizeOriginalBoundingBox,
        resizeAnchorPoint,
        resizeActivePoint,
        startTime: Date.now(),
        canStartSelectionBox,
        isPanningCanvas: false,
      };
      setPointerWorldPoint(rawWorldPoint);
      setHitTestTargetType(hitTargetType);
      setLastHitTestEntityId(hitDoorId ?? hitEntityId);
      setInteractionMode(initialInteractionMode);
      setIsPanningCanvas(false);
      setSelectionBox(null);
      setIsMovingSelection(false);
      setMoveDeltaMm({ x: 0, y: 0 });
      setTransformMode(isLineResize ? 'resize-line' : isSelectionResize ? 'resize-selection' : 'idle');
      setActiveHandleId(transformHandle?.id ?? null);
      setIsResizing(false);
      setResizeAxis(transformHandle?.axis ?? 'none');
      setResizeScale({ x: 1, y: 1 });
    },
    [cameraZoom, currentToolMode, doors, findDoorAtWorldPoint, findEntityAtWorldPoint, findTransformHandleAtScreenPoint, screenToWorld, selectedBoundingBox, selectedDoorId, selectedEntities, selectedEntityIds],
  );

  const moveInteraction = useCallback(
    (screenPoint: Point, pointerId?: number) => {
      const session = dragSessionRef.current;

      if (!session.started || (session.pointerId !== null && pointerId !== undefined && session.pointerId !== pointerId)) {
        return;
      }

      const deltaX = screenPoint.x - session.lastX;
      const deltaY = screenPoint.y - session.lastY;
      const totalDx = screenPoint.x - session.startX;
      const totalDy = screenPoint.y - session.startY;
      const moved = session.moved || Math.hypot(totalDx, totalDy) >= DRAG_THRESHOLD_PX;
      const shouldStartSelectionBox =
        moved &&
        session.canStartSelectionBox &&
        !session.isPanningCanvas &&
        Date.now() - session.startTime >= SELECTION_BOX_HOLD_DELAY_MS;
      const nextInteractionMode: InteractionMode = shouldStartSelectionBox ? 'selection-box' : session.interactionMode;

      dragSessionRef.current = {
        ...session,
        moved,
        interactionMode: nextInteractionMode,
        lastX: screenPoint.x,
        lastY: screenPoint.y,
        isPanningCanvas: session.isPanningCanvas || (moved && nextInteractionMode === 'pan'),
      };
      setPointerWorldPoint(screenToWorld(screenPoint));

      if (!moved) {
        return;
      }

      setInteractionMode(nextInteractionMode);

      if (nextInteractionMode === 'selection-box') {
        setSelectionBox({
          active: true,
          startPoint: { x: session.startX, y: session.startY },
          currentPoint: screenPoint,
        });
        setSelectionMode('box');
        setLastActionType('SELECTION_BOX_DRAG');
        setLastInteractionType('selection-box');
        return;
      }

      if (session.interactionMode === 'resize-line') {
        const originalEntity = session.resizeOriginalEntities[0];

        if (originalEntity && session.resizeHandleId) {
          const fixedPoint = session.resizeHandleId === 'single-start' ? originalEntity.endPoint : originalEntity.startPoint;
          const excludedTargetIds = new Set([
            `${originalEntity.entityId}:startPoint`,
            `${originalEntity.entityId}:endPoint`,
          ]);
          const resizeSnap = resolveCanvasV4Snap(entities, screenToWorld(screenPoint), endpointSnapThreshold, fixedPoint, excludedTargetIds);
          const resizedEntity = session.resizeHandleId === 'single-start'
            ? updateLineEntityGeometry(originalEntity, resizeSnap.point, originalEntity.endPoint)
            : updateLineEntityGeometry(originalEntity, originalEntity.startPoint, resizeSnap.point);

          setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === resizedEntity.entityId ? resizedEntity : entity))));
          setIsResizing(true);
          setTransformMode('resize-line');
          setResizeAxis('xy');
          setResizeScale({ x: 1, y: 1 });
          setLastActionType('RESIZE_WALL_SEGMENT_DRAG');
          setLastInteractionType('resize-line');
        }

        return;
      }

      if (session.interactionMode === 'resize-selection') {
        const anchorPoint = session.resizeAnchorPoint;
        const activePoint = session.resizeActivePoint;

        if (anchorPoint && activePoint && session.resizeHandleId) {
          const selectedTargetIds = new Set(
            session.resizeOriginalEntities.flatMap((entity) => [`${entity.entityId}:startPoint`, `${entity.entityId}:endPoint`]),
          );
          const resizeSnap = resolveCanvasV4Snap(entities, screenToWorld(screenPoint), endpointSnapThreshold, null, selectedTargetIds);
          const nextActivePoint = {
            x: session.resizeAxis === 'y' ? activePoint.x : resizeSnap.point.x,
            y: session.resizeAxis === 'x' ? activePoint.y : resizeSnap.point.y,
          };
          const originalWidth = activePoint.x - anchorPoint.x;
          const originalHeight = activePoint.y - anchorPoint.y;
          const scaleX = session.resizeAxis === 'y' || Math.abs(originalWidth) < 0.000001 ? 1 : (nextActivePoint.x - anchorPoint.x) / originalWidth;
          const scaleY = session.resizeAxis === 'x' || Math.abs(originalHeight) < 0.000001 ? 1 : (nextActivePoint.y - anchorPoint.y) / originalHeight;
          const resizedById = new Map(
            session.resizeOriginalEntities.map((entity) => [
              entity.entityId,
              updateLineEntityGeometry(
                entity,
                scalePointFromAnchor(entity.startPoint, anchorPoint, scaleX, scaleY),
                scalePointFromAnchor(entity.endPoint, anchorPoint, scaleX, scaleY),
              ),
            ]),
          );

          setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => resizedById.get(entity.entityId) ?? entity)));
          setIsResizing(true);
          setTransformMode('resize-selection');
          setResizeAxis(session.resizeAxis);
          setResizeScale({ x: scaleX, y: scaleY });
          setLastActionType('RESIZE_WALL_SELECTION_DRAG');
          setLastInteractionType('resize-selection');
        }

        return;
      }

      if (session.interactionMode === 'move-door' && session.moveOriginalDoor) {
        const segment = entities.find((entity) => entity.segmentId === session.moveOriginalDoor?.segmentId);

        if (segment) {
          const projection = projectPointToSegment(screenToWorld(screenPoint), segment);
          const movedDoor = {
            ...session.moveOriginalDoor,
            positionOnSegment: clampDoorPositionOnSegment(segment, projection.positionOnSegment, session.moveOriginalDoor.width),
          };

          setDoors((current) => current.map((door) => (door.doorId === movedDoor.doorId ? movedDoor : door)));
          setIsMovingSelection(true);
          setSelectionMode('move');
          setLastActionType('MOVE_DOOR_DRAG');
          setLastInteractionType('move-door');
        }

        return;
      }

      if (session.interactionMode === 'move-selection') {
        const moveDelta = { x: totalDx / cameraZoom, y: totalDy / cameraZoom };
        const movedById = new Map(session.moveOriginalEntities.map((entity) => [entity.entityId, moveLineEntity(entity, moveDelta)]));

        setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => movedById.get(entity.entityId) ?? entity)));
        setIsMovingSelection(true);
        setMoveDeltaMm(moveDelta);
        setSelectionMode('move');
        setLastActionType('MOVE_SELECTION_DRAG');
        setLastInteractionType('move-selection');
        return;
      }

      setPan((current) => ({ x: current.x + deltaX, y: current.y + deltaY }));
      setIsPanningCanvas(true);
      setLastActionType('PAN_CHANGE');
      setLastInteractionType('pan-canvas');
    },
    [cameraZoom, endpointSnapThreshold, entities, screenToWorld],
  );

  const endInteraction = useCallback(
    (screenPoint: Point, pointerId?: number) => {
      const session = dragSessionRef.current;

      if (!session.started || (session.pointerId !== null && pointerId !== undefined && session.pointerId !== pointerId)) {
        return;
      }

      setPointerWorldPoint(screenToWorld(screenPoint));

      if (session.interactionMode === 'resize-line' && session.moved) {
        const originalEntity = session.resizeOriginalEntities[0];

        if (originalEntity && session.resizeHandleId) {
          const fixedPoint = session.resizeHandleId === 'single-start' ? originalEntity.endPoint : originalEntity.startPoint;
          const excludedTargetIds = new Set([
            `${originalEntity.entityId}:startPoint`,
            `${originalEntity.entityId}:endPoint`,
          ]);
          const resizeSnap = resolveCanvasV4Snap(entities, screenToWorld(screenPoint), endpointSnapThreshold, fixedPoint, excludedTargetIds);
          const resizedEntity = session.resizeHandleId === 'single-start'
            ? updateLineEntityGeometry(originalEntity, resizeSnap.point, originalEntity.endPoint)
            : updateLineEntityGeometry(originalEntity, originalEntity.startPoint, resizeSnap.point);
          const geometryChanged =
            Math.hypot(resizedEntity.startPoint.x - originalEntity.startPoint.x, resizedEntity.startPoint.y - originalEntity.startPoint.y) > 0.000001 ||
            Math.hypot(resizedEntity.endPoint.x - originalEntity.endPoint.x, resizedEntity.endPoint.y - originalEntity.endPoint.y) > 0.000001;

          if (geometryChanged) {
            const afterDoors = clampDoorsToSegments(doors, entities.map((entity) => (entity.entityId === resizedEntity.entityId ? resizedEntity : entity)));
            pushHistoryAction({
              type: 'RESIZE_WALL_SEGMENT',
              beforeEntities: [originalEntity],
              afterEntities: [resizedEntity],
              beforeDoors: doors,
              afterDoors,
              handleId: session.resizeHandleId,
            });
            setDoors(afterDoors);
            setSelectedEntityIds([resizedEntity.entityId]);
            setSelectedDoorId(null);
          }
        }
      } else if (session.interactionMode === 'resize-selection' && session.moved) {
        const anchorPoint = session.resizeAnchorPoint;
        const activePoint = session.resizeActivePoint;

        if (anchorPoint && activePoint && session.resizeHandleId) {
          const selectedTargetIds = new Set(
            session.resizeOriginalEntities.flatMap((entity) => [`${entity.entityId}:startPoint`, `${entity.entityId}:endPoint`]),
          );
          const resizeSnap = resolveCanvasV4Snap(entities, screenToWorld(screenPoint), endpointSnapThreshold, null, selectedTargetIds);
          const nextActivePoint = {
            x: session.resizeAxis === 'y' ? activePoint.x : resizeSnap.point.x,
            y: session.resizeAxis === 'x' ? activePoint.y : resizeSnap.point.y,
          };
          const originalWidth = activePoint.x - anchorPoint.x;
          const originalHeight = activePoint.y - anchorPoint.y;
          const scaleX = session.resizeAxis === 'y' || Math.abs(originalWidth) < 0.000001 ? 1 : (nextActivePoint.x - anchorPoint.x) / originalWidth;
          const scaleY = session.resizeAxis === 'x' || Math.abs(originalHeight) < 0.000001 ? 1 : (nextActivePoint.y - anchorPoint.y) / originalHeight;
          const afterEntities = session.resizeOriginalEntities.map((entity) =>
            updateLineEntityGeometry(
              entity,
              scalePointFromAnchor(entity.startPoint, anchorPoint, scaleX, scaleY),
              scalePointFromAnchor(entity.endPoint, anchorPoint, scaleX, scaleY),
            ),
          );
          const geometryChanged = afterEntities.some((entity, index) => {
            const before = session.resizeOriginalEntities[index];
            return (
              Math.hypot(entity.startPoint.x - before.startPoint.x, entity.startPoint.y - before.startPoint.y) > 0.000001 ||
              Math.hypot(entity.endPoint.x - before.endPoint.x, entity.endPoint.y - before.endPoint.y) > 0.000001
            );
          });

          if (geometryChanged) {
            const afterById = new Map(afterEntities.map((entity) => [entity.entityId, entity]));
            const nextEntities = entities.map((entity) => afterById.get(entity.entityId) ?? entity);
            const afterDoors = clampDoorsToSegments(doors, nextEntities);
            pushHistoryAction({
              type: 'RESIZE_WALL_SELECTION',
              beforeEntities: session.resizeOriginalEntities,
              afterEntities,
              beforeDoors: doors,
              afterDoors,
              handleId: session.resizeHandleId,
              scaleX,
              scaleY,
            });
            setDoors(afterDoors);
            setSelectedEntityIds(afterEntities.map((entity) => entity.entityId));
            setSelectedDoorId(null);
            setResizeScale({ x: scaleX, y: scaleY });
          }
        }
      } else if (session.interactionMode === 'move-door' && session.moved && session.moveOriginalDoor) {
        const segment = entities.find((entity) => entity.segmentId === session.moveOriginalDoor?.segmentId);

        if (segment) {
          const projection = projectPointToSegment(screenToWorld(screenPoint), segment);
          const afterDoor = {
            ...session.moveOriginalDoor,
            positionOnSegment: clampDoorPositionOnSegment(segment, projection.positionOnSegment, session.moveOriginalDoor.width),
          };
          const movedDistance = Math.abs(afterDoor.positionOnSegment - session.moveOriginalDoor.positionOnSegment);

          if (movedDistance > 0.000001) {
            pushHistoryAction({ type: 'MOVE_DOOR', beforeDoor: session.moveOriginalDoor, afterDoor });
            setSelectedDoorId(afterDoor.doorId);
            setSelectedEntityIds([]);
            setLastMoveAction('MOVE_DOOR');
          }
        }
      } else if (session.interactionMode === 'move-selection' && session.moved) {
        const moveDelta = { x: (screenPoint.x - session.startX) / cameraZoom, y: (screenPoint.y - session.startY) / cameraZoom };
        const afterEntities = session.moveOriginalEntities.map((entity) => moveLineEntity(entity, moveDelta));

        if (afterEntities.length > 0 && Math.hypot(moveDelta.x, moveDelta.y) > 0.000001) {
          pushHistoryAction({
            type: 'MOVE_SELECTED_WALL_SEGMENTS',
            beforeEntities: session.moveOriginalEntities,
            afterEntities,
            beforeDoors: doors,
            afterDoors: doors,
            delta: moveDelta,
          });
          setSelectedEntityIds(afterEntities.map((entity) => entity.entityId));
          setLastMoveAction('MOVE_SELECTED_WALL_SEGMENTS');
        }
      } else if (session.interactionMode === 'selection-box' && session.moved) {
        selectEntitiesInsideBox({ x: session.startX, y: session.startY }, screenPoint);
      } else if (!session.moved) {
        finishClick(screenPoint);
      }

      setSelectionBox(null);
      setInteractionMode('idle');
      setIsPanningCanvas(false);
      setIsMovingSelection(false);
      setIsResizing(false);
      setTransformMode('idle');
      setActiveHandleId(null);
      setResizeAxis('none');
      dragSessionRef.current = EMPTY_DRAG_SESSION;
    },
    [cameraZoom, doors, endpointSnapThreshold, entities, finishClick, pushHistoryAction, screenToWorld, selectEntitiesInsideBox],
  );

  const responderHandlers = useMemo(
    () => ({
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: (event: any) => beginInteraction(getScreenPoint(event.nativeEvent), event.nativeEvent.pointerId),
      onResponderMove: (event: any) => moveInteraction(getScreenPoint(event.nativeEvent), event.nativeEvent.pointerId),
      onResponderRelease: (event: any) => endInteraction(getScreenPoint(event.nativeEvent), event.nativeEvent.pointerId),
      onResponderTerminate: (event: any) => endInteraction(getScreenPoint(event.nativeEvent), event.nativeEvent.pointerId),
      onResponderTerminationRequest: () => false,
    }),
    [beginInteraction, endInteraction, moveInteraction],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const canvasNode = canvasRef.current as unknown as { addEventListener?: Function; removeEventListener?: Function } | null;

    if (!canvasNode?.addEventListener) {
      return undefined;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      applyZoom(event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setPointerWorldPoint(screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }));
    };

    canvasNode.addEventListener('wheel', onWheel, { passive: false });
    canvasNode.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      canvasNode.removeEventListener?.('wheel', onWheel);
      canvasNode.removeEventListener?.('pointermove', onPointerMove);
    };
  }, [applyZoom, screenToWorld]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelectedEntities();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redoLastAction();
        } else {
          undoLastAction();
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redoLastAction();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelectedEntities, redoLastAction, undoLastAction]);

  const activeLineDelta = previewLine ? { x: previewLine.endPoint.x - previewLine.startPoint.x, y: previewLine.endPoint.y - previewLine.startPoint.y } : null;
  const previewLineLength = previewLine?.length ?? null;
  const previewGeometry = previewLine ? getLineScreenGeometry(previewLine.startPoint, previewLine.endPoint) : null;
  const previewDimensionLabelPlacement = previewGeometry ? getPreviewDimensionLabelPlacement(previewGeometry) : null;
  const selectedDimensionLabelPlacement = selectedEntities.length === 1
    ? getEntityDimensionLabelPlacement(selectedEntities[0], getLineScreenGeometry(selectedEntities[0].startPoint, selectedEntities[0].endPoint))
    : null;
  const inspectedDimensionLabelPlacement = selectedDimensionLabelPlacement ?? previewDimensionLabelPlacement;

  const inspectorLines = useMemo(
    () => [
      `currentToolMode: ${currentToolMode}`,
      `interactionMode: ${interactionMode}`,
      `isPanningCanvas: ${isPanningCanvas ? 'true' : 'false'}`,
      `isDraggingSelection: ${isMovingSelection ? 'true' : 'false'}`,
      `isSelectionBoxActive: ${selectionBox?.active ? 'true' : 'false'}`,
      `lastInteractionType: ${lastInteractionType}`,
      `showLineDimensions: ${showLineDimensions ? 'true' : 'false'}`,
      'dimensionLabelsInteractive: false',
      `hitTestTargetType: ${hitTestTargetType}`,
      `lastHitTestEntityId: ${lastHitTestEntityId ?? 'null'}`,
      'compassVisible: true',
      'compassMode: visual-only',
      `entitiesCount: ${entities.length}`,
      `doorsCount: ${doors.length}`,
      `selectedDoorId: ${selectedDoor?.doorId ?? 'null'}`,
      `activeDoorSegmentId: ${selectedDoor?.segmentId ?? 'null'}`,
      `doorPositionOnSegment: ${selectedDoor ? `${selectedDoor.positionOnSegment.toFixed(0)} mm` : 'null'}`,
      `doorWidth: ${selectedDoor ? `${selectedDoor.width} mm` : `${DEFAULT_DOOR_WIDTH_MM} mm (default)`}`,
      `selectedEntityIds: [${selectedEntityIds.join(', ') || 'empty'}]`,
      `selectedSegmentId: ${selectedSegment?.segmentId ?? 'null'}`,
      `selectedSegmentType: ${selectedSegment?.segmentType ?? newSegmentType}`,
      `segmentType: ${selectedSegment?.segmentType ?? newSegmentType}`,
      `wallAlignmentMode: ${selectedSegment?.wallAlignmentMode ?? getWallAlignmentMode(newSegmentType)}`,
      `wallThicknessVisual: ${WALL_THICKNESS_VISUAL ? 'true' : 'false'}`,
      `wallThicknessFrozen: ${WALL_THICKNESS_FROZEN ? 'true' : 'false'}`,
      `wallThickness: ${selectedSegment ? `${selectedSegment.wallThickness} mm` : `${DEFAULT_WALL_THICKNESS_MM} mm (default)`}`,
      `cornerJoinMode: ${selectedSegment?.cornerJoinMode ?? DEFAULT_CORNER_JOIN_MODE}`,
      `connectedSegmentIds: [${selectedSegment?.connectedSegmentIds.join(', ') || 'empty'}]`,
      `segmentLength: ${selectedSegment ? formatLineLength(selectedSegment.length) : 'null'}`,
      `segmentAngle: ${selectedSegment ? `${formatAngle(selectedSegment.angle).toFixed(0)}°` : 'null'}`,
      `doorIds: [${selectedSegment?.doorIds.join(', ') || 'empty'}]`,
      `windowIds: [${selectedSegment?.windowIds.join(', ') || 'empty'}]`,
      `selectedCount: ${selectedEntityIds.length + (selectedDoor ? 1 : 0)}`,
      `transformMode: ${transformMode}`,
      `selectedBoundingBox: ${selectedBoundingBox ? `(${selectedBoundingBox.minX.toFixed(0)}, ${selectedBoundingBox.minY.toFixed(0)}) - (${selectedBoundingBox.maxX.toFixed(0)}, ${selectedBoundingBox.maxY.toFixed(0)})` : 'null'}`,
      `activeHandleId: ${activeHandleId ?? 'null'}`,
      `isResizing: ${isResizing ? 'true' : 'false'}`,
      `resizeAxis: ${resizeAxis}`,
      `resizeScaleX: ${resizeScale.x.toFixed(3)}`,
      `resizeScaleY: ${resizeScale.y.toFixed(3)}`,
      `isMovingSelection: ${isMovingSelection ? 'true' : 'false'}`,
      `moveDeltaMm: (${moveDeltaMm.x.toFixed(1)}, ${moveDeltaMm.y.toFixed(1)})`,
      `lastMoveAction: ${lastMoveAction}`,
      `selectionMode: ${selectionMode}`,
      `undoStackSize: ${undoStack.length}`,
      `redoStackSize: ${redoStack.length}`,
      `lastUndoAction: ${lastUndoAction}`,
      `lastRedoAction: ${lastRedoAction}`,
      `selectionBoxActive: ${selectionBox?.active ? 'true' : 'false'}`,
      `lastActionType: ${lastActionType}`,
      `cameraZoom: ${cameraZoom.toFixed(3)}`,
      `displayZoom: ${((cameraZoom / DEFAULT_ZOOM) * 100).toFixed(0)}%`,
      `pan: (${pan.x.toFixed(1)}, ${pan.y.toFixed(1)})`,
      `gridStepMm: ${GRID_STEP_MM}`,
      `snapPriority: ${SNAP_PRIORITY_LABEL}`,
      `activeSnapType: ${activeSnap.activeSnapType}`,
      `activeSnapTargetId: ${activeSnap.activeSnapTargetId ?? 'null'}`,
      `activeSnapDistance: ${activeSnap.activeSnapDistance === null ? 'null' : `${activeSnap.activeSnapDistance.toFixed(0)} mm`}`,
      `gridSnappedEndPoint: ${activeSnap.gridSnappedEndPoint ? `(${activeSnap.gridSnappedEndPoint.x.toFixed(0)}, ${activeSnap.gridSnappedEndPoint.y.toFixed(0)})` : 'null'}`,
      `angleHelperActive: ${activeSnap.angleHelperActive ? 'true' : 'false'}`,
      `isDrawingLine: ${lineStartPoint || polylineLastPoint ? 'true' : 'false'}`,
      `lineDeltaX: ${activeLineDelta ? `${activeLineDelta.x.toFixed(0)} mm` : 'null'}`,
      `lineDeltaY: ${activeLineDelta ? `${activeLineDelta.y.toFixed(0)} mm` : 'null'}`,
      `lineAngle: ${previewLine ? `${formatAngle(previewLine.angle).toFixed(0)}°` : 'null'}`,
      `previewLineAngle: ${previewLine ? `${formatAngle(previewLine.angle).toFixed(0)}°` : 'null'}`,
      `previewLineLength: ${previewLineLength === null ? 'null' : formatLineLength(previewLineLength)}`,
      `selectedLineLength: ${selectedLineLength === null ? 'null' : formatLineLength(selectedLineLength)}`,
      `dimensionLabelRotation: ${inspectedDimensionLabelPlacement ? `${inspectedDimensionLabelPlacement.rotationDeg.toFixed(0)}°` : 'null'}`,
      `dimensionLabelOffset: ${inspectedDimensionLabelPlacement ? `${inspectedDimensionLabelPlacement.offsetPx.toFixed(0)} px` : 'null'}`,
      `dimensionLabelPlacementMode: ${inspectedDimensionLabelPlacement?.placementMode ?? 'null'}`,
    ],
    [
      activeHandleId,
      activeLineDelta,
      activeSnap.activeSnapDistance,
      activeSnap.activeSnapTargetId,
      activeSnap.activeSnapType,
      activeSnap.angleHelperActive,
      activeSnap.gridSnappedEndPoint,
      cameraZoom,
      currentToolMode,
      newSegmentType,
      showLineDimensions,
      doors.length,
      entities.length,
      lastActionType,
      lastRedoAction,
      lastUndoAction,
      inspectedDimensionLabelPlacement,
      hitTestTargetType,
      interactionMode,
      isPanningCanvas,
      isMovingSelection,
      lastInteractionType,
      lastHitTestEntityId,
      lastMoveAction,
      lineStartPoint,
      moveDeltaMm.x,
      moveDeltaMm.y,
      pan.x,
      pan.y,
      polylineLastPoint,
      previewLine,
      previewLineLength,
      redoStack.length,
      resizeAxis,
      resizeScale.x,
      resizeScale.y,
      selectedBoundingBox,
      selectedLineLength,
      selectedDoor,
      selectedEntityIds,
      selectedSegment,
      selectionBox?.active,
      selectionMode,
      transformMode,
      undoStack.length,
      isResizing,
    ],
  );

  const canvasHeight = Math.max(Math.min(windowHeight * 0.62, 720), 420);
  const endpointSnapScreenPoint = activeSnap.activeSnapType === 'endpoint' ? worldToScreen(activeSnap.point) : null;
  const selectedEntityIdSet = new Set(selectedEntityIds);
  const selectedBoundingBoxScreenRect = selectedEntities.length > 1 && selectedBoundingBox
    ? getNormalizedRect(worldToScreen({ x: selectedBoundingBox.minX, y: selectedBoundingBox.minY }), worldToScreen({ x: selectedBoundingBox.maxX, y: selectedBoundingBox.maxY }))
    : null;
  const selectionBoxRect = selectionBox?.active ? getNormalizedRect(selectionBox.startPoint, selectionBox.currentPoint) : null;

  return (
    <View style={styles.root}>
      <AppHeader title="Canvas V4 — CAD-lite" />

      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
        <View style={styles.controlsRow}>
          <Pressable style={styles.controlButton} onPress={() => applyZoom(ZOOM_OUT_FACTOR)}>
            <Text style={styles.controlButtonText}>Масштаб -</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={() => applyZoom(ZOOM_IN_FACTOR)}>
            <Text style={styles.controlButtonText}>Масштаб +</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, styles.resetButton]} onPress={resetView}>
            <Text style={styles.controlButtonText}>Сброс вида</Text>
            <Text style={styles.controlButtonSubtext}>{((cameraZoom / DEFAULT_ZOOM) * 100).toFixed(0)}%</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, !isGridVisible ? styles.controlButtonActive : null]} onPress={() => setGridVisible((current) => !current)}>
            <Text style={styles.controlButtonText}>{isGridVisible ? 'Скрыть сетку' : 'Показать сетку'}</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, showLineDimensions ? styles.controlButtonActive : null]} onPress={() => setShowLineDimensions((current) => !current)}>
            <Text style={styles.controlButtonText}>{showLineDimensions ? 'Скрыть размеры' : 'Показать размеры'}</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, isInspectorVisible ? styles.controlButtonActive : null]} onPress={() => setInspectorVisible((current) => !current)}>
            <Text style={styles.controlButtonText}>{isInspectorVisible ? 'Скрыть инспектор' : 'Инспектор'}</Text>
          </Pressable>
        </View>

        <View style={styles.toolRow}>
          {(['select', 'line', 'polyline', 'door'] as ToolMode[]).map((mode) => (
            <Pressable key={mode} style={[styles.toolButton, currentToolMode === mode ? styles.toolButtonActive : null]} onPress={() => setToolMode(mode)}>
              <Text style={[styles.toolButtonText, currentToolMode === mode ? styles.toolButtonTextActive : null]}>
                {mode === 'line' ? 'Сегмент стены' : mode === 'polyline' ? 'Стены' : mode === 'door' ? 'Дверь' : 'Выбор'}
              </Text>
            </Pressable>
          ))}
          {(['internal', 'external'] as WallSegmentType[]).map((segmentType) => (
            <Pressable key={segmentType} style={[styles.toolButton, newSegmentType === segmentType ? styles.segmentTypeButtonActive : null]} onPress={() => setNewSegmentType(segmentType)}>
              <Text style={[styles.toolButtonText, newSegmentType === segmentType ? styles.segmentTypeButtonTextActive : null]}>
                {segmentType === 'internal' ? 'Перегородка' : 'Наружная'}
              </Text>
            </Pressable>
          ))}
          <Pressable style={[styles.toolButton, selectedEntityIds.length > 0 || selectedDoorId ? styles.dangerButton : styles.toolButtonDisabled]} onPress={deleteSelectedEntities} disabled={selectedEntityIds.length === 0 && !selectedDoorId}>
            <Text style={[styles.toolButtonText, selectedEntityIds.length > 0 || selectedDoorId ? styles.dangerButtonText : styles.toolButtonDisabledText]}>Удалить</Text>
          </Pressable>
          <Pressable style={[styles.toolButton, undoStack.length > 0 ? styles.undoButton : styles.toolButtonDisabled]} onPress={undoLastAction} disabled={undoStack.length === 0}>
            <Text style={[styles.toolButtonText, undoStack.length > 0 ? styles.undoButtonText : styles.toolButtonDisabledText]}>↶ Отменить</Text>
          </Pressable>
          <Pressable style={[styles.toolButton, redoStack.length > 0 ? styles.undoButton : styles.toolButtonDisabled]} onPress={redoLastAction} disabled={redoStack.length === 0}>
            <Text style={[styles.toolButtonText, redoStack.length > 0 ? styles.undoButtonText : styles.toolButtonDisabledText]}>↷ Повторить</Text>
          </Pressable>
        </View>

        <View style={styles.canvasShell}>
          <View ref={canvasRef} style={[styles.canvasArea, { height: canvasHeight }]} onLayout={onLayout} {...responderHandlers}>
            {gridLines.map((line) => (
              <View
                key={line.id}
                pointerEvents="none"
                style={[
                  line.isMajor ? styles.gridLineMajor : styles.gridLine,
                  line.axis === 'y'
                    ? { left: line.position, top: 0, width: 1, height: viewport.height }
                    : { top: line.position, left: 0, height: 1, width: viewport.width },
                ]}
              />
            ))}

            <View pointerEvents="none" style={[styles.axisLine, { left: worldToScreen({ x: 0, y: 0 }).x, top: 0, height: viewport.height, width: 1 }]} />
            <View pointerEvents="none" style={[styles.axisLine, { top: worldToScreen({ x: 0, y: 0 }).y, left: 0, width: viewport.width, height: 1 }]} />

            {entities.map((entity) => {
              const geometry = getLineScreenGeometry(entity.startPoint, entity.endPoint);
              const dimensionLabelPlacement = getEntityDimensionLabelPlacement(entity, geometry);
              const isSelected = selectedEntityIdSet.has(entity.entityId);

              return (
                <React.Fragment key={entity.entityId}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.wallSegmentCenterLine,
                      entity.segmentType === 'external' ? styles.externalWallLine : styles.internalWallLine,
                      isSelected ? styles.wallSegmentCenterLineSelected : null,
                      {
                        width: Math.max(geometry.length, 1),
                        left: geometry.centerX - geometry.length / 2,
                        top: geometry.centerY - 1,
                        transform: [{ rotate: `${geometry.angleDeg}deg` }],
                      },
                    ]}
                  />
                  {showLineDimensions ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.dimensionLabel,
                        {
                          left: dimensionLabelPlacement.left,
                          top: dimensionLabelPlacement.top,
                          transform: [{ rotate: `${dimensionLabelPlacement.rotationDeg}deg` }],
                        },
                      ]}
                    >
                      <Text style={styles.dimensionLabelText}>{formatLineLength(entity.length)}</Text>
                    </View>
                  ) : null}
                </React.Fragment>
              );
            })}

            {doors.map((door) => {
              const segment = entities.find((entity) => entity.segmentId === door.segmentId);

              if (!segment) {
                return null;
              }

              const center = getPointOnSegmentAtDistance(segment, door.positionOnSegment);
              const screenCenter = worldToScreen(center);
              const segmentGeometry = getLineScreenGeometry(segment.startPoint, segment.endPoint);
              const widthPx = Math.max(door.width * cameraZoom, 18);
              const leafPx = Math.max(DOOR_LEAF_DEPTH_MM * cameraZoom, 28);
              const halfWidthPx = widthPx / 2;
              const angleRad = (segmentGeometry.angleDeg * Math.PI) / 180;
              const unit = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
              const normal = { x: unit.y, y: -unit.x };
              const hingePoint = { x: screenCenter.x - unit.x * halfWidthPx, y: screenCenter.y - unit.y * halfWidthPx };
              const leafCenter = { x: hingePoint.x + normal.x * leafPx / 2, y: hingePoint.y + normal.y * leafPx / 2 };
              const isSelected = selectedDoorId === door.doorId;

              return (
                <React.Fragment key={door.doorId}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.doorWallBreakOverlay,
                      {
                        width: widthPx,
                        left: screenCenter.x - halfWidthPx,
                        top: screenCenter.y - 3,
                        transform: [{ rotate: `${segmentGeometry.angleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.doorLeafLine,
                      isSelected ? styles.doorElementSelected : null,
                      {
                        width: leafPx,
                        left: leafCenter.x - leafPx / 2,
                        top: leafCenter.y - 1,
                        transform: [{ rotate: `${segmentGeometry.angleDeg - 90}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.doorSwingArc,
                      isSelected ? styles.doorElementSelected : null,
                      {
                        width: leafPx,
                        height: leafPx,
                        left: hingePoint.x,
                        top: hingePoint.y - leafPx,
                        transform: [{ rotate: `${segmentGeometry.angleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.doorHingeMarker,
                      isSelected ? styles.doorHingeMarkerSelected : null,
                      { left: hingePoint.x - 4, top: hingePoint.y - 4 },
                    ]}
                  />
                </React.Fragment>
              );
            })}

            {previewLine && previewGeometry ? (
              <React.Fragment>
                <View
                  pointerEvents="none"
                  style={[
                    styles.previewWallSegment,
                    newSegmentType === 'external' ? styles.externalWallLine : styles.internalWallLine,
                    {
                      width: Math.max(previewGeometry.length, 1),
                      left: previewGeometry.centerX - previewGeometry.length / 2,
                      top: previewGeometry.centerY - 1,
                      transform: [{ rotate: `${previewGeometry.angleDeg}deg` }],
                    },
                  ]}
                />
                {showLineDimensions && previewDimensionLabelPlacement ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dimensionLabel,
                      styles.previewDimensionLabel,
                      {
                        left: previewDimensionLabelPlacement.left,
                        top: previewDimensionLabelPlacement.top,
                        transform: [{ rotate: `${previewDimensionLabelPlacement.rotationDeg}deg` }],
                      },
                    ]}
                  >
                    <Text style={[styles.dimensionLabelText, styles.previewDimensionLabelText]}>{formatLineLength(previewLine.length)}</Text>
                  </View>
                ) : null}
              </React.Fragment>
            ) : null}

            {lineStartPoint ? <View pointerEvents="none" style={[styles.anchorPoint, { left: worldToScreen(lineStartPoint).x - 5, top: worldToScreen(lineStartPoint).y - 5 }]} /> : null}
            {polylineLastPoint ? <View pointerEvents="none" style={[styles.anchorPoint, styles.polylineAnchor, { left: worldToScreen(polylineLastPoint).x - 5, top: worldToScreen(polylineLastPoint).y - 5 }]} /> : null}
            {endpointSnapScreenPoint ? <View pointerEvents="none" style={[styles.endpointSnapMarker, { left: endpointSnapScreenPoint.x - 8, top: endpointSnapScreenPoint.y - 8 }]} /> : null}

            {selectedBoundingBoxScreenRect ? (
              <View
                pointerEvents="none"
                style={[
                  styles.transformBoundingBox,
                  {
                    left: selectedBoundingBoxScreenRect.minX,
                    top: selectedBoundingBoxScreenRect.minY,
                    width: Math.max(selectedBoundingBoxScreenRect.maxX - selectedBoundingBoxScreenRect.minX, 1),
                    height: Math.max(selectedBoundingBoxScreenRect.maxY - selectedBoundingBoxScreenRect.minY, 1),
                  },
                ]}
              />
            ) : null}

            {transformHandles.map((handle) => {
              const handleScreenPoint = worldToScreen(handle.point);
              return (
                <View
                  key={handle.id}
                  pointerEvents="none"
                  style={[
                    styles.transformHandle,
                    handle.id.startsWith('single') ? styles.lineEndpointHandle : null,
                    activeHandleId === handle.id ? styles.transformHandleActive : null,
                    {
                      left: handleScreenPoint.x - TRANSFORM_HANDLE_SIZE_PX / 2,
                      top: handleScreenPoint.y - TRANSFORM_HANDLE_SIZE_PX / 2,
                    },
                  ]}
                />
              );
            })}

            {selectionBoxRect ? (
              <View
                pointerEvents="none"
                style={[
                  styles.selectionBox,
                  {
                    left: selectionBoxRect.minX,
                    top: selectionBoxRect.minY,
                    width: Math.max(selectionBoxRect.maxX - selectionBoxRect.minX, 1),
                    height: Math.max(selectionBoxRect.maxY - selectionBoxRect.minY, 1),
                  },
                ]}
              />
            ) : null}

            <View style={styles.compassOverlay} pointerEvents="none">
              <Text style={[styles.compassLabel, styles.compassNorth]}>С</Text>
              <Text style={[styles.compassLabel, styles.compassSouth]}>Ю</Text>
              <Text style={[styles.compassLabel, styles.compassWest]}>З</Text>
              <Text style={[styles.compassLabel, styles.compassEast]}>В</Text>
              <View style={styles.compassVerticalAxis} />
              <View style={styles.compassHorizontalAxis} />
              <View style={styles.compassNeedle} />
            </View>

            {isInspectorVisible ? (
              <View style={styles.inspectorPanel} pointerEvents="none">
                <Text style={styles.inspectorTitle}>Dev-инспектор</Text>
                {inspectorLines.map((line) => (
                  <Text key={line} style={styles.inspectorLine}>{line}</Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.metaPanel}>
          <Text style={styles.metaTitle}>Canvas V4 CAD-lite: стены</Text>
          <Text style={styles.metaText}>Чистая dev-сцена с базовыми WallSegment, endpoint connectivity и будущими door/window attachment ids — без Room Engine, Surface Scene, split, wall graph и SmetMaster logic. ЛКМ/тап — действие инструмента, перетаскивание — панорамирование, колесо/кнопки — зум.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF3FA',
  },
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    padding: 16,
    gap: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  controlButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  controlButtonSubtext: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  resetButton: {
    minWidth: 112,
  },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E0EF',
  },
  toolButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#2563EB',
  },
  toolButtonText: {
    color: '#334155',
    fontWeight: '800',
  },
  toolButtonTextActive: {
    color: '#FFFFFF',
  },
  segmentTypeButtonActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#E0F2FE',
  },
  segmentTypeButtonTextActive: {
    color: '#0369A1',
  },
  dangerButton: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEE2E2',
  },
  dangerButtonText: {
    color: '#B91C1C',
  },
  undoButton: {
    borderColor: '#93C5FD',
    backgroundColor: '#DBEAFE',
  },
  undoButtonText: {
    color: '#1D4ED8',
  },
  toolButtonDisabled: {
    opacity: 0.5,
  },
  toolButtonDisabledText: {
    color: '#94A3B8',
  },
  canvasShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  canvasArea: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2F4',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
  },
  gridLineMajor: {
    position: 'absolute',
    backgroundColor: 'rgba(100, 116, 139, 0.34)',
  },
  axisLine: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  wallSegmentBody: {
    position: 'absolute',
    borderRadius: 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  internalWallSegment: {
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    borderColor: '#0F172A',
  },
  externalWallSegment: {
    backgroundColor: 'rgba(3, 105, 161, 0.22)',
    borderColor: '#0369A1',
  },
  internalWallLine: {
    backgroundColor: '#0F172A',
  },
  externalWallLine: {
    backgroundColor: '#0369A1',
  },
  wallCornerJoin: {
    position: 'absolute',
    borderRadius: 2,
    borderWidth: 1,
  },
  wallSegmentSelected: {
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  wallSegmentCenterLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  wallSegmentCenterLineSelected: {
    backgroundColor: '#F97316',
  },
  previewWallSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    opacity: 0.72,
  },
  doorWallBreakOverlay: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.35)',
  },
  doorLeafLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#2563EB',
  },
  doorSwingArc: {
    position: 'absolute',
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 999,
    borderColor: '#2563EB',
    opacity: 0.85,
  },
  doorElementSelected: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  doorHingeMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#EFF6FF',
  },
  doorHingeMarkerSelected: {
    backgroundColor: '#F97316',
  },
  dimensionLabel: {
    position: 'absolute',
    width: LINE_DIMENSION_LABEL_WIDTH_PX,
    minWidth: LINE_DIMENSION_LABEL_WIDTH_PX,
    minHeight: LINE_DIMENSION_LABEL_HEIGHT_PX,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.55)',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dimensionLabelSelected: {
    backgroundColor: 'rgba(255, 247, 237, 0.96)',
    borderColor: '#FB923C',
  },
  previewDimensionLabel: {
    backgroundColor: 'rgba(240, 253, 244, 0.96)',
    borderColor: '#22C55E',
  },
  dimensionLabelText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
  },
  dimensionLabelTextSelected: {
    color: '#C2410C',
  },
  previewDimensionLabelText: {
    color: '#15803D',
  },
  anchorPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  polylineAnchor: {
    backgroundColor: '#0EA5E9',
  },
  endpointSnapMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FACC15',
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    shadowColor: '#FACC15',
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  selectionBox: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  transformBoundingBox: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
  },
  transformHandle: {
    position: 'absolute',
    width: TRANSFORM_HANDLE_SIZE_PX,
    height: TRANSFORM_HANDLE_SIZE_PX,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#2563EB',
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  lineEndpointHandle: {
    borderRadius: TRANSFORM_HANDLE_SIZE_PX / 2,
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
  },
  transformHandleActive: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
  },
  compassOverlay: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.28)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  compassLabel: {
    position: 'absolute',
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  compassNorth: {
    top: 5,
    left: 0,
    right: 0,
  },
  compassSouth: {
    bottom: 5,
    left: 0,
    right: 0,
  },
  compassWest: {
    left: 8,
    top: 27,
  },
  compassEast: {
    right: 8,
    top: 27,
  },
  compassVerticalAxis: {
    position: 'absolute',
    left: 35,
    top: 18,
    width: 2,
    height: 36,
    borderRadius: 2,
    backgroundColor: 'rgba(37, 99, 235, 0.42)',
  },
  compassHorizontalAxis: {
    position: 'absolute',
    left: 18,
    top: 35,
    width: 36,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
  },
  compassNeedle: {
    position: 'absolute',
    left: 31,
    top: 17,
    width: 10,
    height: 22,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: '#2563EB',
  },
  inspectorPanel: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 280,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
  },
  inspectorTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  inspectorLine: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metaPanel: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E0EF',
  },
  metaTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  metaText: {
    color: '#475569',
    lineHeight: 20,
  },
});
