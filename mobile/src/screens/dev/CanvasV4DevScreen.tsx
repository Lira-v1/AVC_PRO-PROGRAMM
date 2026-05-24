import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../../components/AppHeader';

type Point = {
  x: number;
  y: number;
};

type ShapeToolMode = 'rectangle' | 'circle';
type ShapeType = ShapeToolMode;
type ShapeRole = 'top' | 'right' | 'bottom' | 'left' | 'perimeter';
type ToolMode = 'idle' | 'line' | 'polyline' | ShapeToolMode | 'select' | 'door' | 'window';
type WallSegmentType = 'external' | 'internal';
type DimensionDisplayMode = 'minimal' | 'architectural' | 'full';
type DimensionLevel = 'external' | 'internal' | 'detail' | 'shape';
type WallAlignmentMode = 'inside' | 'center';
type CornerJoinMode = 'bevel';
type DimensionSide = 'top' | 'bottom' | 'left' | 'right';
type SegmentSpatialRole = 'external-like' | 'internal-like' | 'unknown';
type CanvasV4Mode = 'plan' | 'project';
type CircleVisualMode = 'smooth' | 'segmented';
type CanvasEntryStep = 'start' | 'template-categories' | 'apartment-gallery' | 'canvas';
type TemplateCategory = 'apartment' | 'house' | 'cottage';
type ApartmentTemplateVariant = 'one-room' | 'two-room' | 'three-room';
type TemplateVariant = ApartmentTemplateVariant;
type TemplateAvailability = 'ready' | 'stub';
type ProjectValidationState = 'idle' | 'empty' | 'invalid' | 'valid';
type RoomDetectionState = 'idle' | 'blocked' | 'detected';
type RoomStatus = 'detected';

type CanvasV4WallSegment = {
  entityId: string;
  segmentId: string;
  lineId: string;
  entityType: 'wall-segment';
  polylineId?: string;
  shapeId?: string;
  shapeType?: ShapeType;
  shapeRole?: ShapeRole;
  shapeCenterPoint?: Point;
  shapeRadius?: number;
  shapeDiameter?: number;
  shapeSegmentIds?: string[];
  startPoint: Point;
  endPoint: Point;
  length: number;
  angle: number;
  wallThickness: number;
  wallAlignmentMode: WallAlignmentMode;
  cornerJoinMode: CornerJoinMode;
  segmentType: WallSegmentType;
  connectedSegmentIds: string[];
  connectionNodeIds: string[];
  doorIds: string[];
  windowIds: string[];
};

type CanvasV4LineEntity = CanvasV4WallSegment;

type DoorHingeSide = 'left' | 'right';
type DoorSwingSide = 'inside' | 'outside';

type CanvasV4Door = {
  doorId: string;
  segmentId: string;
  positionOnSegment: number;
  width: number;
  hingeSide: DoorHingeSide;
  swingSide: DoorSwingSide;
  createdAt: number;
};

type CanvasV4Window = {
  windowId: string;
  segmentId: string;
  positionOnSegment: number;
  width: number;
  height: number;
  bottomOffset: number;
  createdAt: number;
};

type CanvasV4RoomCandidate = {
  candidateId: string;
  candidateContour: Point[];
  candidateArea: number;
  candidateSegments: string[];
  candidateCenter: Point;
  candidateBounds: BoundingBox;
};

type CanvasV4RoomEntity = {
  roomId: string;
  roomContour: Point[];
  roomSegments: string[];
  roomArea: number;
  roomCenter: Point;
  roomBounds: BoundingBox;
  roomLabel: string;
  roomStatus: RoomStatus;
};

type CanvasV4ProjectValidationResult = {
  projectValidationState: ProjectValidationState;
  roomDetectionState: RoomDetectionState;
  closedContours: ProjectContourInfo[];
  openContourSegmentIds: string[];
  orphanSegmentIds: string[];
  roomCandidates: CanvasV4RoomCandidate[];
  rooms: CanvasV4RoomEntity[];
  lastValidationError: string | null;
};

type CanvasV4ProjectGeometrySnapshot = {
  frozenAt: number;
  entities: CanvasV4LineEntity[];
  doors: CanvasV4Door[];
  windows: CanvasV4Window[];
  roomCandidates: CanvasV4RoomCandidate[];
  rooms: CanvasV4RoomEntity[];
  validationState: ProjectValidationState;
};

type CanvasV4ProjectState = {
  projectId: string;
  createdAt: number;
  geometrySnapshot: CanvasV4ProjectGeometrySnapshot;
  roomCandidates: CanvasV4RoomCandidate[];
  rooms: CanvasV4RoomEntity[];
  validationState: ProjectValidationState;
  validationError: string | null;
};

type HistoryAction =
  | { type: 'CREATE_WALL_SEGMENT'; entity: CanvasV4LineEntity; index: number }
  | { type: 'CREATE_POLYLINE_WALL_SEGMENT'; entity: CanvasV4LineEntity; index: number }
  | { type: 'CREATE_RECTANGLE'; entities: Array<{ entity: CanvasV4LineEntity; index: number }> }
  | { type: 'CREATE_CIRCLE'; entities: Array<{ entity: CanvasV4LineEntity; index: number }> }
  | { type: 'DELETE_WALL_SEGMENT'; entity: CanvasV4LineEntity; index: number; doors: Array<{ door: CanvasV4Door; index: number }>; windows: Array<{ window: CanvasV4Window; index: number }> }
  | { type: 'DELETE_SELECTED_WALL_SEGMENTS'; entities: Array<{ entity: CanvasV4LineEntity; index: number }>; doors: Array<{ door: CanvasV4Door; index: number }>; windows: Array<{ window: CanvasV4Window; index: number }> }
  | { type: 'MOVE_SELECTED_WALL_SEGMENTS'; beforeEntities: CanvasV4LineEntity[]; afterEntities: CanvasV4LineEntity[]; beforeDoors: CanvasV4Door[]; afterDoors: CanvasV4Door[]; beforeWindows: CanvasV4Window[]; afterWindows: CanvasV4Window[]; delta: Point }
  | { type: 'RESIZE_WALL_SEGMENT'; beforeEntities: CanvasV4LineEntity[]; afterEntities: CanvasV4LineEntity[]; beforeDoors: CanvasV4Door[]; afterDoors: CanvasV4Door[]; beforeWindows: CanvasV4Window[]; afterWindows: CanvasV4Window[]; handleId: string }
  | { type: 'RESIZE_WALL_SELECTION'; beforeEntities: CanvasV4LineEntity[]; afterEntities: CanvasV4LineEntity[]; beforeDoors: CanvasV4Door[]; afterDoors: CanvasV4Door[]; beforeWindows: CanvasV4Window[]; afterWindows: CanvasV4Window[]; handleId: string; scaleX: number; scaleY: number }
  | { type: 'CREATE_DOOR'; door: CanvasV4Door; doorIndex: number; beforeEntity: CanvasV4LineEntity; afterEntity: CanvasV4LineEntity }
  | { type: 'MOVE_DOOR'; beforeDoor: CanvasV4Door; afterDoor: CanvasV4Door }
  | { type: 'CHANGE_DOOR_HINGE_SIDE'; beforeDoor: CanvasV4Door; afterDoor: CanvasV4Door }
  | { type: 'CHANGE_DOOR_SWING_SIDE'; beforeDoor: CanvasV4Door; afterDoor: CanvasV4Door }
  | { type: 'DELETE_DOOR'; door: CanvasV4Door; doorIndex: number; beforeEntity: CanvasV4LineEntity; afterEntity: CanvasV4LineEntity }
  | { type: 'CREATE_WINDOW'; window: CanvasV4Window; windowIndex: number; beforeEntity: CanvasV4LineEntity; afterEntity: CanvasV4LineEntity }
  | { type: 'MOVE_WINDOW'; beforeWindow: CanvasV4Window; afterWindow: CanvasV4Window }
  | { type: 'DELETE_WINDOW'; window: CanvasV4Window; windowIndex: number; beforeEntity: CanvasV4LineEntity; afterEntity: CanvasV4LineEntity }
  | { type: 'UPDATE_WINDOW_WIDTH'; beforeWindow: CanvasV4Window; afterWindow: CanvasV4Window };

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

type InteractionMode = 'idle' | 'pan' | 'selection-box' | 'move-selection' | 'resize-line' | 'resize-selection' | 'move-door' | 'move-window';
type HitTestTargetType = 'resize-handle' | 'selected-geometry' | 'wall-geometry' | 'door-geometry' | 'window-geometry' | 'room-overlay' | 'empty-canvas';
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
  | 'move-window'
  | 'resize-line'
  | 'resize-selection'
  | 'draw-line'
  | 'draw-polyline'
  | 'draw-rectangle'
  | 'draw-circle'
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
  moveWindowId: string | null;
  moveOriginalWindow: CanvasV4Window | null;
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
const DIMENSION_BASE_OFFSET_PX = 34;
const DIMENSION_INTERNAL_OFFSET_PX = 22;
const DIMENSION_COLLISION_STEP_PX = 16;
const DIMENSION_MAX_COLLISION_PASSES = 5;
const DIMENSION_SPATIAL_NEIGHBOR_DISTANCE_MM = 1200;
const DIMENSION_SPATIAL_PROJECTION_PADDING_MM = 120;
const DIMENSION_AXIS_TOLERANCE_DEG = 12;
const DIMENSION_BOUNDARY_EPSILON_MM = 4;
const DIMENSION_EXTENSION_GAP_PX = 5;
const DIMENSION_EXTENSION_OVERHANG_PX = 7;
const DIMENSION_TICK_LENGTH_PX = 12;
const DIMENSION_LABEL_GAP_PX = 9;
const LINE_DIMENSION_LABEL_WIDTH_PX = 62;
const LINE_DIMENSION_LABEL_HEIGHT_PX = 18;
const ARCHITECTURAL_MAJOR_DIMENSION_MIN_MM = 1000;
const DIMENSION_DUPLICATE_LENGTH_TOLERANCE_MM = 10;
const POINT_MATCH_EPSILON = 0.001;
const DEFAULT_WALL_THICKNESS_MM = 100;
const WALL_THICKNESS_VISUAL = false;
const WALL_THICKNESS_FROZEN = true;
const DEFAULT_CORNER_JOIN_MODE: CornerJoinMode = 'bevel';
const DEFAULT_DOOR_WIDTH_MM = 800;
const DEFAULT_WINDOW_WIDTH_MM = 1200;
const DEFAULT_WINDOW_HEIGHT_MM = 1400;
const DEFAULT_WINDOW_BOTTOM_OFFSET_MM = 900;
const MIN_WINDOW_WIDTH_MM = 100;
const MIN_ROOM_AREA_MM2 = 500000;
const PROJECT_EMPTY_CANVAS_MESSAGE = 'Чертёж отсутствует';
const PROJECT_NO_ROOM_MESSAGE = 'Не найдено помещение. Замкните контур.';
const DOOR_HIT_TOLERANCE_PX = 16;
const WINDOW_HIT_TOLERANCE_PX = 14;
const DOOR_SWING_ARC_VISUAL_SCALE = 0.68;
const DOOR_SWING_ARC_SEGMENTS = 12;
const CIRCLE_SHAPE_SEGMENT_COUNT = 24;
const CIRCLE_VISUAL_STROKE_WIDTH_PX = 2;
const MIN_SHAPE_SIZE_MM = GRID_STEP_MM;
const SHAPE_WALL_SEGMENT_TYPE: WallSegmentType = 'external';
const RECTANGLE_SHAPE_ROLES: ShapeRole[] = ['top', 'right', 'bottom', 'left'];
const TEMPLATE_CATEGORY_CARDS: TemplateCategoryCard[] = [
  { id: 'apartment', title: 'Квартира', subtitle: 'Editable CAD templates', availability: 'ready' },
  { id: 'house', title: 'Дом', subtitle: 'Заготовка категории', availability: 'stub' },
  { id: 'cottage', title: 'Коттедж', subtitle: 'Заготовка категории', availability: 'stub' },
];
const APARTMENT_TEMPLATE_CARDS: ApartmentTemplateCard[] = [
  { id: 'one-room', title: '1-комнатная', areaLabel: '30-42 м²', roomsLabel: 'зал/спальня, кухня, санузел, коридор' },
  { id: 'two-room', title: '2-комнатная', areaLabel: '45-65 м²', roomsLabel: 'зал, спальня, кухня, санузел, коридор' },
  { id: 'three-room', title: '3-комнатная', areaLabel: '65-90 м²', roomsLabel: 'зал, две спальни, кухня, санузел, прихожая' },
];

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
type ClosedContourOrientation = 'clockwise' | 'counter-clockwise';

type ClosedContourInfo = {
  polylineId: string;
  vertices: Point[];
  signedArea: number;
  orientation: ClosedContourOrientation;
  centroid: Point;
};

type ProjectContourInfo = ClosedContourInfo & {
  contourId: string;
  segmentIds: string[];
};

type DimensionNeighborInfo = {
  hasAbove: boolean;
  hasBelow: boolean;
  hasLeft: boolean;
  hasRight: boolean;
  nearestAboveMm: number | null;
  nearestBelowMm: number | null;
  nearestLeftMm: number | null;
  nearestRightMm: number | null;
};

type DimensionSpatialAnalysis = {
  side: DimensionSide;
  role: SegmentSpatialRole;
  neighborInfo: DimensionNeighborInfo;
  isHorizontalLike: boolean;
  isVerticalLike: boolean;
};

type DimensionLabelPlacement = {
  left: number;
  top: number;
  rotationDeg: number;
  offsetPx: number;
  placementMode: DimensionLabelPlacementMode;
  lineStart: Point;
  lineEnd: Point;
  extensionStartA: Point;
  extensionEndA: Point;
  extensionStartB: Point;
  extensionEndB: Point;
  tickStart: Point;
  tickEnd: Point;
  tickAngleDeg: number;
  side: DimensionSide;
  spatialRole: SegmentSpatialRole;
  neighborInfo: DimensionNeighborInfo;
};

type DimensionScreenItem = {
  id: string;
  entity: CanvasV4LineEntity;
  level: DimensionLevel;
  placement: DimensionLabelPlacement;
  label: string;
  isSelected: boolean;
};

type LiveDimensionPreviewItem = {
  id: string;
  placement: DimensionLabelPlacement;
  label: string;
};

type ShapePreviewSegment = {
  id: string;
  startPoint: Point;
  endPoint: Point;
};

type ShapePreview = {
  type: ShapeToolMode;
  startPoint: Point;
  endPoint: Point;
  segments: ShapePreviewSegment[];
  segmentCount: number;
};

type ShapeGeometryGroup = {
  shapeId: string;
  shapeType: ShapeType;
  segments: CanvasV4LineEntity[];
  segmentIds: string[];
  boundingBox: BoundingBox | null;
  centerPoint?: Point;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  diameter?: number;
};

type ScreenRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type TemplateCategoryCard = {
  id: TemplateCategory;
  title: string;
  subtitle: string;
  availability: TemplateAvailability;
};

type ApartmentTemplateCard = {
  id: ApartmentTemplateVariant;
  title: string;
  areaLabel: string;
  roomsLabel: string;
};

type TemplateGeneratedGeometry = {
  entities: CanvasV4LineEntity[];
  doors: CanvasV4Door[];
  windows: CanvasV4Window[];
  selectedEntityIds: string[];
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
  moveWindowId: null,
  moveOriginalWindow: null,
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

const getConnectionNodeId = (point: Point) => `node-${point.x.toFixed(3)}:${point.y.toFixed(3)}`;

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

const getCircleMetricsFromBoundingBox = (box: BoundingBox | null) => {
  if (!box) {
    return null;
  }

  const radiusX = Math.abs(box.maxX - box.minX) / 2;
  const radiusY = Math.abs(box.maxY - box.minY) / 2;
  const diameter = Math.max(radiusX * 2, radiusY * 2);

  if (diameter <= 0.000001) {
    return null;
  }

  return {
    centerPoint: {
      x: (box.minX + box.maxX) / 2,
      y: (box.minY + box.maxY) / 2,
    },
    radius: diameter / 2,
    radiusX,
    radiusY,
    diameter,
  };
};

const getShapeGroups = (entities: CanvasV4LineEntity[]): ShapeGeometryGroup[] => {
  const groupsByShapeId = new Map<string, ShapeGeometryGroup>();

  entities.forEach((entity) => {
    if (!entity.shapeId || !entity.shapeType) {
      return;
    }

    const currentGroup = groupsByShapeId.get(entity.shapeId) ?? {
      shapeId: entity.shapeId,
      shapeType: entity.shapeType,
      segments: [],
      segmentIds: [],
      boundingBox: null,
    };

    groupsByShapeId.set(entity.shapeId, {
      ...currentGroup,
      segments: [...currentGroup.segments, entity],
      segmentIds: [...currentGroup.segmentIds, entity.segmentId],
    });
  });

  return Array.from(groupsByShapeId.values()).map((group) => {
    const boundingBox = getEntitiesBoundingBox(group.segments);

    if (group.shapeType !== 'circle') {
      return {
        ...group,
        boundingBox,
      };
    }

    const circleMetrics = getCircleMetricsFromBoundingBox(boundingBox);

    return {
      ...group,
      boundingBox,
      centerPoint: circleMetrics?.centerPoint,
      radius: circleMetrics?.radius,
      radiusX: circleMetrics?.radiusX,
      radiusY: circleMetrics?.radiusY,
      diameter: circleMetrics?.diameter,
    };
  });
};

const expandEntityIdsToShapeGroups = (entityIds: Iterable<string>, entities: CanvasV4LineEntity[], shapeGroups: ShapeGeometryGroup[]) => {
  const expandedIds = new Set(entityIds);
  const entityById = new Map(entities.map((entity) => [entity.entityId, entity]));
  const touchedShapeIds = new Set<string>();

  expandedIds.forEach((entityId) => {
    const entity = entityById.get(entityId);

    if (entity?.shapeId) {
      touchedShapeIds.add(entity.shapeId);
    }
  });

  shapeGroups.forEach((group) => {
    if (touchedShapeIds.has(group.shapeId)) {
      group.segments.forEach((segment) => expandedIds.add(segment.entityId));
    }
  });

  return expandedIds;
};

const withShapeGeometryMetadata = (entities: CanvasV4LineEntity[]): CanvasV4LineEntity[] => {
  const groupsByShapeId = new Map(getShapeGroups(entities).map((group) => [group.shapeId, group]));

  return entities.map((entity) => {
    if (!entity.shapeId) {
      return entity;
    }

    const group = groupsByShapeId.get(entity.shapeId);

    if (!group) {
      return entity;
    }

    if (group.shapeType !== 'circle') {
      return {
        ...entity,
        shapeSegmentIds: group.segmentIds,
        shapeCenterPoint: undefined,
        shapeRadius: undefined,
        shapeDiameter: undefined,
      };
    }

    return {
      ...entity,
      shapeSegmentIds: group.segmentIds,
      shapeCenterPoint: group.centerPoint,
      shapeRadius: group.radius,
      shapeDiameter: group.diameter,
    };
  });
};

const createWallSegment = (
  startPoint: Point,
  endPoint: Point,
  segmentType: WallSegmentType = 'internal',
  polylineId?: string,
  shapeMetadata?: { shapeId: string; shapeType: ShapeType; shapeRole: ShapeRole },
): CanvasV4WallSegment => {
  const metrics = getLineMetrics(startPoint, endPoint);
  const segmentId = `wall-segment-${Date.now()}-${Math.round(Math.random() * 100000)}`;

  return {
    entityId: segmentId,
    segmentId,
    lineId: segmentId,
    entityType: 'wall-segment',
    polylineId,
    shapeId: shapeMetadata?.shapeId,
    shapeType: shapeMetadata?.shapeType,
    shapeRole: shapeMetadata?.shapeRole,
    startPoint,
    endPoint,
    length: metrics.length,
    angle: metrics.angle,
    wallThickness: DEFAULT_WALL_THICKNESS_MM,
    wallAlignmentMode: getWallAlignmentMode(segmentType),
    cornerJoinMode: DEFAULT_CORNER_JOIN_MODE,
    segmentType,
    connectedSegmentIds: [],
    connectionNodeIds: [getConnectionNodeId(startPoint), getConnectionNodeId(endPoint)],
    doorIds: [],
    windowIds: [],
  };
};

const isShapeToolMode = (mode: ToolMode): mode is ShapeToolMode => mode === 'rectangle' || mode === 'circle';

const isGeometryDrawingToolMode = (mode: ToolMode) => mode === 'line' || mode === 'polyline' || isShapeToolMode(mode);

const getRectangleCornerPoints = (startPoint: Point, endPoint: Point): Point[] => {
  const rect = getNormalizedRect(startPoint, endPoint);

  return [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ];
};

const getCircleApproximationPoints = (centerPoint: Point, radius: number, segmentCount = CIRCLE_SHAPE_SEGMENT_COUNT): Point[] =>
  Array.from({ length: segmentCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / segmentCount;
    return {
      x: centerPoint.x + Math.cos(angle) * radius,
      y: centerPoint.y + Math.sin(angle) * radius,
    };
  });

const getClosedPreviewSegments = (type: ShapeToolMode, points: Point[]): ShapePreviewSegment[] =>
  points.map((point, index) => ({
    id: `${type}-preview-${index}`,
    startPoint: point,
    endPoint: points[(index + 1) % points.length],
  }));

const createClosedShapeWallSegments = (type: ShapeToolMode, points: Point[], segmentType: WallSegmentType = SHAPE_WALL_SEGMENT_TYPE): CanvasV4LineEntity[] => {
  const shapeId = `${type}-${Date.now()}-${Math.round(Math.random() * 100000)}`;

  const segments = points.map((point, index) => createWallSegment(
    point,
    points[(index + 1) % points.length],
    segmentType,
    shapeId,
    {
      shapeId,
      shapeType: type,
      shapeRole: type === 'rectangle' ? RECTANGLE_SHAPE_ROLES[index] : 'perimeter',
    },
  ));

  return withShapeGeometryMetadata(segments);
};

const createRectangleWallSegments = (startPoint: Point, endPoint: Point): CanvasV4LineEntity[] => {
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  if (width < MIN_SHAPE_SIZE_MM || height < MIN_SHAPE_SIZE_MM) {
    return [];
  }

  return createClosedShapeWallSegments('rectangle', getRectangleCornerPoints(startPoint, endPoint));
};

const createCircleWallSegments = (centerPoint: Point, radiusPoint: Point): CanvasV4LineEntity[] => {
  const radius = Math.hypot(radiusPoint.x - centerPoint.x, radiusPoint.y - centerPoint.y);

  if (radius < MIN_SHAPE_SIZE_MM) {
    return [];
  }

  return createClosedShapeWallSegments('circle', getCircleApproximationPoints(centerPoint, radius));
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

  const connectedEntities = entities.map((entity) => ({
    ...entity,
    connectedSegmentIds: Array.from(connectedBySegmentId.get(entity.segmentId) ?? []).sort(),
    connectionNodeIds: [getConnectionNodeId(entity.startPoint), getConnectionNodeId(entity.endPoint)],
  }));

  return withShapeGeometryMetadata(connectedEntities);
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

const isBoundingBoxInsideRect = (box: BoundingBox, rect: ReturnType<typeof getNormalizedRect>) => (
  box.minX >= rect.minX
  && box.maxX <= rect.maxX
  && box.minY >= rect.minY
  && box.maxY <= rect.maxY
);

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

const createCanvasEntityId = (prefix: 'door' | 'window') => `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;

const createDoor = (segment: CanvasV4LineEntity, positionOnSegment: number): CanvasV4Door => ({
  doorId: createCanvasEntityId('door'),
  segmentId: segment.segmentId,
  positionOnSegment: clampDoorPositionOnSegment(segment, positionOnSegment),
  width: DEFAULT_DOOR_WIDTH_MM,
  hingeSide: 'left',
  swingSide: 'inside',
  createdAt: Date.now(),
});

const getToggledDoorHingeSide = (hingeSide: DoorHingeSide): DoorHingeSide => (hingeSide === 'left' ? 'right' : 'left');

const getToggledDoorSwingSide = (swingSide: DoorSwingSide): DoorSwingSide => (swingSide === 'inside' ? 'outside' : 'inside');

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

const getWindowPositionLimit = (segment: CanvasV4LineEntity, width = DEFAULT_WINDOW_WIDTH_MM) => Math.max(0, segment.length - width / 2);

const clampWindowPositionOnSegment = (segment: CanvasV4LineEntity, positionOnSegment: number, width = DEFAULT_WINDOW_WIDTH_MM) => {
  const min = Math.min(segment.length, width / 2);
  const max = Math.max(min, getWindowPositionLimit(segment, width));
  return Math.max(min, Math.min(max, positionOnSegment));
};

const createWindow = (segment: CanvasV4LineEntity, positionOnSegment: number): CanvasV4Window => ({
  windowId: createCanvasEntityId('window'),
  segmentId: segment.segmentId,
  positionOnSegment: clampWindowPositionOnSegment(segment, positionOnSegment),
  width: DEFAULT_WINDOW_WIDTH_MM,
  height: DEFAULT_WINDOW_HEIGHT_MM,
  bottomOffset: DEFAULT_WINDOW_BOTTOM_OFFSET_MM,
  createdAt: Date.now(),
});

const insertWindowAtIndex = (windows: CanvasV4Window[], window: CanvasV4Window, index: number) => {
  const next = windows.filter((item) => item.windowId !== window.windowId);
  next.splice(Math.min(index, next.length), 0, window);
  return next;
};

const withWindowAttachedToSegment = (entity: CanvasV4LineEntity, windowId: string): CanvasV4LineEntity => ({
  ...entity,
  windowIds: entity.windowIds.includes(windowId) ? entity.windowIds : [...entity.windowIds, windowId],
});

const withWindowDetachedFromSegment = (entity: CanvasV4LineEntity, windowId: string): CanvasV4LineEntity => ({
  ...entity,
  windowIds: entity.windowIds.filter((id) => id !== windowId),
});

type TemplateWallSpec = {
  key: string;
  startPoint: Point;
  endPoint: Point;
  segmentType: WallSegmentType;
  polylineId?: string;
};

const createTemplatePoint = (x: number, y: number): Point => ({ x, y });

const createTemplateOuterWallSpecs = (width: number, height: number, polylineId: string): TemplateWallSpec[] => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const topLeft = createTemplatePoint(-halfWidth, -halfHeight);
  const topRight = createTemplatePoint(halfWidth, -halfHeight);
  const bottomRight = createTemplatePoint(halfWidth, halfHeight);
  const bottomLeft = createTemplatePoint(-halfWidth, halfHeight);

  return [
    { key: 'outer-top', startPoint: topLeft, endPoint: topRight, segmentType: 'external', polylineId },
    { key: 'outer-right', startPoint: topRight, endPoint: bottomRight, segmentType: 'external', polylineId },
    { key: 'outer-bottom', startPoint: bottomRight, endPoint: bottomLeft, segmentType: 'external', polylineId },
    { key: 'outer-left', startPoint: bottomLeft, endPoint: topLeft, segmentType: 'external', polylineId },
  ];
};

const addTemplateDoor = (
  segmentKey: string,
  positionOnSegment: number,
  segmentByKey: Map<string, CanvasV4LineEntity>,
  updateEntity: (entity: CanvasV4LineEntity) => void,
  doors: CanvasV4Door[],
) => {
  const segment = segmentByKey.get(segmentKey);

  if (!segment) {
    return;
  }

  const door = createDoor(segment, positionOnSegment);
  const attachedSegment = withDoorAttachedToSegment(segment, door.doorId);

  segmentByKey.set(segmentKey, attachedSegment);
  updateEntity(attachedSegment);
  doors.push(door);
};

const addTemplateWindow = (
  segmentKey: string,
  positionOnSegment: number,
  segmentByKey: Map<string, CanvasV4LineEntity>,
  updateEntity: (entity: CanvasV4LineEntity) => void,
  windows: CanvasV4Window[],
) => {
  const segment = segmentByKey.get(segmentKey);

  if (!segment) {
    return;
  }

  const window = createWindow(segment, positionOnSegment);
  const attachedSegment = withWindowAttachedToSegment(segment, window.windowId);

  segmentByKey.set(segmentKey, attachedSegment);
  updateEntity(attachedSegment);
  windows.push(window);
};

const createOneRoomApartmentTemplateSpecs = (polylineId: string): TemplateWallSpec[] => [
  ...createTemplateOuterWallSpecs(6800, 5600, polylineId),
  { key: 'living-service-top', startPoint: createTemplatePoint(-900, -2800), endPoint: createTemplatePoint(-900, 500), segmentType: 'internal' },
  { key: 'living-service-bottom', startPoint: createTemplatePoint(-900, 500), endPoint: createTemplatePoint(-900, 2800), segmentType: 'internal' },
  { key: 'service-horizontal', startPoint: createTemplatePoint(-900, 500), endPoint: createTemplatePoint(3400, 500), segmentType: 'internal' },
  { key: 'bath-corridor', startPoint: createTemplatePoint(1000, 500), endPoint: createTemplatePoint(1000, 2800), segmentType: 'internal' },
];

const createTwoRoomApartmentTemplateSpecs = (polylineId: string): TemplateWallSpec[] => [
  ...createTemplateOuterWallSpecs(8600, 6500, polylineId),
  { key: 'main-vertical-top', startPoint: createTemplatePoint(-900, -3250), endPoint: createTemplatePoint(-900, -800), segmentType: 'internal' },
  { key: 'main-vertical-mid', startPoint: createTemplatePoint(-900, -800), endPoint: createTemplatePoint(-900, 700), segmentType: 'internal' },
  { key: 'main-vertical-bottom', startPoint: createTemplatePoint(-900, 700), endPoint: createTemplatePoint(-900, 3250), segmentType: 'internal' },
  { key: 'living-bedroom', startPoint: createTemplatePoint(-4300, 700), endPoint: createTemplatePoint(-900, 700), segmentType: 'internal' },
  { key: 'kitchen-service', startPoint: createTemplatePoint(-900, -800), endPoint: createTemplatePoint(4300, -800), segmentType: 'internal' },
  { key: 'bath-corridor', startPoint: createTemplatePoint(1400, -800), endPoint: createTemplatePoint(1400, 3250), segmentType: 'internal' },
];

const createThreeRoomApartmentTemplateSpecs = (polylineId: string): TemplateWallSpec[] => [
  ...createTemplateOuterWallSpecs(10000, 7800, polylineId),
  { key: 'main-vertical-top', startPoint: createTemplatePoint(-1800, -3900), endPoint: createTemplatePoint(-1800, -1200), segmentType: 'internal' },
  { key: 'main-vertical-upper-mid', startPoint: createTemplatePoint(-1800, -1200), endPoint: createTemplatePoint(-1800, -1000), segmentType: 'internal' },
  { key: 'main-vertical-lower-mid', startPoint: createTemplatePoint(-1800, -1000), endPoint: createTemplatePoint(-1800, 1400), segmentType: 'internal' },
  { key: 'main-vertical-bottom', startPoint: createTemplatePoint(-1800, 1400), endPoint: createTemplatePoint(-1800, 3900), segmentType: 'internal' },
  { key: 'bedroom-upper', startPoint: createTemplatePoint(-5000, -1200), endPoint: createTemplatePoint(-1800, -1200), segmentType: 'internal' },
  { key: 'bedroom-lower', startPoint: createTemplatePoint(-5000, 1400), endPoint: createTemplatePoint(-1800, 1400), segmentType: 'internal' },
  { key: 'kitchen-service', startPoint: createTemplatePoint(-1800, -1000), endPoint: createTemplatePoint(5000, -1000), segmentType: 'internal' },
  { key: 'bath-hallway', startPoint: createTemplatePoint(1600, -1000), endPoint: createTemplatePoint(1600, 3900), segmentType: 'internal' },
];

const createApartmentTemplateGeometry = (variant: ApartmentTemplateVariant): TemplateGeneratedGeometry => {
  const polylineId = `template-apartment-${variant}-${Date.now()}`;
  const specs = variant === 'one-room'
    ? createOneRoomApartmentTemplateSpecs(polylineId)
    : variant === 'two-room'
      ? createTwoRoomApartmentTemplateSpecs(polylineId)
      : createThreeRoomApartmentTemplateSpecs(polylineId);
  let entities = specs.map((spec) => createWallSegment(spec.startPoint, spec.endPoint, spec.segmentType, spec.polylineId));
  const segmentByKey = new Map(specs.map((spec, index) => [spec.key, entities[index]]));
  const doors: CanvasV4Door[] = [];
  const windows: CanvasV4Window[] = [];
  const updateEntity = (updatedEntity: CanvasV4LineEntity) => {
    entities = entities.map((entity) => (entity.entityId === updatedEntity.entityId ? updatedEntity : entity));
  };

  if (variant === 'one-room') {
    addTemplateDoor('outer-bottom', 2500, segmentByKey, updateEntity, doors);
    addTemplateDoor('living-service-bottom', 1450, segmentByKey, updateEntity, doors);
    addTemplateDoor('service-horizontal', 3000, segmentByKey, updateEntity, doors);
    addTemplateDoor('bath-corridor', 1150, segmentByKey, updateEntity, doors);
    addTemplateWindow('outer-left', 3200, segmentByKey, updateEntity, windows);
    addTemplateWindow('outer-top', 5200, segmentByKey, updateEntity, windows);
  } else if (variant === 'two-room') {
    addTemplateDoor('outer-bottom', 3300, segmentByKey, updateEntity, doors);
    addTemplateDoor('main-vertical-mid', 750, segmentByKey, updateEntity, doors);
    addTemplateDoor('main-vertical-bottom', 1450, segmentByKey, updateEntity, doors);
    addTemplateDoor('living-bedroom', 1750, segmentByKey, updateEntity, doors);
    addTemplateDoor('bath-corridor', 2650, segmentByKey, updateEntity, doors);
    addTemplateWindow('outer-left', 1850, segmentByKey, updateEntity, windows);
    addTemplateWindow('outer-left', 5000, segmentByKey, updateEntity, windows);
    addTemplateWindow('outer-top', 6400, segmentByKey, updateEntity, windows);
  } else {
    addTemplateDoor('outer-bottom', 4300, segmentByKey, updateEntity, doors);
    addTemplateDoor('main-vertical-top', 1500, segmentByKey, updateEntity, doors);
    addTemplateDoor('main-vertical-lower-mid', 1200, segmentByKey, updateEntity, doors);
    addTemplateDoor('main-vertical-bottom', 1250, segmentByKey, updateEntity, doors);
    addTemplateDoor('bedroom-upper', 1650, segmentByKey, updateEntity, doors);
    addTemplateDoor('bath-hallway', 2750, segmentByKey, updateEntity, doors);
    addTemplateWindow('outer-left', 1550, segmentByKey, updateEntity, windows);
    addTemplateWindow('outer-left', 3900, segmentByKey, updateEntity, windows);
    addTemplateWindow('outer-top', 7000, segmentByKey, updateEntity, windows);
    addTemplateWindow('outer-right', 1700, segmentByKey, updateEntity, windows);
  }

  return {
    entities: normalizeWallSegmentConnectivity(entities),
    doors,
    windows,
    selectedEntityIds: [],
  };
};

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

const clampWindowsToSegments = (windows: CanvasV4Window[], entities: CanvasV4LineEntity[]) => {
  const segmentsById = new Map(entities.map((entity) => [entity.segmentId, entity]));

  return windows.map((window) => {
    const segment = segmentsById.get(window.segmentId);

    if (!segment) {
      return window;
    }

    return {
      ...window,
      positionOnSegment: clampWindowPositionOnSegment(segment, window.positionOnSegment, window.width),
    };
  });
};

const getScreenPoint = (nativeEvent: any): Point => ({
  x: nativeEvent.locationX ?? nativeEvent.offsetX ?? 0,
  y: nativeEvent.locationY ?? nativeEvent.offsetY ?? 0,
});


const getPolygonSignedArea = (points: Point[]) => {
  if (points.length < 3) {
    return 0;
  }

  return points.reduce((twiceArea, current, index) => {
    const next = points[(index + 1) % points.length];
    return twiceArea + current.x * next.y - next.x * current.y;
  }, 0) / 2;
};

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

const getClosedPolylineInfoForEntity = (entity: CanvasV4LineEntity, entities: CanvasV4LineEntity[]): ClosedContourInfo | null => {
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

  const vertices = contourSegments.map((segment) => segment.startPoint);
  const signedArea = getPolygonSignedArea(vertices);
  const centroid = getPolygonCentroid(vertices);

  if (!centroid || Math.abs(signedArea) <= 0.000001) {
    return null;
  }

  return {
    polylineId: entity.polylineId,
    vertices,
    signedArea,
    // Canvas/world Y grows downward, so a positive signed area means the contour
    // is visually clockwise and the polygon interior is on the left side of each edge.
    orientation: signedArea > 0 ? 'clockwise' : 'counter-clockwise',
    centroid,
  };
};

const clonePoint = (point: Point): Point => ({ ...point });

const cloneBoundingBox = (box: BoundingBox): BoundingBox => ({ ...box });

const cloneRoomCandidate = (candidate: CanvasV4RoomCandidate): CanvasV4RoomCandidate => ({
  ...candidate,
  candidateContour: candidate.candidateContour.map(clonePoint),
  candidateSegments: [...candidate.candidateSegments],
  candidateCenter: clonePoint(candidate.candidateCenter),
  candidateBounds: cloneBoundingBox(candidate.candidateBounds),
});

const cloneRoomEntity = (room: CanvasV4RoomEntity): CanvasV4RoomEntity => ({
  ...room,
  roomContour: room.roomContour.map(clonePoint),
  roomSegments: [...room.roomSegments],
  roomCenter: clonePoint(room.roomCenter),
  roomBounds: cloneBoundingBox(room.roomBounds),
});

const cloneCanvasV4ProjectGeometrySnapshot = (
  entities: CanvasV4LineEntity[],
  doors: CanvasV4Door[],
  windows: CanvasV4Window[],
  roomCandidates: CanvasV4RoomCandidate[] = [],
  rooms: CanvasV4RoomEntity[] = [],
  validationState: ProjectValidationState = 'idle',
): CanvasV4ProjectGeometrySnapshot => ({
  frozenAt: Date.now(),
  entities: entities.map((entity) => ({
    ...entity,
    startPoint: { ...entity.startPoint },
    endPoint: { ...entity.endPoint },
    shapeCenterPoint: entity.shapeCenterPoint ? { ...entity.shapeCenterPoint } : undefined,
    shapeSegmentIds: entity.shapeSegmentIds ? [...entity.shapeSegmentIds] : undefined,
    connectedSegmentIds: [...(entity.connectedSegmentIds ?? [])],
    connectionNodeIds: [...(entity.connectionNodeIds ?? [])],
    doorIds: [...(entity.doorIds ?? [])],
    windowIds: [...(entity.windowIds ?? [])],
  })),
  doors: doors.map((door) => ({ ...door })),
  windows: windows.map((window) => ({ ...window })),
  roomCandidates: roomCandidates.map(cloneRoomCandidate),
  rooms: rooms.map(cloneRoomEntity),
  validationState,
});

const getContourSignature = (segmentIds: string[]) => [...segmentIds].sort().join('|');

const createProjectContourInfo = (contourId: string, vertices: Point[], segmentIds: string[], polylineId: string): ProjectContourInfo | null => {
  const signedArea = getPolygonSignedArea(vertices);
  const centroid = getPolygonCentroid(vertices);

  if (!centroid || Math.abs(signedArea) <= MIN_ROOM_AREA_MM2) {
    return null;
  }

  return {
    polylineId,
    vertices,
    signedArea,
    orientation: signedArea > 0 ? 'clockwise' : 'counter-clockwise',
    centroid,
    contourId,
    segmentIds,
  };
};

const recognizeClosedGraphContours = (entities: CanvasV4LineEntity[]): ProjectContourInfo[] => {
  const nodePointByKey = new Map<string, Point>();
  const nodeNeighbors = new Map<string, Set<string>>();
  const edgeSegmentIds = new Map<string, string>();

  const addNode = (point: Point) => {
    const key = getConnectionNodeId(point);
    if (!nodePointByKey.has(key)) {
      nodePointByKey.set(key, point);
    }
    if (!nodeNeighbors.has(key)) {
      nodeNeighbors.set(key, new Set());
    }
    return key;
  };

  entities.forEach((entity) => {
    const startKey = addNode(entity.startPoint);
    const endKey = addNode(entity.endPoint);
    const edgeKey = [startKey, endKey].sort().join('|');
    nodeNeighbors.get(startKey)?.add(endKey);
    nodeNeighbors.get(endKey)?.add(startKey);
    edgeSegmentIds.set(edgeKey, entity.segmentId);
  });

  const contours: ProjectContourInfo[] = [];
  const seenCycleSignatures = new Set<string>();
  const nodeKeys = Array.from(nodeNeighbors.keys()).sort();
  const nodeOrder = new Map(nodeKeys.map((nodeKey, index) => [nodeKey, index]));

  const createContourFromNodePath = (nodePath: string[]) => {
    const segmentIds: string[] = [];

    nodePath.forEach((nodeKey, index) => {
      const nextNodeKey = nodePath[(index + 1) % nodePath.length];
      const segmentId = edgeSegmentIds.get([nodeKey, nextNodeKey].sort().join('|'));

      if (segmentId) {
        segmentIds.push(segmentId);
      }
    });

    if (segmentIds.length !== nodePath.length) {
      return;
    }

    const signature = getContourSignature(segmentIds);

    if (seenCycleSignatures.has(signature)) {
      return;
    }

    const vertices = nodePath.map((nodeKey) => nodePointByKey.get(nodeKey)).filter((point): point is Point => Boolean(point));

    if (vertices.length !== nodePath.length) {
      return;
    }

    const contour = createProjectContourInfo(
      `project-contour-graph-${contours.length + 1}`,
      vertices,
      segmentIds,
      `graph-loop-${contours.length + 1}`,
    );

    if (contour) {
      seenCycleSignatures.add(signature);
      contours.push(contour);
    }
  };

  const walkCycles = (startKey: string, currentKey: string, path: string[]) => {
    if (path.length > entities.length || contours.length > 128) {
      return;
    }

    const neighbors = Array.from(nodeNeighbors.get(currentKey) ?? []).sort();

    neighbors.forEach((neighborKey) => {
      const neighborOrder = nodeOrder.get(neighborKey) ?? 0;
      const startOrder = nodeOrder.get(startKey) ?? 0;

      if (neighborKey === startKey && path.length >= 3) {
        createContourFromNodePath(path);
        return;
      }

      if (path.includes(neighborKey) || neighborOrder < startOrder) {
        return;
      }

      walkCycles(startKey, neighborKey, [...path, neighborKey]);
    });
  };

  nodeKeys.forEach((startKey) => walkCycles(startKey, startKey, [startKey]));

  return contours;
};

const recognizeProjectContours = (entities: CanvasV4LineEntity[]): ProjectContourInfo[] => {
  const polylineIds = Array.from(new Set(entities.map((entity) => entity.polylineId).filter((polylineId): polylineId is string => Boolean(polylineId))));
  const seenContourSignatures = new Set<string>();
  const contours: ProjectContourInfo[] = [];

  polylineIds.forEach((polylineId) => {
    const contourSegments = entities.filter((entity) => entity.polylineId === polylineId);
    const sourceContour = contourSegments[0] ? getClosedPolylineInfoForEntity(contourSegments[0], entities) : null;

    if (!sourceContour) {
      return;
    }

    const contour = {
      ...sourceContour,
      contourId: `project-contour-${polylineId}`,
      segmentIds: contourSegments.map((segment) => segment.segmentId),
    };
    const signature = getContourSignature(contour.segmentIds);
    seenContourSignatures.add(signature);
    contours.push(contour);
  });

  recognizeClosedGraphContours(entities).forEach((contour) => {
    const signature = getContourSignature(contour.segmentIds);

    if (!seenContourSignatures.has(signature)) {
      seenContourSignatures.add(signature);
      contours.push(contour);
    }
  });

  return contours;
};

const getContourSegmentIdSet = (contours: ProjectContourInfo[]) => {
  const segmentIds = new Set<string>();
  contours.forEach((contour) => contour.segmentIds.forEach((segmentId) => segmentIds.add(segmentId)));
  return segmentIds;
};

const getEndpointUsageCount = (entities: CanvasV4LineEntity[]) => {
  const endpointUsage = new Map<string, number>();

  entities.forEach((entity) => {
    [entity.startPoint, entity.endPoint].forEach((point) => {
      const key = getConnectionNodeId(point);
      endpointUsage.set(key, (endpointUsage.get(key) ?? 0) + 1);
    });
  });

  return endpointUsage;
};

const getCanvasV4GeometryWarnings = (entities: CanvasV4LineEntity[], closedContours: ProjectContourInfo[]) => {
  const closedSegmentIds = getContourSegmentIdSet(closedContours);
  const endpointUsage = getEndpointUsageCount(entities);
  const orphanSegmentIds: string[] = [];
  const openContourSegmentIds: string[] = [];

  entities.forEach((entity) => {
    if (closedSegmentIds.has(entity.segmentId)) {
      return;
    }

    const startUsage = endpointUsage.get(getConnectionNodeId(entity.startPoint)) ?? 0;
    const endUsage = endpointUsage.get(getConnectionNodeId(entity.endPoint)) ?? 0;

    if (startUsage <= 1 && endUsage <= 1) {
      orphanSegmentIds.push(entity.segmentId);
      return;
    }

    openContourSegmentIds.push(entity.segmentId);
  });

  return {
    orphanSegmentIds,
    openContourSegmentIds,
  };
};

const getBoundingBoxForPoints = (points: Point[]): BoundingBox | null => {
  if (points.length === 0) {
    return null;
  }

  return points.reduce<BoundingBox>(
    (box, point) => ({
      minX: Math.min(box.minX, point.x),
      maxX: Math.max(box.maxX, point.x),
      minY: Math.min(box.minY, point.y),
      maxY: Math.max(box.maxY, point.y),
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
  );
};

const createRoomCandidatesFromContours = (closedContours: ProjectContourInfo[]): CanvasV4RoomCandidate[] =>
  closedContours
    .map((contour, index) => {
      const bounds = getBoundingBoxForPoints(contour.vertices);

      if (!bounds) {
        return null;
      }

      return {
        candidateId: `room-candidate-${index + 1}-${contour.contourId}`,
        candidateContour: contour.vertices.map(clonePoint),
        candidateArea: Math.abs(contour.signedArea),
        candidateSegments: [...contour.segmentIds],
        candidateCenter: clonePoint(contour.centroid),
        candidateBounds: bounds,
      };
    })
    .filter((candidate): candidate is CanvasV4RoomCandidate => Boolean(candidate));

const createRoomsFromCandidates = (roomCandidates: CanvasV4RoomCandidate[]): CanvasV4RoomEntity[] =>
  roomCandidates.map((candidate, index) => ({
    roomId: `room-${index + 1}-${candidate.candidateId}`,
    roomContour: candidate.candidateContour.map(clonePoint),
    roomSegments: [...candidate.candidateSegments],
    roomArea: candidate.candidateArea,
    roomCenter: clonePoint(candidate.candidateCenter),
    roomBounds: cloneBoundingBox(candidate.candidateBounds),
    roomLabel: `Помещение ${index + 1}`,
    roomStatus: 'detected',
  }));

const detectCanvasV4ProjectInterpretation = (entities: CanvasV4LineEntity[]): CanvasV4ProjectValidationResult => {
  if (entities.length === 0) {
    return {
      projectValidationState: 'empty',
      roomDetectionState: 'blocked',
      closedContours: [],
      openContourSegmentIds: [],
      orphanSegmentIds: [],
      roomCandidates: [],
      rooms: [],
      lastValidationError: PROJECT_EMPTY_CANVAS_MESSAGE,
    };
  }

  const closedContours = recognizeProjectContours(entities);
  const warnings = getCanvasV4GeometryWarnings(entities, closedContours);

  if (closedContours.length === 0) {
    return {
      projectValidationState: 'invalid',
      roomDetectionState: 'blocked',
      closedContours,
      openContourSegmentIds: warnings.openContourSegmentIds,
      orphanSegmentIds: warnings.orphanSegmentIds,
      roomCandidates: [],
      rooms: [],
      lastValidationError: PROJECT_NO_ROOM_MESSAGE,
    };
  }

  const roomCandidates = createRoomCandidatesFromContours(closedContours);
  const rooms = createRoomsFromCandidates(roomCandidates);

  return {
    projectValidationState: 'valid',
    roomDetectionState: rooms.length > 0 ? 'detected' : 'blocked',
    closedContours,
    openContourSegmentIds: warnings.openContourSegmentIds,
    orphanSegmentIds: warnings.orphanSegmentIds,
    roomCandidates,
    rooms,
    lastValidationError: rooms.length > 0 ? null : PROJECT_NO_ROOM_MESSAGE,
  };
};

const isPointInsidePolygon = (point: Point, polygon: Point[]) => {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects = (current.y > point.y) !== (previous.y > point.y)
      && point.x < ((previous.x - current.x) * (point.y - current.y)) / ((previous.y - current.y) || 1) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const formatRoomArea = (areaMm2: number) => `${(areaMm2 / 1000000).toFixed(1)} м²`;

const getClosedContourOutwardNormal = (entity: CanvasV4LineEntity, contourInfo: ClosedContourInfo): Point => {
  const { leftNormal } = getSegmentUnitAndLeftNormal(entity.startPoint, entity.endPoint);

  return contourInfo.orientation === 'clockwise' ? scaleVector(leftNormal, -1) : leftNormal;
};


const getEntityEndpoint = (entity: CanvasV4LineEntity, endpointKey: 'startPoint' | 'endPoint') => (endpointKey === 'startPoint' ? entity.startPoint : entity.endPoint);

const getEntityOutwardNormal = (entity: CanvasV4LineEntity, entities: CanvasV4LineEntity[]): Point => {
  const { leftNormal } = getSegmentUnitAndLeftNormal(entity.startPoint, entity.endPoint);

  if (entity.segmentType !== 'external') {
    return leftNormal;
  }

  const contourInfo = getClosedPolylineInfoForEntity(entity, entities);

  if (!contourInfo) {
    return getPreferredOpenLineNormal(leftNormal);
  }

  return getClosedContourOutwardNormal(entity, contourInfo);
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

const EMPTY_DIMENSION_NEIGHBOR_INFO: DimensionNeighborInfo = {
  hasAbove: false,
  hasBelow: false,
  hasLeft: false,
  hasRight: false,
  nearestAboveMm: null,
  nearestBelowMm: null,
  nearestLeftMm: null,
  nearestRightMm: null,
};

const getDefaultDimensionSpatialAnalysis = (normal: Point): DimensionSpatialAnalysis => {
  let side: DimensionSide;

  if (Math.abs(normal.x) > Math.abs(normal.y)) {
    side = normal.x < 0 ? 'left' : 'right';
  } else {
    side = normal.y < 0 ? 'top' : 'bottom';
  }

  return {
    side,
    role: 'unknown',
    neighborInfo: EMPTY_DIMENSION_NEIGHBOR_INFO,
    isHorizontalLike: side === 'top' || side === 'bottom',
    isVerticalLike: side === 'left' || side === 'right',
  };
};

const getDimensionSideNormal = (side: DimensionSide): Point => {
  switch (side) {
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: -1 };
  }
};

const getEntityBoundingBox = (entity: CanvasV4LineEntity): BoundingBox => ({
  minX: Math.min(entity.startPoint.x, entity.endPoint.x),
  maxX: Math.max(entity.startPoint.x, entity.endPoint.x),
  minY: Math.min(entity.startPoint.y, entity.endPoint.y),
  maxY: Math.max(entity.startPoint.y, entity.endPoint.y),
});

const getDimensionProjectBoundingBox = (entities: CanvasV4LineEntity[]): BoundingBox | null => {
  if (entities.length === 0) {
    return null;
  }

  return entities.reduce<BoundingBox>((box, entity) => {
    const entityBox = getEntityBoundingBox(entity);

    return {
      minX: Math.min(box.minX, entityBox.minX),
      maxX: Math.max(box.maxX, entityBox.maxX),
      minY: Math.min(box.minY, entityBox.minY),
      maxY: Math.max(box.maxY, entityBox.maxY),
    };
  }, getEntityBoundingBox(entities[0]));
};

const rangesOverlap = (aMin: number, aMax: number, bMin: number, bMax: number, padding = 0) => aMax + padding >= bMin && bMax + padding >= aMin;

const getNearestNeighborInfo = (entity: CanvasV4LineEntity, entities: CanvasV4LineEntity[]): DimensionNeighborInfo => {
  const entityBox = getEntityBoundingBox(entity);
  const centerX = (entityBox.minX + entityBox.maxX) / 2;
  const centerY = (entityBox.minY + entityBox.maxY) / 2;
  let nearestAboveMm: number | null = null;
  let nearestBelowMm: number | null = null;
  let nearestLeftMm: number | null = null;
  let nearestRightMm: number | null = null;

  entities.forEach((candidate) => {
    if (candidate.entityId === entity.entityId) {
      return;
    }

    const candidateBox = getEntityBoundingBox(candidate);
    const candidateCenterX = (candidateBox.minX + candidateBox.maxX) / 2;
    const candidateCenterY = (candidateBox.minY + candidateBox.maxY) / 2;

    if (rangesOverlap(entityBox.minX, entityBox.maxX, candidateBox.minX, candidateBox.maxX, DIMENSION_SPATIAL_PROJECTION_PADDING_MM)) {
      if (candidateCenterY < centerY) {
        const distance = Math.max(0, entityBox.minY - candidateBox.maxY);
        nearestAboveMm = nearestAboveMm === null ? distance : Math.min(nearestAboveMm, distance);
      }

      if (candidateCenterY > centerY) {
        const distance = Math.max(0, candidateBox.minY - entityBox.maxY);
        nearestBelowMm = nearestBelowMm === null ? distance : Math.min(nearestBelowMm, distance);
      }
    }

    if (rangesOverlap(entityBox.minY, entityBox.maxY, candidateBox.minY, candidateBox.maxY, DIMENSION_SPATIAL_PROJECTION_PADDING_MM)) {
      if (candidateCenterX < centerX) {
        const distance = Math.max(0, entityBox.minX - candidateBox.maxX);
        nearestLeftMm = nearestLeftMm === null ? distance : Math.min(nearestLeftMm, distance);
      }

      if (candidateCenterX > centerX) {
        const distance = Math.max(0, candidateBox.minX - entityBox.maxX);
        nearestRightMm = nearestRightMm === null ? distance : Math.min(nearestRightMm, distance);
      }
    }
  });

  return {
    hasAbove: nearestAboveMm !== null && nearestAboveMm <= DIMENSION_SPATIAL_NEIGHBOR_DISTANCE_MM,
    hasBelow: nearestBelowMm !== null && nearestBelowMm <= DIMENSION_SPATIAL_NEIGHBOR_DISTANCE_MM,
    hasLeft: nearestLeftMm !== null && nearestLeftMm <= DIMENSION_SPATIAL_NEIGHBOR_DISTANCE_MM,
    hasRight: nearestRightMm !== null && nearestRightMm <= DIMENSION_SPATIAL_NEIGHBOR_DISTANCE_MM,
    nearestAboveMm,
    nearestBelowMm,
    nearestLeftMm,
    nearestRightMm,
  };
};

const getDimensionSpatialAnalysis = (entity: CanvasV4LineEntity, entities: CanvasV4LineEntity[], closedContourOutwardNormal: Point | null): DimensionSpatialAnalysis => {
  const angle = normalizeAngle(entity.angle);
  const isHorizontalLike = angularDistance(angle, 0) <= DIMENSION_AXIS_TOLERANCE_DEG || angularDistance(angle, 180) <= DIMENSION_AXIS_TOLERANCE_DEG;
  const isVerticalLike = angularDistance(angle, 90) <= DIMENSION_AXIS_TOLERANCE_DEG || angularDistance(angle, 270) <= DIMENSION_AXIS_TOLERANCE_DEG;
  const fallbackNormal = closedContourOutwardNormal ?? getPreferredOpenLineNormal(getSegmentUnitAndLeftNormal(entity.startPoint, entity.endPoint).leftNormal);
  const fallback = getDefaultDimensionSpatialAnalysis(fallbackNormal);
  const projectBox = getDimensionProjectBoundingBox(entities);

  if (!projectBox || (!isHorizontalLike && !isVerticalLike)) {
    return {
      ...fallback,
      neighborInfo: getNearestNeighborInfo(entity, entities),
      isHorizontalLike,
      isVerticalLike,
    };
  }

  const entityBox = getEntityBoundingBox(entity);
  const neighborInfo = getNearestNeighborInfo(entity, entities);
  const touchesTopBoundary = Math.abs(entityBox.minY - projectBox.minY) <= DIMENSION_BOUNDARY_EPSILON_MM;
  const touchesBottomBoundary = Math.abs(entityBox.maxY - projectBox.maxY) <= DIMENSION_BOUNDARY_EPSILON_MM;
  const touchesLeftBoundary = Math.abs(entityBox.minX - projectBox.minX) <= DIMENSION_BOUNDARY_EPSILON_MM;
  const touchesRightBoundary = Math.abs(entityBox.maxX - projectBox.maxX) <= DIMENSION_BOUNDARY_EPSILON_MM;
  let side = fallback.side;

  if (isHorizontalLike) {
    if (touchesTopBoundary) {
      side = 'top';
    } else if (touchesBottomBoundary) {
      side = 'bottom';
    } else if (!neighborInfo.hasAbove && neighborInfo.hasBelow) {
      side = 'top';
    } else if (neighborInfo.hasAbove && !neighborInfo.hasBelow) {
      side = 'bottom';
    } else if (closedContourOutwardNormal) {
      side = closedContourOutwardNormal.y < 0 ? 'top' : 'bottom';
    } else {
      side = fallback.side === 'bottom' ? 'bottom' : 'top';
    }
  }

  if (isVerticalLike) {
    if (touchesLeftBoundary) {
      side = 'left';
    } else if (touchesRightBoundary) {
      side = 'right';
    } else if (!neighborInfo.hasLeft && neighborInfo.hasRight) {
      side = 'left';
    } else if (neighborInfo.hasLeft && !neighborInfo.hasRight) {
      side = 'right';
    } else if (closedContourOutwardNormal) {
      side = closedContourOutwardNormal.x < 0 ? 'left' : 'right';
    } else {
      side = fallback.side === 'left' ? 'left' : 'right';
    }
  }

  const hasBothHorizontalSides = neighborInfo.hasAbove && neighborInfo.hasBelow;
  const hasBothVerticalSides = neighborInfo.hasLeft && neighborInfo.hasRight;
  const isInsideProjectBox = entityBox.minX > projectBox.minX + DIMENSION_BOUNDARY_EPSILON_MM
    && entityBox.maxX < projectBox.maxX - DIMENSION_BOUNDARY_EPSILON_MM
    && entityBox.minY > projectBox.minY + DIMENSION_BOUNDARY_EPSILON_MM
    && entityBox.maxY < projectBox.maxY - DIMENSION_BOUNDARY_EPSILON_MM;
  const role: SegmentSpatialRole = (isHorizontalLike && (touchesTopBoundary || touchesBottomBoundary || !neighborInfo.hasAbove || !neighborInfo.hasBelow))
    || (isVerticalLike && (touchesLeftBoundary || touchesRightBoundary || !neighborInfo.hasLeft || !neighborInfo.hasRight))
    ? 'external-like'
    : (isInsideProjectBox && ((isHorizontalLike && hasBothHorizontalSides) || (isVerticalLike && hasBothVerticalSides)) ? 'internal-like' : 'unknown');

  return {
    side,
    role,
    neighborInfo,
    isHorizontalLike,
    isVerticalLike,
  };
};

const getScreenLineStyle = (startPoint: Point, endPoint: Point, thickness = 1) => {
  const length = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
  const centerX = (startPoint.x + endPoint.x) / 2;
  const centerY = (startPoint.y + endPoint.y) / 2;
  const angleDeg = (Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x) * 180) / Math.PI;

  return {
    width: Math.max(length, 1),
    height: thickness,
    left: centerX - length / 2,
    top: centerY - thickness / 2,
    transform: [{ rotate: `${angleDeg}deg` }],
  };
};

const rectsOverlap = (a: ScreenRect, b: ScreenRect, padding = 0) => !(
  a.right + padding < b.left
  || a.left - padding > b.right
  || a.bottom + padding < b.top
  || a.top - padding > b.bottom
);

const getDimensionLabelRect = (placement: Pick<DimensionLabelPlacement, 'left' | 'top'>): ScreenRect => ({
  left: placement.left,
  top: placement.top,
  right: placement.left + LINE_DIMENSION_LABEL_WIDTH_PX,
  bottom: placement.top + LINE_DIMENSION_LABEL_HEIGHT_PX,
});

const getLineScreenRect = (startPoint: Point, endPoint: Point, padding = 4): ScreenRect => ({
  left: Math.min(startPoint.x, endPoint.x) - padding,
  top: Math.min(startPoint.y, endPoint.y) - padding,
  right: Math.max(startPoint.x, endPoint.x) + padding,
  bottom: Math.max(startPoint.y, endPoint.y) + padding,
});

const getDimensionLevel = (entity: CanvasV4LineEntity, spatialAnalysis: DimensionSpatialAnalysis): DimensionLevel => {
  if (entity.segmentType === 'external' || spatialAnalysis.role === 'external-like') {
    return 'external';
  }

  if (entity.segmentType === 'internal' && spatialAnalysis.role === 'internal-like' && entity.length >= ARCHITECTURAL_MAJOR_DIMENSION_MIN_MM) {
    return 'internal';
  }

  return 'detail';
};

const areDimensionsParallel = (first: DimensionSpatialAnalysis, second: DimensionSpatialAnalysis) => (
  (first.isHorizontalLike && second.isHorizontalLike) || (first.isVerticalLike && second.isVerticalLike)
);

const isDuplicateOfExternalDimension = (
  entity: CanvasV4LineEntity,
  entitySpatialAnalysis: DimensionSpatialAnalysis,
  externalEntity: CanvasV4LineEntity,
  externalSpatialAnalysis: DimensionSpatialAnalysis,
) => {
  if (!areDimensionsParallel(entitySpatialAnalysis, externalSpatialAnalysis)) {
    return false;
  }

  if (Math.abs(entity.length - externalEntity.length) > DIMENSION_DUPLICATE_LENGTH_TOLERANCE_MM) {
    return false;
  }

  const entityBox = getEntityBoundingBox(entity);
  const externalBox = getEntityBoundingBox(externalEntity);

  if (entitySpatialAnalysis.isHorizontalLike) {
    return rangesOverlap(entityBox.minX, entityBox.maxX, externalBox.minX, externalBox.maxX, DIMENSION_SPATIAL_PROJECTION_PADDING_MM);
  }

  return rangesOverlap(entityBox.minY, entityBox.maxY, externalBox.minY, externalBox.maxY, DIMENSION_SPATIAL_PROJECTION_PADDING_MM);
};

const formatNeighborDistance = (value: number | null) => (value === null ? 'null' : `${value.toFixed(0)}mm`);

const formatDimensionNeighborInfo = (neighborInfo?: DimensionNeighborInfo) => {
  if (!neighborInfo) {
    return 'null';
  }

  return `top:${neighborInfo.hasAbove ? 'near' : 'free'}(${formatNeighborDistance(neighborInfo.nearestAboveMm)}), bottom:${neighborInfo.hasBelow ? 'near' : 'free'}(${formatNeighborDistance(neighborInfo.nearestBelowMm)}), left:${neighborInfo.hasLeft ? 'near' : 'free'}(${formatNeighborDistance(neighborInfo.nearestLeftMm)}), right:${neighborInfo.hasRight ? 'near' : 'free'}(${formatNeighborDistance(neighborInfo.nearestRightMm)})`;
};

const getDimensionPlacement = (
  geometry: LineScreenGeometry,
  closedContourOutwardNormalScreen: Point | null,
  baseOffsetPx: number,
  spatialAnalysis?: DimensionSpatialAnalysis,
): DimensionLabelPlacement => {
  const dx = geometry.screenEnd.x - geometry.screenStart.x;
  const dy = geometry.screenEnd.y - geometry.screenStart.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const unitX = dx / length;
  const unitY = dy / length;
  const leftNormal = { x: -unitY, y: unitX };
  let offsetNormal = getPreferredOpenLineNormal(leftNormal);
  let placementMode: DimensionLabelPlacementMode = 'line-normal-offset';

  if (spatialAnalysis) {
    offsetNormal = getDimensionSideNormal(spatialAnalysis.side);
    placementMode = 'closed-contour-outside';
  } else if (closedContourOutwardNormalScreen) {
    offsetNormal = normalizeVector(closedContourOutwardNormalScreen);
    placementMode = 'closed-contour-outside';
  }

  const extensionStartA = {
    x: geometry.screenStart.x + offsetNormal.x * DIMENSION_EXTENSION_GAP_PX,
    y: geometry.screenStart.y + offsetNormal.y * DIMENSION_EXTENSION_GAP_PX,
  };
  const extensionEndA = {
    x: geometry.screenStart.x + offsetNormal.x * (baseOffsetPx + DIMENSION_EXTENSION_OVERHANG_PX),
    y: geometry.screenStart.y + offsetNormal.y * (baseOffsetPx + DIMENSION_EXTENSION_OVERHANG_PX),
  };
  const extensionStartB = {
    x: geometry.screenEnd.x + offsetNormal.x * DIMENSION_EXTENSION_GAP_PX,
    y: geometry.screenEnd.y + offsetNormal.y * DIMENSION_EXTENSION_GAP_PX,
  };
  const extensionEndB = {
    x: geometry.screenEnd.x + offsetNormal.x * (baseOffsetPx + DIMENSION_EXTENSION_OVERHANG_PX),
    y: geometry.screenEnd.y + offsetNormal.y * (baseOffsetPx + DIMENSION_EXTENSION_OVERHANG_PX),
  };
  const lineStart = {
    x: geometry.screenStart.x + offsetNormal.x * baseOffsetPx,
    y: geometry.screenStart.y + offsetNormal.y * baseOffsetPx,
  };
  const lineEnd = {
    x: geometry.screenEnd.x + offsetNormal.x * baseOffsetPx,
    y: geometry.screenEnd.y + offsetNormal.y * baseOffsetPx,
  };
  const labelAnchor = {
    x: geometry.centerX + offsetNormal.x * (baseOffsetPx + DIMENSION_LABEL_GAP_PX),
    y: geometry.centerY + offsetNormal.y * (baseOffsetPx + DIMENSION_LABEL_GAP_PX),
  };

  return {
    left: labelAnchor.x - LINE_DIMENSION_LABEL_WIDTH_PX / 2,
    top: labelAnchor.y - LINE_DIMENSION_LABEL_HEIGHT_PX / 2,
    rotationDeg: normalizeDimensionLabelRotation(geometry.angleDeg),
    offsetPx: baseOffsetPx,
    placementMode,
    lineStart,
    lineEnd,
    extensionStartA,
    extensionEndA,
    extensionStartB,
    extensionEndB,
    tickStart: lineStart,
    tickEnd: lineEnd,
    tickAngleDeg: normalizeDimensionLabelRotation(geometry.angleDeg + 45),
    side: spatialAnalysis?.side ?? getDefaultDimensionSpatialAnalysis(offsetNormal).side,
    spatialRole: spatialAnalysis?.role ?? 'unknown',
    neighborInfo: spatialAnalysis?.neighborInfo ?? EMPTY_DIMENSION_NEIGHBOR_INFO,
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
  const [dimensionDisplayMode, setDimensionDisplayMode] = useState<DimensionDisplayMode>('minimal');
  const [isInspectorVisible, setInspectorVisible] = useState(false);
  const [canvasEntryStep, setCanvasEntryStep] = useState<CanvasEntryStep>('start');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<TemplateCategory | null>(null);
  const [selectedTemplateVariant, setSelectedTemplateVariant] = useState<TemplateVariant | null>(null);
  const [lastTemplateAction, setLastTemplateAction] = useState<string>('null');
  const [currentToolMode, setCurrentToolMode] = useState<ToolMode>('select');
  const [newSegmentType] = useState<WallSegmentType>('internal');
  const [entities, setEntities] = useState<CanvasV4LineEntity[]>([]);
  const [doors, setDoors] = useState<CanvasV4Door[]>([]);
  const [windows, setWindows] = useState<CanvasV4Window[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [windowWidthInput, setWindowWidthInput] = useState(String(DEFAULT_WINDOW_WIDTH_MM));
  const [lastCreatedDoorId, setLastCreatedDoorId] = useState<string | null>(null);
  const [lastCreatedWindowId, setLastCreatedWindowId] = useState<string | null>(null);
  const [lineStartPoint, setLineStartPoint] = useState<Point | null>(null);
  const [polylineLastPoint, setPolylineLastPoint] = useState<Point | null>(null);
  const [activePolylineId, setActivePolylineId] = useState<string | null>(null);
  const [shapeStartPoint, setShapeStartPoint] = useState<Point | null>(null);
  const [lastShapeTool, setLastShapeTool] = useState<ShapeToolMode | 'none'>('none');
  const [lastCreatedShapeId, setLastCreatedShapeId] = useState<string | null>(null);
  const [lastCreatedShapeType, setLastCreatedShapeType] = useState<ShapeToolMode | 'none'>('none');
  const [lastCreatedShapeSegmentCount, setLastCreatedShapeSegmentCount] = useState(0);
  const [lastSelectedShapeAction, setLastSelectedShapeAction] = useState<string>('null');
  const [autoResetTriggered, setAutoResetTriggered] = useState(false);
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
  const [lastDoorAction, setLastDoorAction] = useState<string>('null');
  const [lastWindowAction, setLastWindowAction] = useState<string>('null');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [transformMode, setTransformMode] = useState<TransformMode>('idle');
  const [activeHandleId, setActiveHandleId] = useState<TransformHandleId | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeAxis, setResizeAxis] = useState<ResizeAxis>('none');
  const [resizeScale, setResizeScale] = useState({ x: 1, y: 1 });
  const [hitTestTargetType, setHitTestTargetType] = useState<HitTestTargetType>('empty-canvas');
  const [lastHitTestEntityId, setLastHitTestEntityId] = useState<string | null>(null);
  const [currentCanvasMode, setCurrentCanvasMode] = useState<CanvasV4Mode>('plan');
  const [projectState, setProjectState] = useState<CanvasV4ProjectState | null>(null);
  const [projectValidationMessage, setProjectValidationMessage] = useState<string | null>(null);
  const [lastValidationError, setLastValidationError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const projectCreated = currentCanvasMode === 'project' && Boolean(projectState);

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
  const activeShapeStartPoint = isShapeToolMode(currentToolMode) ? shapeStartPoint : null;

  const projectInterpretation = useMemo(() => detectCanvasV4ProjectInterpretation(entities), [entities]);
  const projectContours = useMemo(
    () => (currentCanvasMode === 'project' ? projectInterpretation.closedContours : []),
    [currentCanvasMode, projectInterpretation.closedContours],
  );
  const projectRooms = useMemo(
    () => (currentCanvasMode === 'project' ? projectInterpretation.rooms : []),
    [currentCanvasMode, projectInterpretation.rooms],
  );
  const projectWarningSegmentIds = useMemo(
    () => (currentCanvasMode === 'project'
      ? new Set([...projectInterpretation.openContourSegmentIds, ...projectInterpretation.orphanSegmentIds])
      : new Set<string>()),
    [currentCanvasMode, projectInterpretation.openContourSegmentIds, projectInterpretation.orphanSegmentIds],
  );
  const shapeGroups = useMemo(() => getShapeGroups(entities), [entities]);
  const shapeGroupById = useMemo(() => new Map(shapeGroups.map((group) => [group.shapeId, group])), [shapeGroups]);
  const shapeGroupByEntityId = useMemo(() => {
    const groupsByEntityId = new Map<string, ShapeGeometryGroup>();

    shapeGroups.forEach((group) => {
      group.segments.forEach((segment) => groupsByEntityId.set(segment.entityId, group));
    });

    return groupsByEntityId;
  }, [shapeGroups]);
  const entityBySegmentId = useMemo(() => new Map(entities.map((entity) => [entity.segmentId, entity])), [entities]);
  const smoothCircleShapeGroups = useMemo(
    () => (dimensionDisplayMode === 'full'
      ? []
      : shapeGroups.filter((group) => group.shapeType === 'circle' && group.centerPoint && group.radiusX && group.radiusY)),
    [dimensionDisplayMode, shapeGroups],
  );
  const circleVisualMode: CircleVisualMode = dimensionDisplayMode === 'full' ? 'segmented' : 'smooth';

  const createProjectStub = useCallback(() => {
    if (projectInterpretation.projectValidationState === 'empty') {
      setProjectValidationMessage(PROJECT_EMPTY_CANVAS_MESSAGE);
      setLastValidationError(PROJECT_EMPTY_CANVAS_MESSAGE);
      setSelectedRoomId(null);
      setLastActionType('CREATE_PROJECT_BLOCKED_EMPTY_CANVAS');
      return;
    }

    if (projectInterpretation.projectValidationState !== 'valid' || projectInterpretation.rooms.length === 0) {
      const validationError = projectInterpretation.lastValidationError ?? PROJECT_NO_ROOM_MESSAGE;
      setProjectValidationMessage(validationError);
      setLastValidationError(validationError);
      setSelectedRoomId(null);
      setLastActionType('CREATE_PROJECT_BLOCKED_NO_ROOM');
      return;
    }

    const activatedAt = Date.now();

    setProjectState({
      projectId: `canvas-v4-project-${activatedAt}`,
      createdAt: activatedAt,
      geometrySnapshot: cloneCanvasV4ProjectGeometrySnapshot(
        entities,
        doors,
        windows,
        projectInterpretation.roomCandidates,
        projectInterpretation.rooms,
        projectInterpretation.projectValidationState,
      ),
      roomCandidates: projectInterpretation.roomCandidates.map(cloneRoomCandidate),
      rooms: projectInterpretation.rooms.map(cloneRoomEntity),
      validationState: projectInterpretation.projectValidationState,
      validationError: null,
    });
    setCurrentCanvasMode('project');
    setProjectValidationMessage(null);
    setLastValidationError(null);
    setSelectedRoomId(null);
    setLastActionType('CREATE_PROJECT_ROOM_DETECTION_V1');
    setLineStartPoint(null);
    setPolylineLastPoint(null);
    setActivePolylineId(null);
    setShapeStartPoint(null);
    setSelectionBox(null);
  }, [doors, entities, projectInterpretation, windows]);

  const openManualDrawFlow = useCallback(() => {
    setCanvasEntryStep('canvas');
    setSelectedTemplateCategory(null);
    setSelectedTemplateVariant(null);
    setCurrentCanvasMode('plan');
    setCurrentToolMode('select');
    setLineStartPoint(null);
    setPolylineLastPoint(null);
    setActivePolylineId(null);
    setShapeStartPoint(null);
    setSelectedEntityIds([]);
    setSelectedDoorId(null);
    setSelectedWindowId(null);
    setSelectedRoomId(null);
    setProjectValidationMessage(null);
    setLastValidationError(null);
    setSelectionBox(null);
    setLastTemplateAction('OPEN_MANUAL_DRAW');
    setLastActionType('OPEN_MANUAL_DRAW_FLOW');
  }, []);

  const openTemplateCategories = useCallback(() => {
    setCanvasEntryStep('template-categories');
    setSelectedTemplateCategory(null);
    setSelectedTemplateVariant(null);
    setLastTemplateAction('OPEN_TEMPLATE_CATEGORIES');
  }, []);

  const selectTemplateCategory = useCallback((category: TemplateCategory) => {
    setSelectedTemplateCategory(category);

    if (category === 'apartment') {
      setCanvasEntryStep('apartment-gallery');
      setLastTemplateAction('OPEN_APARTMENT_TEMPLATE_GALLERY');
      return;
    }

    setLastTemplateAction(`TEMPLATE_CATEGORY_STUB_${category.toUpperCase()}`);
  }, []);

  const generateApartmentTemplate = useCallback((variant: ApartmentTemplateVariant) => {
    const generatedGeometry = createApartmentTemplateGeometry(variant);

    setEntities(generatedGeometry.entities);
    setDoors(generatedGeometry.doors);
    setWindows(generatedGeometry.windows);
    setSelectedEntityIds(generatedGeometry.selectedEntityIds);
    setSelectedDoorId(null);
    setSelectedWindowId(null);
    setSelectedRoomId(null);
    setWindowWidthInput(String(DEFAULT_WINDOW_WIDTH_MM));
    setCameraZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
    setLineStartPoint(null);
    setPolylineLastPoint(null);
    setActivePolylineId(null);
    setShapeStartPoint(null);
    setPointerWorldPoint(null);
    setSelectionBox(null);
    setInteractionMode('idle');
    setIsPanningCanvas(false);
    setIsMovingSelection(false);
    setTransformMode('idle');
    setActiveHandleId(null);
    setIsResizing(false);
    setResizeAxis('none');
    setResizeScale({ x: 1, y: 1 });
    setUndoStack([]);
    setRedoStack([]);
    setLastUndoAction('null');
    setLastRedoAction('null');
    setProjectState(null);
    setProjectValidationMessage(null);
    setLastValidationError(null);
    setCurrentCanvasMode('plan');
    setCurrentToolMode('select');
    setShowLineDimensions(true);
    setDimensionDisplayMode('minimal');
    setSelectedTemplateCategory('apartment');
    setSelectedTemplateVariant(variant);
    setCanvasEntryStep('canvas');
    setLastTemplateAction(`GENERATE_APARTMENT_TEMPLATE_${variant.toUpperCase()}`);
    setLastActionType(`GENERATE_APARTMENT_TEMPLATE_${variant.toUpperCase()}`);
  }, []);

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

  const shapePreview = useMemo<ShapePreview | null>(() => {
    if (!activeShapeStartPoint || !pointerWorldPoint || !isShapeToolMode(currentToolMode)) {
      return null;
    }

    const endPoint = activeSnap.point;

    if (currentToolMode === 'rectangle') {
      const width = Math.abs(endPoint.x - activeShapeStartPoint.x);
      const height = Math.abs(endPoint.y - activeShapeStartPoint.y);

      if (width <= 0.000001 || height <= 0.000001) {
        return null;
      }

      const points = getRectangleCornerPoints(activeShapeStartPoint, endPoint);
      const segments = getClosedPreviewSegments('rectangle', points);

      return {
        type: 'rectangle',
        startPoint: activeShapeStartPoint,
        endPoint,
        segments,
        segmentCount: segments.length,
      };
    }

    const radius = Math.hypot(endPoint.x - activeShapeStartPoint.x, endPoint.y - activeShapeStartPoint.y);

    if (radius <= 0.000001) {
      return null;
    }

    const points = getCircleApproximationPoints(activeShapeStartPoint, radius);
    const segments = getClosedPreviewSegments('circle', points);

    return {
      type: 'circle',
      startPoint: activeShapeStartPoint,
      endPoint,
      segments,
      segmentCount: segments.length,
    };
  }, [activeShapeStartPoint, activeSnap.point, currentToolMode, pointerWorldPoint]);

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
      const contourInfo = getClosedPolylineInfoForEntity(entity, entities);
      const outwardNormal = contourInfo ? getClosedContourOutwardNormal(entity, contourInfo) : null;
      const spatialAnalysis = getDimensionSpatialAnalysis(entity, entities, outwardNormal);
      const baseOffset = spatialAnalysis.role === 'internal-like' ? DIMENSION_INTERNAL_OFFSET_PX : DIMENSION_BASE_OFFSET_PX;
      return getDimensionPlacement(geometry, outwardNormal, baseOffset, spatialAnalysis);
    },
    [entities],
  );

  const getPreviewDimensionLabelPlacement = useCallback(
    (geometry: LineScreenGeometry) => getDimensionPlacement(geometry, null, DIMENSION_INTERNAL_OFFSET_PX),
    [],
  );

  const visibleDimensions = useMemo<DimensionScreenItem[]>(() => {
    if (!showLineDimensions) {
      return [];
    }

    const selectedDimensionEntityIds = new Set(selectedEntityIds);
    const selectedShapeIds = new Set(selectedEntityIds.map((entityId) => entities.find((entity) => entity.entityId === entityId)?.shapeId).filter((shapeId): shapeId is string => Boolean(shapeId)));
    const openingRects: ScreenRect[] = [...doors.map((door) => {
      const segment = entities.find((entity) => entity.segmentId === door.segmentId);

      if (!segment) {
        return null;
      }

      const center = worldToScreen(getPointOnSegmentAtDistance(segment, door.positionOnSegment));
      const size = Math.max(door.width * cameraZoom, 26);

      return {
        left: center.x - size / 2,
        top: center.y - 18,
        right: center.x + size / 2,
        bottom: center.y + 18,
      };
    }), ...windows.map((window) => {
      const segment = entities.find((entity) => entity.segmentId === window.segmentId);

      if (!segment) {
        return null;
      }

      const center = worldToScreen(getPointOnSegmentAtDistance(segment, window.positionOnSegment));
      const size = Math.max(window.width * cameraZoom, 26);

      return {
        left: center.x - size / 2,
        top: center.y - 14,
        right: center.x + size / 2,
        bottom: center.y + 14,
      };
    })].filter((rect): rect is ScreenRect => Boolean(rect));
    const wallRects = entities.map((entity) => {
      const geometry = getLineScreenGeometry(entity.startPoint, entity.endPoint);
      const wallPadding = Math.max(entity.wallThickness * cameraZoom, 8);
      return getLineScreenRect(geometry.screenStart, geometry.screenEnd, wallPadding);
    });
    const placedLabelRects: ScreenRect[] = [];
    const placedLineRects: ScreenRect[] = [];
    const createShapePlacement = (entity: CanvasV4LineEntity, side: DimensionSide) => {
      const geometry = getLineScreenGeometry(entity.startPoint, entity.endPoint);
      const spatialAnalysis: DimensionSpatialAnalysis = {
        side,
        role: 'external-like',
        neighborInfo: EMPTY_DIMENSION_NEIGHBOR_INFO,
        isHorizontalLike: side === 'top' || side === 'bottom',
        isVerticalLike: side === 'left' || side === 'right',
      };
      return getDimensionPlacement(geometry, null, DIMENSION_BASE_OFFSET_PX, spatialAnalysis);
    };
    const countDimensionCollisions = (placement: DimensionLabelPlacement) => {
      const labelRect = getDimensionLabelRect(placement);
      const lineRect = getLineScreenRect(placement.lineStart, placement.lineEnd, 3);
      const labelCollisions = [...openingRects, ...placedLabelRects, ...wallRects].filter((rect) => rectsOverlap(labelRect, rect, 6)).length;
      const lineCollisions = [...openingRects, ...placedLineRects, ...wallRects].filter((rect) => rectsOverlap(lineRect, rect, 6)).length;

      return labelCollisions + lineCollisions;
    };
    const pickShapePlacement = (candidates: Array<{ entity: CanvasV4LineEntity; side: DimensionSide }>) => {
      const placements = candidates.map((candidate) => ({
        ...candidate,
        placement: createShapePlacement(candidate.entity, candidate.side),
      }));

      return placements.sort((first, second) => countDimensionCollisions(first.placement) - countDimensionCollisions(second.placement))[0] ?? null;
    };
    const shapeDimensions = dimensionDisplayMode === 'full'
      ? []
      : shapeGroups.flatMap<DimensionScreenItem>((group) => {
        const shapeBox = group.boundingBox ?? getEntitiesBoundingBox(group.segments);
        const representativeEntity = group.segments[0];

        if (!shapeBox || !representativeEntity) {
          return [];
        }

        if (group.shapeType === 'rectangle') {
          if (group.segments.length !== 4) {
            return [];
          }

          const topEntity = group.segments.find((entity) => entity.shapeRole === 'top');
          const bottomEntity = group.segments.find((entity) => entity.shapeRole === 'bottom');
          const leftEntity = group.segments.find((entity) => entity.shapeRole === 'left');
          const rightEntity = group.segments.find((entity) => entity.shapeRole === 'right');
          const widthCandidate = pickShapePlacement([
            ...(topEntity ? [{ entity: topEntity, side: 'top' as DimensionSide }] : []),
            ...(bottomEntity ? [{ entity: bottomEntity, side: 'bottom' as DimensionSide }] : []),
          ]);
          const heightCandidate = pickShapePlacement([
            ...(leftEntity ? [{ entity: leftEntity, side: 'left' as DimensionSide }] : []),
            ...(rightEntity ? [{ entity: rightEntity, side: 'right' as DimensionSide }] : []),
          ]);
          const pickedRectangleCandidates = [widthCandidate, heightCandidate].filter((candidate): candidate is { entity: CanvasV4LineEntity; side: DimensionSide; placement: DimensionLabelPlacement } => Boolean(candidate));

          return pickedRectangleCandidates.map((candidate, index) => {
            const item: DimensionScreenItem = {
              id: `${group.shapeId}:shape-dimension-${index}`,
              entity: candidate.entity,
              level: 'shape',
              placement: candidate.placement,
              label: formatLineLength(candidate.entity.length),
              isSelected: selectedShapeIds.has(group.shapeId),
            };
            placedLabelRects.push(getDimensionLabelRect(candidate.placement));
            placedLineRects.push(getLineScreenRect(candidate.placement.lineStart, candidate.placement.lineEnd, 3));
            return item;
          });
        }

        if (group.segments.length !== CIRCLE_SHAPE_SEGMENT_COUNT) {
          return [];
        }

        const centerPoint = group.centerPoint ?? {
          x: (shapeBox.minX + shapeBox.maxX) / 2,
          y: (shapeBox.minY + shapeBox.maxY) / 2,
        };
        const width = shapeBox.maxX - shapeBox.minX;
        const height = shapeBox.maxY - shapeBox.minY;
        const diameter = group.diameter ?? Math.max(shapeBox.maxX - shapeBox.minX, shapeBox.maxY - shapeBox.minY);
        const isHorizontalDiameter = width >= height;
        const screenStart = isHorizontalDiameter
          ? worldToScreen({ x: shapeBox.minX, y: centerPoint.y })
          : worldToScreen({ x: centerPoint.x, y: shapeBox.minY });
        const screenEnd = isHorizontalDiameter
          ? worldToScreen({ x: shapeBox.maxX, y: centerPoint.y })
          : worldToScreen({ x: centerPoint.x, y: shapeBox.maxY });
        const geometry: LineScreenGeometry = {
          length: Math.max(Math.hypot(screenEnd.x - screenStart.x, screenEnd.y - screenStart.y), 1),
          centerX: (screenStart.x + screenEnd.x) / 2,
          centerY: (screenStart.y + screenEnd.y) / 2,
          angleDeg: isHorizontalDiameter ? 0 : 90,
          screenStart,
          screenEnd,
        };
        const placement = getDimensionPlacement(geometry, null, DIMENSION_BASE_OFFSET_PX, {
          side: isHorizontalDiameter ? 'top' : 'right',
          role: 'external-like',
          neighborInfo: EMPTY_DIMENSION_NEIGHBOR_INFO,
          isHorizontalLike: isHorizontalDiameter,
          isVerticalLike: !isHorizontalDiameter,
        });
        const item: DimensionScreenItem = {
          id: `${group.shapeId}:diameter-dimension`,
          entity: representativeEntity,
          level: 'shape',
          placement,
          label: `Ø ${formatLineLength(diameter)}`,
          isSelected: selectedShapeIds.has(group.shapeId),
        };
        placedLabelRects.push(getDimensionLabelRect(placement));
        placedLineRects.push(getLineScreenRect(placement.lineStart, placement.lineEnd, 3));
        return [item];
      });
    const nonDebugShapeIds = new Set(shapeGroups.map((group) => group.shapeId));
    const dimensionCandidates = entities.map((entity) => {
      const contourInfo = getClosedPolylineInfoForEntity(entity, entities);
      const closedContourOutwardNormal = contourInfo ? getClosedContourOutwardNormal(entity, contourInfo) : null;
      const spatialAnalysis = getDimensionSpatialAnalysis(entity, entities, closedContourOutwardNormal);
      const level = getDimensionLevel(entity, spatialAnalysis);

      return {
        entity,
        closedContourOutwardNormal,
        spatialAnalysis,
        level,
      };
    });
    const visibleCandidates = dimensionCandidates.filter((candidate) => {
      if (dimensionDisplayMode === 'full') {
        return true;
      }

      if (candidate.entity.shapeId && nonDebugShapeIds.has(candidate.entity.shapeId)) {
        return false;
      }

      if (candidate.level === 'detail') {
        return false;
      }

      if (candidate.level === 'internal') {
        return !dimensionCandidates.some((externalCandidate) => (
          externalCandidate.level === 'external'
          && externalCandidate.entity.entityId !== candidate.entity.entityId
          && isDuplicateOfExternalDimension(candidate.entity, candidate.spatialAnalysis, externalCandidate.entity, externalCandidate.spatialAnalysis)
        ));
      }

      return true;
    }).sort((first, second) => {
      const levelPriority: Record<DimensionLevel, number> = {
        shape: 0,
        external: 1,
        internal: 2,
        detail: 3,
      };

      return levelPriority[first.level] - levelPriority[second.level] || second.entity.length - first.entity.length;
    });

    const segmentDimensions = visibleCandidates.flatMap((candidate) => {
      const { entity, closedContourOutwardNormal, level, spatialAnalysis } = candidate;
      const isSelected = selectedDimensionEntityIds.has(entity.entityId);
      const geometry = getLineScreenGeometry(entity.startPoint, entity.endPoint);
      const baseOffset = dimensionDisplayMode === 'full'
        ? (spatialAnalysis.role === 'internal-like' ? DIMENSION_INTERNAL_OFFSET_PX : DIMENSION_BASE_OFFSET_PX + 8)
        : (level === 'internal' ? DIMENSION_INTERNAL_OFFSET_PX : DIMENSION_BASE_OFFSET_PX);
      const collisionStep = dimensionDisplayMode === 'architectural' && level === 'internal' ? 6 : DIMENSION_COLLISION_STEP_PX;
      const maxOffset = dimensionDisplayMode === 'architectural' && level === 'internal'
        ? DIMENSION_BASE_OFFSET_PX - 4
        : Number.POSITIVE_INFINITY;
      let placement = getDimensionPlacement(geometry, closedContourOutwardNormal, baseOffset, spatialAnalysis);
      let collisionAvoidancePasses = 0;
      const labelObstacles = dimensionDisplayMode === 'full' ? [...openingRects, ...placedLabelRects] : [...openingRects, ...placedLabelRects, ...wallRects];
      const lineObstacles = dimensionDisplayMode === 'full' ? [...openingRects, ...placedLineRects] : [...openingRects, ...placedLineRects, ...wallRects];
      let hasCollision = labelObstacles.some((rect) => rectsOverlap(getDimensionLabelRect(placement), rect, 6))
        || lineObstacles.some((rect) => rectsOverlap(getLineScreenRect(placement.lineStart, placement.lineEnd, 3), rect, 6));

      while (collisionAvoidancePasses < DIMENSION_MAX_COLLISION_PASSES && hasCollision) {
        const nextOffset = baseOffset + (collisionAvoidancePasses + 1) * collisionStep;

        if (nextOffset > maxOffset) {
          break;
        }

        collisionAvoidancePasses += 1;
        placement = getDimensionPlacement(geometry, closedContourOutwardNormal, nextOffset, spatialAnalysis);
        hasCollision = labelObstacles.some((rect) => rectsOverlap(getDimensionLabelRect(placement), rect, 6))
          || lineObstacles.some((rect) => rectsOverlap(getLineScreenRect(placement.lineStart, placement.lineEnd, 3), rect, 6));
      }

      if (hasCollision && dimensionDisplayMode !== 'full') {
        return [];
      }

      placedLabelRects.push(getDimensionLabelRect(placement));
      placedLineRects.push(getLineScreenRect(placement.lineStart, placement.lineEnd, 3));

      return [{
        id: `${entity.entityId}:dimension`,
        entity,
        level,
        placement,
        label: formatLineLength(entity.length),
        isSelected,
      }];
    });

    return [...shapeDimensions, ...segmentDimensions];
  }, [cameraZoom, dimensionDisplayMode, doors, entities, getLineScreenGeometry, selectedEntityIds, shapeGroups, showLineDimensions, windows, worldToScreen]);

  const dimensionCollisionAvoidance = visibleDimensions.some((dimension) => dimension.placement.offsetPx > (dimension.placement.spatialRole === 'internal-like' ? DIMENSION_INTERNAL_OFFSET_PX : DIMENSION_BASE_OFFSET_PX));
  const dimensionOffsetPx = visibleDimensions.length > 0
    ? Math.max(...visibleDimensions.map((dimension) => dimension.placement.offsetPx))
    : 0;

  const cycleDimensionDisplayMode = useCallback(() => {
    setDimensionDisplayMode((current) => {
      if (current === 'minimal') {
        return 'architectural';
      }

      if (current === 'architectural') {
        return 'full';
      }

      return 'minimal';
    });
  }, []);

  const dimensionDisplayModeLabel = dimensionDisplayMode === 'minimal'
    ? 'Minimal'
    : dimensionDisplayMode === 'architectural'
      ? 'Architectural'
      : 'Full';

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

  const findCircleShapeAtWorldPoint = useCallback(
    (worldPoint: Point) => {
      if (dimensionDisplayMode === 'full') {
        return null;
      }

      const tolerance = HIT_TOLERANCE_PX / cameraZoom;

      return [...shapeGroups]
        .reverse()
        .find((group) => {
          if (group.shapeType !== 'circle' || !group.centerPoint || !group.radiusX || !group.radiusY) {
            return false;
          }

          const normalizedDistance = Math.hypot(
            (worldPoint.x - group.centerPoint.x) / Math.max(group.radiusX, 1),
            (worldPoint.y - group.centerPoint.y) / Math.max(group.radiusY, 1),
          );
          const boundaryDistance = Math.abs(normalizedDistance - 1) * Math.max(group.radiusX, group.radiusY);

          return boundaryDistance <= tolerance;
        })?.shapeId ?? null;
    },
    [cameraZoom, dimensionDisplayMode, shapeGroups],
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

          return alongDistance <= door.width / 2 + tolerance && centerDistance <= door.width + tolerance;
        })?.doorId ?? null;
    },
    [cameraZoom, doors, entities],
  );

  const findWindowAtWorldPoint = useCallback(
    (worldPoint: Point) => {
      const tolerance = WINDOW_HIT_TOLERANCE_PX / cameraZoom;
      const segmentsById = new Map(entities.map((entity) => [entity.segmentId, entity]));

      return [...windows]
        .reverse()
        .find((window) => {
          const segment = segmentsById.get(window.segmentId);

          if (!segment) {
            return false;
          }

          const centerPoint = getPointOnSegmentAtDistance(segment, window.positionOnSegment);
          const alongDistance = Math.abs(projectPointToSegment(worldPoint, segment).positionOnSegment - window.positionOnSegment);
          const centerDistance = Math.hypot(worldPoint.x - centerPoint.x, worldPoint.y - centerPoint.y);

          return alongDistance <= window.width / 2 + tolerance && centerDistance <= window.width / 2 + tolerance;
        })?.windowId ?? null;
    },
    [cameraZoom, entities, windows],
  );

  const selectedEntities = useMemo(() => {
    const selectedSet = new Set(selectedEntityIds);
    return entities.filter((entity) => selectedSet.has(entity.entityId));
  }, [entities, selectedEntityIds]);

  const selectedDoor = useMemo(() => doors.find((door) => door.doorId === selectedDoorId) ?? null, [doors, selectedDoorId]);
  const selectedWindow = useMemo(() => windows.find((window) => window.windowId === selectedWindowId) ?? null, [selectedWindowId, windows]);
  const selectedRoom = useMemo(() => projectRooms.find((room) => room.roomId === selectedRoomId) ?? null, [projectRooms, selectedRoomId]);
  const selectedBoundingBox = useMemo(() => getEntitiesBoundingBox(selectedEntities), [selectedEntities]);
  const selectedSegment = selectedEntities.length === 1 ? selectedEntities[0] : null;
  const selectedLineLength = selectedSegment?.length ?? null;
  const selectedShapeId = useMemo(() => {
    if (selectedSegment?.shapeId) {
      return selectedSegment.shapeId;
    }

    const selectedShapeIds = Array.from(new Set(selectedEntities.map((entity) => entity.shapeId).filter((shapeId): shapeId is string => Boolean(shapeId))));
    return selectedShapeIds.length === 1 ? selectedShapeIds[0] : null;
  }, [selectedEntities, selectedSegment]);
  const selectedShapeGroup = selectedShapeId ? shapeGroupById.get(selectedShapeId) ?? null : null;
  const selectedShapeType = selectedShapeGroup?.shapeType ?? selectedSegment?.shapeType ?? null;
  const selectedShapeSegmentCount = selectedShapeGroup?.segments.length ?? 0;
  const selectedCircleCenterPoint = selectedShapeType === 'circle'
    ? selectedShapeGroup?.centerPoint ?? selectedSegment?.shapeCenterPoint ?? null
    : null;
  const selectedCircleRadius = selectedShapeType === 'circle'
    ? selectedShapeGroup?.radius ?? selectedSegment?.shapeRadius ?? null
    : null;
  const selectedCircleDiameter = selectedShapeType === 'circle'
    ? selectedShapeGroup?.diameter ?? selectedSegment?.shapeDiameter ?? null
    : null;
  const findRoomAtWorldPoint = useCallback(
    (point: Point) => {
      if (currentCanvasMode !== 'project') {
        return null;
      }

      return [...projectRooms].reverse().find((room) => isPointInsidePolygon(point, room.roomContour))?.roomId ?? null;
    },
    [currentCanvasMode, projectRooms],
  );
  const shapeDimensionMode = !showLineDimensions
    ? 'hidden'
    : dimensionDisplayMode === 'full'
      ? 'segment-debug'
      : 'shape-summary';

  useEffect(() => {
    setWindowWidthInput(selectedWindow ? String(Math.round(selectedWindow.width)) : String(DEFAULT_WINDOW_WIDTH_MM));
  }, [selectedWindow]);

  useEffect(() => {
    if (selectedRoomId && !projectRooms.some((room) => room.roomId === selectedRoomId)) {
      setSelectedRoomId(null);
    }
  }, [projectRooms, selectedRoomId]);

  useEffect(() => {
    if (projectValidationMessage) {
      setProjectValidationMessage(null);
    }
  }, [entities]);

  const transformHandles = useMemo(() => {
    if (!selectedDoorId && !selectedWindowId && selectedEntities.length === 1) {
      const entity = selectedEntities[0];
      return [
        { id: 'single-start' as TransformHandleId, point: entity.startPoint, axis: 'xy' as ResizeAxis },
        { id: 'single-end' as TransformHandleId, point: entity.endPoint, axis: 'xy' as ResizeAxis },
      ];
    }

    if (!selectedDoorId && !selectedWindowId && selectedEntities.length > 1 && selectedBoundingBox) {
      const handleIds: TransformHandleId[] = ['bbox-nw', 'bbox-n', 'bbox-ne', 'bbox-e', 'bbox-se', 'bbox-s', 'bbox-sw', 'bbox-w'];
      return handleIds.map((id) => ({ id, point: getBoundingBoxHandlePoint(selectedBoundingBox, id), axis: getResizeAxisForHandle(id) }));
    }

    return [];
  }, [selectedBoundingBox, selectedDoorId, selectedEntities, selectedWindowId]);

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
      setLastDoorAction('DELETE_DOOR');
      setLastActionType('DELETE_DOOR');
      return;
    }

    if (selectedWindowId) {
      const windowIndex = windows.findIndex((window) => window.windowId === selectedWindowId);
      const window = windowIndex >= 0 ? windows[windowIndex] : null;
      const beforeEntity = window ? entities.find((entity) => entity.segmentId === window.segmentId) ?? null : null;

      if (!window || !beforeEntity) {
        return;
      }

      const afterEntity = withWindowDetachedFromSegment(beforeEntity, window.windowId);
      pushHistoryAction({ type: 'DELETE_WINDOW', window, windowIndex, beforeEntity, afterEntity });
      setWindows((current) => current.filter((item) => item.windowId !== window.windowId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === afterEntity.entityId ? afterEntity : entity))));
      setSelectedWindowId(null);
      setLastWindowAction('DELETE_WINDOW');
      setLastActionType('DELETE_WINDOW');
      return;
    }

    if (selectedEntityIds.length === 0) {
      return;
    }

    const selectedSet = expandEntityIdsToShapeGroups(selectedEntityIds, entities, shapeGroups);
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
    const deletedWindows = windows
      .map((window, index) => ({ window, index }))
      .filter(({ window }) => deletedSegmentIds.has(window.segmentId));
    const deletedDoorIds = new Set(deletedDoors.map(({ door }) => door.doorId));
    const deletedWindowIds = new Set(deletedWindows.map(({ window }) => window.windowId));
    const action: HistoryAction =
      deletedEntities.length === 1
        ? { type: 'DELETE_WALL_SEGMENT', entity: deletedEntities[0].entity, index: deletedEntities[0].index, doors: deletedDoors, windows: deletedWindows }
        : { type: 'DELETE_SELECTED_WALL_SEGMENTS', entities: deletedEntities, doors: deletedDoors, windows: deletedWindows };

    pushHistoryAction(action);
    setEntities((current) => normalizeWallSegmentConnectivity(current.filter((entity) => !selectedSet.has(entity.entityId))));
    setDoors((current) => current.filter((door) => !deletedDoorIds.has(door.doorId)));
    setWindows((current) => current.filter((window) => !deletedWindowIds.has(window.windowId)));
    setSelectedEntityIds([]);
    setSelectedDoorId(null);
    setSelectedWindowId(null);
    setLastSelectedShapeAction(deletedEntities.some(({ entity }) => entity.shapeId) ? 'DELETE_SHAPE_GROUP' : 'null');
  }, [doors, entities, pushHistoryAction, selectedDoorId, selectedEntityIds, selectedWindowId, shapeGroups, windows]);

  const applyHistoryUndo = useCallback((action: HistoryAction) => {
    if (action.type === 'CREATE_WALL_SEGMENT' || action.type === 'CREATE_POLYLINE_WALL_SEGMENT') {
      setEntities((current) => normalizeWallSegmentConnectivity(current.filter((entity) => entity.entityId !== action.entity.entityId)));
      setSelectedEntityIds([]);
      return;
    }

    if (action.type === 'CREATE_RECTANGLE' || action.type === 'CREATE_CIRCLE') {
      const createdEntityIds = new Set(action.entities.map(({ entity }) => entity.entityId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.filter((entity) => !createdEntityIds.has(entity.entityId))));
      setSelectedEntityIds([]);
      setSelectedDoorId(null);
      setSelectedWindowId(null);
      return;
    }

    if (action.type === 'DELETE_WALL_SEGMENT') {
      setEntities((current) => normalizeWallSegmentConnectivity(insertEntityAtIndex(current, action.entity, action.index)));
      setDoors((current) =>
        [...action.doors]
          .sort((a, b) => a.index - b.index)
          .reduce((next, item) => insertDoorAtIndex(next, item.door, item.index), current),
      );
      setWindows((current) =>
        [...action.windows]
          .sort((a, b) => a.index - b.index)
          .reduce((next, item) => insertWindowAtIndex(next, item.window, item.index), current),
      );
      setSelectedEntityIds([action.entity.entityId]);
      setSelectedDoorId(null);
      setSelectedWindowId(null);
      setSelectedWindowId(null);
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
      setWindows((current) =>
        [...action.windows]
          .sort((a, b) => a.index - b.index)
          .reduce((next, item) => insertWindowAtIndex(next, item.window, item.index), current),
      );
      setSelectedEntityIds(action.entities.map(({ entity }) => entity.entityId));
      setSelectedDoorId(null);
      setSelectedWindowId(null);
      return;
    }

    if (action.type === 'CREATE_DOOR') {
      setDoors((current) => current.filter((door) => door.doorId !== action.door.doorId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.beforeEntity.entityId ? action.beforeEntity : entity))));
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      setLastDoorAction('UNDO_CREATE_DOOR');
      return;
    }

    if (action.type === 'DELETE_DOOR') {
      setDoors((current) => insertDoorAtIndex(current, action.door, action.doorIndex));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.beforeEntity.entityId ? action.beforeEntity : entity))));
      setSelectedDoorId(action.door.doorId);
      setSelectedWindowId(null);
      setSelectedEntityIds([]);
      setLastDoorAction('UNDO_DELETE_DOOR');
      return;
    }

    if (action.type === 'MOVE_DOOR' || action.type === 'CHANGE_DOOR_HINGE_SIDE' || action.type === 'CHANGE_DOOR_SWING_SIDE') {
      setDoors((current) => current.map((door) => (door.doorId === action.beforeDoor.doorId ? action.beforeDoor : door)));
      setSelectedDoorId(action.beforeDoor.doorId);
      setSelectedWindowId(null);
      setSelectedEntityIds([]);
      setLastDoorAction(`UNDO_${action.type}`);
      return;
    }

    if (action.type === 'CREATE_WINDOW') {
      setWindows((current) => current.filter((window) => window.windowId !== action.window.windowId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.beforeEntity.entityId ? action.beforeEntity : entity))));
      setSelectedWindowId(null);
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      setLastWindowAction('UNDO_CREATE_WINDOW');
      return;
    }

    if (action.type === 'DELETE_WINDOW') {
      setWindows((current) => insertWindowAtIndex(current, action.window, action.windowIndex));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.beforeEntity.entityId ? action.beforeEntity : entity))));
      setSelectedWindowId(action.window.windowId);
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      setLastWindowAction('UNDO_DELETE_WINDOW');
      return;
    }

    if (action.type === 'MOVE_WINDOW' || action.type === 'UPDATE_WINDOW_WIDTH') {
      setWindows((current) => current.map((window) => (window.windowId === action.beforeWindow.windowId ? action.beforeWindow : window)));
      setSelectedWindowId(action.beforeWindow.windowId);
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      setLastWindowAction(`UNDO_${action.type}`);
      return;
    }

    const beforeById = new Map(action.beforeEntities.map((entity) => [entity.entityId, entity]));
    setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => beforeById.get(entity.entityId) ?? entity)));
    setDoors(action.beforeDoors);
    setWindows(action.beforeWindows);
    setSelectedEntityIds(action.beforeEntities.map((entity) => entity.entityId));
    setSelectedDoorId(null);
    setSelectedWindowId(null);
  }, []);

  const applyHistoryRedo = useCallback((action: HistoryAction) => {
    if (action.type === 'CREATE_WALL_SEGMENT' || action.type === 'CREATE_POLYLINE_WALL_SEGMENT') {
      setEntities((current) => normalizeWallSegmentConnectivity(insertEntityAtIndex(current, action.entity, action.index)));
      setSelectedEntityIds([action.entity.entityId]);
      return;
    }

    if (action.type === 'CREATE_RECTANGLE' || action.type === 'CREATE_CIRCLE') {
      const orderedEntities = [...action.entities].sort((a, b) => a.index - b.index);
      setEntities((current) =>
        normalizeWallSegmentConnectivity(
          orderedEntities.reduce((next, item) => insertEntityAtIndex(next, item.entity, item.index), current),
        ),
      );
      setSelectedEntityIds(orderedEntities.map(({ entity }) => entity.entityId));
      setSelectedDoorId(null);
      setSelectedWindowId(null);
      setLastCreatedShapeId(orderedEntities[0]?.entity.shapeId ?? null);
      setLastCreatedShapeType(action.type === 'CREATE_RECTANGLE' ? 'rectangle' : 'circle');
      setLastCreatedShapeSegmentCount(orderedEntities.length);
      return;
    }

    if (action.type === 'DELETE_WALL_SEGMENT') {
      const deletedDoorIds = new Set(action.doors.map(({ door }) => door.doorId));
      const deletedWindowIds = new Set(action.windows.map(({ window }) => window.windowId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.filter((entity) => entity.entityId !== action.entity.entityId)));
      setDoors((current) => current.filter((door) => !deletedDoorIds.has(door.doorId)));
      setWindows((current) => current.filter((window) => !deletedWindowIds.has(window.windowId)));
      setSelectedEntityIds([]);
      setSelectedDoorId(null);
      setSelectedWindowId(null);
      return;
    }

    if (action.type === 'DELETE_SELECTED_WALL_SEGMENTS') {
      const deletedEntityIds = new Set(action.entities.map(({ entity }) => entity.entityId));
      const deletedDoorIds = new Set(action.doors.map(({ door }) => door.doorId));
      const deletedWindowIds = new Set(action.windows.map(({ window }) => window.windowId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.filter((entity) => !deletedEntityIds.has(entity.entityId))));
      setDoors((current) => current.filter((door) => !deletedDoorIds.has(door.doorId)));
      setWindows((current) => current.filter((window) => !deletedWindowIds.has(window.windowId)));
      setSelectedEntityIds([]);
      setSelectedDoorId(null);
      setSelectedWindowId(null);
      return;
    }

    if (action.type === 'CREATE_DOOR') {
      setDoors((current) => insertDoorAtIndex(current, action.door, action.doorIndex));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.afterEntity.entityId ? action.afterEntity : entity))));
      setSelectedDoorId(action.door.doorId);
      setSelectedWindowId(null);
      setSelectedEntityIds([]);
      setLastDoorAction('REDO_CREATE_DOOR');
      return;
    }

    if (action.type === 'DELETE_DOOR') {
      setDoors((current) => current.filter((door) => door.doorId !== action.door.doorId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.afterEntity.entityId ? action.afterEntity : entity))));
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      setLastDoorAction('REDO_DELETE_DOOR');
      return;
    }

    if (action.type === 'MOVE_DOOR' || action.type === 'CHANGE_DOOR_HINGE_SIDE' || action.type === 'CHANGE_DOOR_SWING_SIDE') {
      setDoors((current) => current.map((door) => (door.doorId === action.afterDoor.doorId ? action.afterDoor : door)));
      setSelectedDoorId(action.afterDoor.doorId);
      setSelectedWindowId(null);
      setSelectedEntityIds([]);
      setLastDoorAction(`REDO_${action.type}`);
      return;
    }

    if (action.type === 'CREATE_WINDOW') {
      setWindows((current) => insertWindowAtIndex(current, action.window, action.windowIndex));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.afterEntity.entityId ? action.afterEntity : entity))));
      setSelectedWindowId(action.window.windowId);
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      setLastWindowAction('REDO_CREATE_WINDOW');
      return;
    }

    if (action.type === 'DELETE_WINDOW') {
      setWindows((current) => current.filter((window) => window.windowId !== action.window.windowId));
      setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === action.afterEntity.entityId ? action.afterEntity : entity))));
      setSelectedWindowId(null);
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      setLastWindowAction('REDO_DELETE_WINDOW');
      return;
    }

    if (action.type === 'MOVE_WINDOW' || action.type === 'UPDATE_WINDOW_WIDTH') {
      setWindows((current) => current.map((window) => (window.windowId === action.afterWindow.windowId ? action.afterWindow : window)));
      setSelectedWindowId(action.afterWindow.windowId);
      setSelectedDoorId(null);
      setSelectedEntityIds([]);
      setLastWindowAction(`REDO_${action.type}`);
      return;
    }

    const afterById = new Map(action.afterEntities.map((entity) => [entity.entityId, entity]));
    setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => afterById.get(entity.entityId) ?? entity)));
    setDoors(action.afterDoors);
    setWindows(action.afterWindows);
    setSelectedEntityIds(action.afterEntities.map((entity) => entity.entityId));
    setSelectedDoorId(null);
    setSelectedWindowId(null);
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
      const intersectedIds = new Set(entities.filter((entity) => doesLineIntersectRect(entity, worldRect)).map((entity) => entity.entityId));
      const selectedIds = expandEntityIdsToShapeGroups(intersectedIds, entities, shapeGroups);

      shapeGroups.forEach((group) => {
        const box = getEntitiesBoundingBox(group.segments);

        if (box && isBoundingBoxInsideRect(box, worldRect)) {
          group.segments.forEach((segment) => selectedIds.add(segment.entityId));
        }
      });

      const nextSelectedIds = entities.filter((entity) => selectedIds.has(entity.entityId)).map((entity) => entity.entityId);

      setSelectedEntityIds(nextSelectedIds);
      setSelectedDoorId(null);
      setSelectedWindowId(null);
      setSelectionMode('box');
      setLastActionType(nextSelectedIds.length > 0 ? 'SELECTION_BOX_SELECT' : 'SELECTION_BOX_CLEAR');
      setLastSelectedShapeAction(nextSelectedIds.some((entityId) => shapeGroupByEntityId.has(entityId)) ? 'SELECTION_BOX_SHAPE_GROUP' : 'null');
      setLastInteractionType('selection-box');
    },
    [entities, screenToWorld, shapeGroupByEntityId, shapeGroups],
  );

  const finishClick = useCallback(
    (screenPoint: Point) => {
      const rawWorldPoint = screenToWorld(screenPoint);
      const isDrawingTool = isGeometryDrawingToolMode(currentToolMode);
      const clickSnap = resolveCanvasV4Snap(entities, rawWorldPoint, endpointSnapThreshold, currentToolMode === 'line' ? lineStartPoint : currentToolMode === 'polyline' ? polylineLastPoint : null);
      setPointerWorldPoint(rawWorldPoint);

      if (currentToolMode === 'line') {
        setLastInteractionType('draw-line');

        if (!lineStartPoint) {
          setLineStartPoint(clickSnap.point);
          setSelectedEntityIds([]);
          setSelectedDoorId(null);
          setSelectedWindowId(null);
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
        setSelectedWindowId(null);
        return;
      }

      if (currentToolMode === 'polyline') {
        setLastInteractionType('draw-polyline');

        if (!polylineLastPoint) {
          setPolylineLastPoint(clickSnap.point);
          setActivePolylineId(`polyline-${Date.now()}`);
          setSelectedEntityIds([]);
          setSelectedDoorId(null);
          setSelectedWindowId(null);
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
        setSelectedWindowId(null);
        return;
      }

      if (currentToolMode === 'rectangle') {
        setLastInteractionType('draw-rectangle');
        setLastShapeTool('rectangle');

        if (!shapeStartPoint) {
          setShapeStartPoint(clickSnap.point);
          setSelectedEntityIds([]);
          setSelectedDoorId(null);
          setSelectedWindowId(null);
          setAutoResetTriggered(false);
          setLastActionType('SET_RECTANGLE_START');
          return;
        }

        const shapeEntities = createRectangleWallSegments(shapeStartPoint, clickSnap.point);

        if (shapeEntities.length !== 4) {
          setLastActionType('CREATE_RECTANGLE_SKIPPED_SMALL_SHAPE');
          return;
        }

        pushHistoryAction({
          type: 'CREATE_RECTANGLE',
          entities: shapeEntities.map((entity, index) => ({ entity, index: entities.length + index })),
        });
        setEntities((current) => normalizeWallSegmentConnectivity([...current, ...shapeEntities]));
        setShapeStartPoint(null);
        setSelectedEntityIds(shapeEntities.map((entity) => entity.entityId));
        setSelectedDoorId(null);
        setSelectedWindowId(null);
        setLastCreatedShapeId(shapeEntities[0]?.shapeId ?? null);
        setLastCreatedShapeType('rectangle');
        setLastCreatedShapeSegmentCount(shapeEntities.length);
        setLastSelectedShapeAction('CREATE_RECTANGLE_AUTO_SELECT');
        setCurrentToolMode('select');
        setAutoResetTriggered(true);
        setLastActionType('CREATE_RECTANGLE_AUTO_RESET_SELECT');
        return;
      }

      if (currentToolMode === 'circle') {
        setLastInteractionType('draw-circle');
        setLastShapeTool('circle');

        if (!shapeStartPoint) {
          setShapeStartPoint(clickSnap.point);
          setSelectedEntityIds([]);
          setSelectedDoorId(null);
          setSelectedWindowId(null);
          setAutoResetTriggered(false);
          setLastActionType('SET_CIRCLE_CENTER');
          return;
        }

        const shapeEntities = createCircleWallSegments(shapeStartPoint, clickSnap.point);

        if (shapeEntities.length !== CIRCLE_SHAPE_SEGMENT_COUNT) {
          setLastActionType('CREATE_CIRCLE_SKIPPED_SMALL_RADIUS');
          return;
        }

        pushHistoryAction({
          type: 'CREATE_CIRCLE',
          entities: shapeEntities.map((entity, index) => ({ entity, index: entities.length + index })),
        });
        setEntities((current) => normalizeWallSegmentConnectivity([...current, ...shapeEntities]));
        setShapeStartPoint(null);
        setSelectedEntityIds(shapeEntities.map((entity) => entity.entityId));
        setSelectedDoorId(null);
        setSelectedWindowId(null);
        setLastCreatedShapeId(shapeEntities[0]?.shapeId ?? null);
        setLastCreatedShapeType('circle');
        setLastCreatedShapeSegmentCount(shapeEntities.length);
        setLastSelectedShapeAction('CREATE_CIRCLE_AUTO_SELECT');
        setCurrentToolMode('select');
        setAutoResetTriggered(true);
        setLastActionType('CREATE_CIRCLE_AUTO_RESET_SELECT');
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
        setSelectedWindowId(null);
        setLastCreatedDoorId(door.doorId);
        setCurrentToolMode('select');
        setLineStartPoint(null);
        setPolylineLastPoint(null);
        setActivePolylineId(null);
        setShapeStartPoint(null);
        setSelectionBox(null);
        setInteractionMode('idle');
        setIsPanningCanvas(false);
        setTransformMode('idle');
        setLastDoorAction('CREATE_DOOR_AUTO_SELECT');
        setLastInteractionType('tap-select');
        return;
      }

      if (currentToolMode === 'window') {
        const target = findNearestSegmentProjection(rawWorldPoint);

        if (!target) {
          setLastActionType('WINDOW_EMPTY_TAP');
          setLastInteractionType('tap-empty');
          return;
        }

        const window = createWindow(target.entity, target.positionOnSegment);
        const afterEntity = withWindowAttachedToSegment(target.entity, window.windowId);
        pushHistoryAction({ type: 'CREATE_WINDOW', window, windowIndex: windows.length, beforeEntity: target.entity, afterEntity });
        setWindows((current) => [...current, window]);
        setEntities((current) => normalizeWallSegmentConnectivity(current.map((entity) => (entity.entityId === afterEntity.entityId ? afterEntity : entity))));
        setSelectedEntityIds([]);
        setSelectedDoorId(null);
        setSelectedWindowId(window.windowId);
        setLastCreatedWindowId(window.windowId);
        setCurrentToolMode('select');
        setLineStartPoint(null);
        setPolylineLastPoint(null);
        setActivePolylineId(null);
        setShapeStartPoint(null);
        setSelectionBox(null);
        setInteractionMode('idle');
        setIsPanningCanvas(false);
        setTransformMode('idle');
        setLastWindowAction('CREATE_WINDOW_AUTO_SELECT');
        setLastInteractionType('tap-select');
        return;
      }

      if (!isDrawingTool) {
        const hitDoorId = findDoorAtWorldPoint(rawWorldPoint);
        const hitWindowId = hitDoorId ? null : findWindowAtWorldPoint(rawWorldPoint);
        const hitCircleShapeId = hitDoorId || hitWindowId ? null : findCircleShapeAtWorldPoint(rawWorldPoint);
        const hitCircleGroup = hitCircleShapeId ? shapeGroupById.get(hitCircleShapeId) ?? null : null;
        const hitEntityId = hitDoorId || hitWindowId || hitCircleShapeId ? null : findEntityAtWorldPoint(rawWorldPoint);
        const hitEntity = hitEntityId ? entities.find((entity) => entity.entityId === hitEntityId) ?? null : null;
        const hitEntityShapeGroup = hitEntity?.shapeId
          ? shapeGroupById.get(hitEntity.shapeId) ?? null
          : null;
        const hitShapeGroup = hitCircleGroup ?? hitEntityShapeGroup;
        const hitRoomId = hitDoorId || hitWindowId || hitShapeGroup || hitEntityId ? null : findRoomAtWorldPoint(rawWorldPoint);
        const isHitShapeSelected = hitShapeGroup ? hitShapeGroup.segments.some((entity) => selectedEntityIds.includes(entity.entityId)) : false;
        const isHitEntitySelected = hitEntityId ? selectedEntityIds.includes(hitEntityId) : false;
        const now = Date.now();
        setHitTestTargetType(hitDoorId ? 'door-geometry' : hitWindowId ? 'window-geometry' : isHitShapeSelected || isHitEntitySelected ? 'selected-geometry' : hitShapeGroup || hitEntityId ? 'wall-geometry' : hitRoomId ? 'room-overlay' : 'empty-canvas');
        setLastHitTestEntityId(hitDoorId ?? hitWindowId ?? hitShapeGroup?.shapeId ?? hitEntityId ?? hitRoomId);

        if (hitDoorId) {
          setSelectedDoorId(hitDoorId);
          setSelectedWindowId(null);
          setSelectedEntityIds([]);
          setSelectedRoomId(null);
          setSelectionMode('single');
          setLastActionType('SELECT_DOOR');
          setLastSelectedShapeAction('null');
          setLastInteractionType('tap-select');
          lastTapRef.current = { time: now, point: screenPoint, wasEmpty: false };
          return;
        }

        if (hitWindowId) {
          setSelectedWindowId(hitWindowId);
          setSelectedDoorId(null);
          setSelectedEntityIds([]);
          setSelectedRoomId(null);
          setSelectionMode('single');
          setLastActionType('SELECT_WINDOW');
          setLastSelectedShapeAction('null');
          setLastInteractionType('tap-select');
          lastTapRef.current = { time: now, point: screenPoint, wasEmpty: false };
          return;
        }

        if (hitShapeGroup) {
          setSelectedEntityIds(hitShapeGroup.segments.map((entity) => entity.entityId));
          setSelectedDoorId(null);
          setSelectedWindowId(null);
          setSelectedRoomId(null);
          setSelectionMode('single');
          setLastActionType(`SELECT_${hitShapeGroup.shapeType.toUpperCase()}_SHAPE`);
          setLastSelectedShapeAction(`SELECT_${hitShapeGroup.shapeType.toUpperCase()}_GROUP`);
          setLastInteractionType('tap-select');
          lastTapRef.current = { time: now, point: screenPoint, wasEmpty: false };
          return;
        }

        if (hitEntityId) {
          setSelectedEntityIds([hitEntityId]);
          setSelectedDoorId(null);
          setSelectedWindowId(null);
          setSelectedRoomId(null);
          setSelectionMode('single');
          setLastActionType('SELECT_ENTITY');
          setLastSelectedShapeAction('null');
          setLastInteractionType('tap-select');
          lastTapRef.current = { time: now, point: screenPoint, wasEmpty: false };
          return;
        }

        if (hitRoomId) {
          setSelectedRoomId(hitRoomId);
          setSelectedEntityIds([]);
          setSelectedDoorId(null);
          setSelectedWindowId(null);
          setSelectionMode('single');
          setLastActionType('SELECT_ROOM');
          setLastSelectedShapeAction('null');
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
          setSelectedWindowId(null);
          setSelectedRoomId(null);
          setSelectionMode('single');
          setLastActionType('DOUBLE_TAP_CLEAR_SELECTION');
          setLastSelectedShapeAction('null');
          setLastInteractionType('double-tap-clear');
          lastTapRef.current = null;
          return;
        }

        setLastActionType('EMPTY_TAP_KEEP_SELECTION');
        setLastInteractionType('tap-empty');
        lastTapRef.current = { time: now, point: screenPoint, wasEmpty: true };
      }
    },
    [activePolylineId, currentToolMode, doors.length, endpointSnapThreshold, entities, findCircleShapeAtWorldPoint, findDoorAtWorldPoint, findEntityAtWorldPoint, findNearestSegmentProjection, findRoomAtWorldPoint, findWindowAtWorldPoint, lineStartPoint, newSegmentType, polylineLastPoint, pushHistoryAction, screenToWorld, selectedEntityIds, shapeGroupById, shapeStartPoint, windows.length],
  );

  const changeSelectedDoorHingeSide = useCallback(() => {
    if (!selectedDoor) {
      return;
    }

    const afterDoor: CanvasV4Door = {
      ...selectedDoor,
      hingeSide: getToggledDoorHingeSide(selectedDoor.hingeSide),
    };

    pushHistoryAction({ type: 'CHANGE_DOOR_HINGE_SIDE', beforeDoor: selectedDoor, afterDoor });
    setDoors((current) => current.map((door) => (door.doorId === afterDoor.doorId ? afterDoor : door)));
    setSelectedDoorId(afterDoor.doorId);
    setSelectedWindowId(null);
    setSelectedEntityIds([]);
    setLastDoorAction('CHANGE_DOOR_HINGE_SIDE');
  }, [pushHistoryAction, selectedDoor]);

  const changeSelectedDoorSwingSide = useCallback(() => {
    if (!selectedDoor) {
      return;
    }

    const afterDoor: CanvasV4Door = {
      ...selectedDoor,
      swingSide: getToggledDoorSwingSide(selectedDoor.swingSide),
    };

    pushHistoryAction({ type: 'CHANGE_DOOR_SWING_SIDE', beforeDoor: selectedDoor, afterDoor });
    setDoors((current) => current.map((door) => (door.doorId === afterDoor.doorId ? afterDoor : door)));
    setSelectedDoorId(afterDoor.doorId);
    setSelectedWindowId(null);
    setSelectedEntityIds([]);
    setLastDoorAction('CHANGE_DOOR_SWING_SIDE');
  }, [pushHistoryAction, selectedDoor]);

  const updateSelectedWindowWidth = useCallback(() => {
    if (!selectedWindow) {
      return;
    }

    const parsedWidth = Number(windowWidthInput.replace(',', '.'));
    if (!Number.isFinite(parsedWidth) || parsedWidth <= 0) {
      setWindowWidthInput(String(Math.round(selectedWindow.width)));
      setLastWindowAction('UPDATE_WINDOW_WIDTH_INVALID');
      return;
    }

    const segment = entities.find((entity) => entity.segmentId === selectedWindow.segmentId);
    if (!segment) {
      return;
    }

    const normalizedWidth = Math.max(MIN_WINDOW_WIDTH_MM, Math.round(parsedWidth));
    const afterWindow: CanvasV4Window = {
      ...selectedWindow,
      width: normalizedWidth,
      positionOnSegment: clampWindowPositionOnSegment(segment, selectedWindow.positionOnSegment, normalizedWidth),
    };

    if (afterWindow.width === selectedWindow.width && afterWindow.positionOnSegment === selectedWindow.positionOnSegment) {
      return;
    }

    pushHistoryAction({ type: 'UPDATE_WINDOW_WIDTH', beforeWindow: selectedWindow, afterWindow });
    setWindows((current) => current.map((window) => (window.windowId === afterWindow.windowId ? afterWindow : window)));
    setSelectedWindowId(afterWindow.windowId);
    setSelectedDoorId(null);
    setSelectedEntityIds([]);
    setWindowWidthInput(String(Math.round(afterWindow.width)));
    setLastWindowAction('UPDATE_WINDOW_WIDTH');
  }, [entities, pushHistoryAction, selectedWindow, windowWidthInput]);

  const setToolMode = useCallback((mode: ToolMode) => {
    setCurrentToolMode(mode);
    setLineStartPoint(null);
    setPolylineLastPoint(null);
    setActivePolylineId(null);
    setShapeStartPoint(null);
    if (isShapeToolMode(mode)) {
      setLastShapeTool(mode);
    }
    setAutoResetTriggered(false);
    setPointerWorldPoint(null);
    setSelectionBox(null);
    setSelectedDoorId(null);
    setSelectedWindowId(null);
    setSelectedRoomId(null);
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
      const isNavigationSelectionMode = !isGeometryDrawingToolMode(currentToolMode) && currentToolMode !== 'door' && currentToolMode !== 'window';
      const transformHandle = isNavigationSelectionMode ? findTransformHandleAtScreenPoint(screenPoint) : null;
      const hitDoorId = isNavigationSelectionMode && !transformHandle ? findDoorAtWorldPoint(rawWorldPoint) : null;
      const hitWindowId = isNavigationSelectionMode && !transformHandle && !hitDoorId ? findWindowAtWorldPoint(rawWorldPoint) : null;
      const hitCircleShapeId = isNavigationSelectionMode && !transformHandle && !hitDoorId && !hitWindowId ? findCircleShapeAtWorldPoint(rawWorldPoint) : null;
      const hitCircleGroup = hitCircleShapeId ? shapeGroupById.get(hitCircleShapeId) ?? null : null;
      const isLineResize = !!transformHandle && selectedEntities.length === 1;
      const isSelectionResize = !!transformHandle && selectedEntities.length > 1;
      const tolerance = HIT_TOLERANCE_PX / cameraZoom;
      const hitSelectedCircleEntityId = hitCircleGroup?.segments.find((entity) => selectedSet.has(entity.entityId))?.entityId ?? null;
      const hitSelectedEntityId = isNavigationSelectionMode && !hitDoorId && !hitWindowId && !transformHandle
        ? hitSelectedCircleEntityId ?? [...selectedEntities].reverse().find((entity) => getDistanceToSegment(rawWorldPoint, entity.startPoint, entity.endPoint) <= tolerance)?.entityId ?? null
        : null;
      const hitEntityId = isNavigationSelectionMode && !hitDoorId && !hitWindowId && !transformHandle ? hitSelectedEntityId ?? hitCircleGroup?.segments[0]?.entityId ?? findEntityAtWorldPoint(rawWorldPoint) : null;
      const hitRoomId = isNavigationSelectionMode && !hitDoorId && !hitWindowId && !transformHandle && !hitEntityId ? findRoomAtWorldPoint(rawWorldPoint) : null;
      const shouldMoveDoor = isNavigationSelectionMode && !!hitDoorId && selectedDoorId === hitDoorId;
      const shouldMoveWindow = isNavigationSelectionMode && !!hitWindowId && selectedWindowId === hitWindowId;
      const shouldMoveSelection = isNavigationSelectionMode && !!hitSelectedEntityId && selectedSet.has(hitSelectedEntityId);
      const hitTargetType: HitTestTargetType = transformHandle
        ? 'resize-handle'
        : hitDoorId
          ? 'door-geometry'
          : hitWindowId
            ? 'window-geometry'
            : hitSelectedEntityId
              ? 'selected-geometry'
              : hitEntityId
                ? 'wall-geometry'
                : hitRoomId
                  ? 'room-overlay'
                : 'empty-canvas';
      const canStartSelectionBox = isNavigationSelectionMode && !transformHandle && !hitDoorId && !hitWindowId && !hitEntityId && !hitRoomId;
      const initialInteractionMode: InteractionMode = isLineResize
        ? 'resize-line'
        : isSelectionResize
          ? 'resize-selection'
          : shouldMoveDoor
            ? 'move-door'
            : shouldMoveWindow
              ? 'move-window'
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
        moveWindowId: shouldMoveWindow ? hitWindowId : null,
        moveOriginalWindow: shouldMoveWindow ? windows.find((window) => window.windowId === hitWindowId) ?? null : null,
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
      setLastHitTestEntityId(hitDoorId ?? hitWindowId ?? hitCircleShapeId ?? hitEntityId ?? hitRoomId);
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
    [cameraZoom, currentToolMode, doors, findCircleShapeAtWorldPoint, findDoorAtWorldPoint, findEntityAtWorldPoint, findRoomAtWorldPoint, findTransformHandleAtScreenPoint, findWindowAtWorldPoint, screenToWorld, selectedBoundingBox, selectedDoorId, selectedEntities, selectedEntityIds, selectedWindowId, shapeGroupById, windows],
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

      if (session.interactionMode === 'move-window' && session.moveOriginalWindow) {
        const segment = entities.find((entity) => entity.segmentId === session.moveOriginalWindow?.segmentId);

        if (segment) {
          const projection = projectPointToSegment(screenToWorld(screenPoint), segment);
          const movedWindow = {
            ...session.moveOriginalWindow,
            positionOnSegment: clampWindowPositionOnSegment(segment, projection.positionOnSegment, session.moveOriginalWindow.width),
          };

          setWindows((current) => current.map((window) => (window.windowId === movedWindow.windowId ? movedWindow : window)));
          setIsMovingSelection(true);
          setSelectionMode('move');
          setLastActionType('MOVE_WINDOW_DRAG');
          setLastInteractionType('move-window');
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
            const nextEntities = entities.map((entity) => (entity.entityId === resizedEntity.entityId ? resizedEntity : entity));
            const afterDoors = clampDoorsToSegments(doors, nextEntities);
            const afterWindows = clampWindowsToSegments(windows, nextEntities);
            pushHistoryAction({
              type: 'RESIZE_WALL_SEGMENT',
              beforeEntities: [originalEntity],
              afterEntities: [resizedEntity],
              beforeDoors: doors,
              afterDoors,
              beforeWindows: windows,
              afterWindows,
              handleId: session.resizeHandleId,
            });
            setDoors(afterDoors);
            setWindows(afterWindows);
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
            const afterWindows = clampWindowsToSegments(windows, nextEntities);
            pushHistoryAction({
              type: 'RESIZE_WALL_SELECTION',
              beforeEntities: session.resizeOriginalEntities,
              afterEntities,
              beforeDoors: doors,
              afterDoors,
              beforeWindows: windows,
              afterWindows,
              handleId: session.resizeHandleId,
              scaleX,
              scaleY,
            });
            setDoors(afterDoors);
            setWindows(afterWindows);
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
            setLastDoorAction('MOVE_DOOR');
          }
        }
      } else if (session.interactionMode === 'move-window' && session.moved && session.moveOriginalWindow) {
        const segment = entities.find((entity) => entity.segmentId === session.moveOriginalWindow?.segmentId);

        if (segment) {
          const projection = projectPointToSegment(screenToWorld(screenPoint), segment);
          const afterWindow = {
            ...session.moveOriginalWindow,
            positionOnSegment: clampWindowPositionOnSegment(segment, projection.positionOnSegment, session.moveOriginalWindow.width),
          };
          const movedDistance = Math.abs(afterWindow.positionOnSegment - session.moveOriginalWindow.positionOnSegment);

          if (movedDistance > 0.000001) {
            pushHistoryAction({ type: 'MOVE_WINDOW', beforeWindow: session.moveOriginalWindow, afterWindow });
            setSelectedWindowId(afterWindow.windowId);
            setSelectedDoorId(null);
            setSelectedEntityIds([]);
            setLastMoveAction('MOVE_WINDOW');
            setLastWindowAction('MOVE_WINDOW');
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
            beforeWindows: windows,
            afterWindows: windows,
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
    [cameraZoom, doors, endpointSnapThreshold, entities, finishClick, pushHistoryAction, screenToWorld, selectEntitiesInsideBox, windows],
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
  const liveDimensionPreviewItems = useMemo<LiveDimensionPreviewItem[]>(() => {
    if (previewLine && previewDimensionLabelPlacement && previewLine.length > 0.000001) {
      return [{
        id: 'live-line-dimension',
        placement: previewDimensionLabelPlacement,
        label: formatLineLength(previewLine.length),
      }];
    }

    if (!shapePreview) {
      return [];
    }

    if (shapePreview.type === 'rectangle') {
      const rect = getNormalizedRect(shapePreview.startPoint, shapePreview.endPoint);
      const width = Math.abs(rect.maxX - rect.minX);
      const height = Math.abs(rect.maxY - rect.minY);

      if (width <= 0.000001 || height <= 0.000001) {
        return [];
      }

      const widthGeometry = getLineScreenGeometry({ x: rect.minX, y: rect.minY }, { x: rect.maxX, y: rect.minY });
      const heightGeometry = getLineScreenGeometry({ x: rect.maxX, y: rect.minY }, { x: rect.maxX, y: rect.maxY });

      return [
        {
          id: 'live-rectangle-width',
          placement: getDimensionPlacement(widthGeometry, null, DIMENSION_INTERNAL_OFFSET_PX, {
            side: 'top',
            role: 'external-like',
            neighborInfo: EMPTY_DIMENSION_NEIGHBOR_INFO,
            isHorizontalLike: true,
            isVerticalLike: false,
          }),
          label: formatLineLength(width),
        },
        {
          id: 'live-rectangle-height',
          placement: getDimensionPlacement(heightGeometry, null, DIMENSION_INTERNAL_OFFSET_PX, {
            side: 'right',
            role: 'external-like',
            neighborInfo: EMPTY_DIMENSION_NEIGHBOR_INFO,
            isHorizontalLike: false,
            isVerticalLike: true,
          }),
          label: formatLineLength(height),
        },
      ];
    }

    const radius = Math.hypot(shapePreview.endPoint.x - shapePreview.startPoint.x, shapePreview.endPoint.y - shapePreview.startPoint.y);
    const diameter = radius * 2;

    if (diameter <= 0.000001) {
      return [];
    }

    const diameterGeometry = getLineScreenGeometry(
      { x: shapePreview.startPoint.x - radius, y: shapePreview.startPoint.y },
      { x: shapePreview.startPoint.x + radius, y: shapePreview.startPoint.y },
    );

    return [{
      id: 'live-circle-diameter',
      placement: getDimensionPlacement(diameterGeometry, null, DIMENSION_INTERNAL_OFFSET_PX, {
        side: 'top',
        role: 'external-like',
        neighborInfo: EMPTY_DIMENSION_NEIGHBOR_INFO,
        isHorizontalLike: true,
        isVerticalLike: false,
      }),
      label: `Ø ${formatLineLength(diameter)}`,
    }];
  }, [getLineScreenGeometry, previewDimensionLabelPlacement, previewLine, shapePreview]);
  const selectedDimensionLabelPlacement = selectedEntities.length === 1
    ? getEntityDimensionLabelPlacement(selectedEntities[0], getLineScreenGeometry(selectedEntities[0].startPoint, selectedEntities[0].endPoint))
    : null;
  const inspectedDimensionLabelPlacement = selectedDimensionLabelPlacement ?? liveDimensionPreviewItems[0]?.placement ?? previewDimensionLabelPlacement;
  const shapePreviewActive = Boolean(shapePreview);

  const inspectorLines = useMemo(
    () => [
      `canvasEntryStep: ${canvasEntryStep}`,
      `selectedTemplateCategory: ${selectedTemplateCategory ?? 'null'}`,
      `selectedTemplateVariant: ${selectedTemplateVariant ?? 'null'}`,
      `lastTemplateAction: ${lastTemplateAction}`,
      `currentCanvasMode: ${currentCanvasMode}`,
      `projectCreated: ${projectCreated ? 'true' : 'false'}`,
      `projectId: ${projectState?.projectId ?? 'null'}`,
      `projectGeometrySnapshot: ${projectState ? `entities=${projectState.geometrySnapshot.entities.length}, doors=${projectState.geometrySnapshot.doors.length}, windows=${projectState.geometrySnapshot.windows.length}, rooms=${projectState.geometrySnapshot.rooms.length}, frozenAt=${new Date(projectState.geometrySnapshot.frozenAt).toISOString()}` : 'null'}`,
      `projectValidationState: ${projectInterpretation.projectValidationState}`,
      `closedContoursCount: ${projectInterpretation.closedContours.length}`,
      `openContoursCount: ${projectInterpretation.openContourSegmentIds.length}`,
      `orphanSegmentsCount: ${projectInterpretation.orphanSegmentIds.length}`,
      `roomCandidatesCount: ${projectInterpretation.roomCandidates.length}`,
      `roomCount: ${projectRooms.length}`,
      `selectedRoomId: ${selectedRoom?.roomId ?? 'null'}`,
      `selectedRoomArea: ${selectedRoom ? formatRoomArea(selectedRoom.roomArea) : 'null'}`,
      `selectedRoomSegmentsCount: ${selectedRoom?.roomSegments.length ?? 0}`,
      `roomDetectionState: ${projectInterpretation.roomDetectionState}`,
      `lastValidationError: ${lastValidationError ?? projectInterpretation.lastValidationError ?? 'null'}`,
      `projectContoursCount: ${projectContours.length}`,
      `projectModeActivatedAt: ${projectState ? new Date(projectState.createdAt).toISOString() : 'null'}`,
      `currentToolMode: ${currentToolMode}`,
      `lastShapeTool: ${lastShapeTool}`,
      `lastCreatedShapeId: ${lastCreatedShapeId ?? 'null'}`,
      `lastCreatedShapeType: ${lastCreatedShapeType}`,
      `lastCreatedShapeSegmentCount: ${lastCreatedShapeSegmentCount}`,
      `shapePreviewActive: ${shapePreviewActive ? 'true' : 'false'}`,
      `selectedShapeId: ${selectedShapeId ?? 'null'}`,
      `selectedShapeType: ${selectedShapeType ?? 'null'}`,
      `selectedShapeSegmentCount: ${selectedShapeSegmentCount}`,
      `lastSelectedShapeAction: ${lastSelectedShapeAction}`,
      `autoResetTriggered: ${autoResetTriggered ? 'true' : 'false'}`,
      `shapeDimensionMode: ${shapeDimensionMode}`,
      `circleCenterPoint: ${selectedCircleCenterPoint ? `(${selectedCircleCenterPoint.x.toFixed(0)}, ${selectedCircleCenterPoint.y.toFixed(0)})` : 'null'}`,
      `circleRadius: ${selectedCircleRadius === null ? 'null' : formatLineLength(selectedCircleRadius)}`,
      `circleDiameter: ${selectedCircleDiameter === null ? 'null' : formatLineLength(selectedCircleDiameter)}`,
      `circleVisualMode: ${circleVisualMode}`,
      `interactionMode: ${interactionMode}`,
      `isPanningCanvas: ${isPanningCanvas ? 'true' : 'false'}`,
      `isDraggingSelection: ${isMovingSelection ? 'true' : 'false'}`,
      `isSelectionBoxActive: ${selectionBox?.active ? 'true' : 'false'}`,
      `lastInteractionType: ${lastInteractionType}`,
      `showLineDimensions: ${showLineDimensions ? 'true' : 'false'}`,
      `dimensionDisplayMode: ${dimensionDisplayMode}`,
      'dimensionPlacementEngine: spatial-v1',
      `visibleDimensionsCount: ${visibleDimensions.length}`,
      `liveDimensionsPreviewCount: ${liveDimensionPreviewItems.length}`,
      `dimensionCollisionAvoidance: ${dimensionCollisionAvoidance ? 'true' : 'false'}`,
      `dimensionOffsetPx: ${dimensionOffsetPx.toFixed(0)} px`,
      'dimensionLabelsInteractive: false',
      `hitTestTargetType: ${hitTestTargetType}`,
      `lastHitTestEntityId: ${lastHitTestEntityId ?? 'null'}`,
      'compassVisible: true',
      'compassMode: visual + dimension spatial baseline',
      `entitiesCount: ${entities.length}`,
      `doorsCount: ${doors.length}`,
      `windowsCount: ${windows.length}`,
      `selectedDoorId: ${selectedDoor?.doorId ?? 'null'}`,
      `selectedWindowId: ${selectedWindow?.windowId ?? 'null'}`,
      `lastCreatedDoorId: ${lastCreatedDoorId ?? 'null'}`,
      `lastCreatedWindowId: ${lastCreatedWindowId ?? 'null'}`,
      `doorEntityId: ${selectedDoor?.doorId ?? 'null'}`,
      `windowEntityId: ${selectedWindow?.windowId ?? 'null'}`,
      `windowWidth: ${selectedWindow ? `${selectedWindow.width} mm` : `${DEFAULT_WINDOW_WIDTH_MM} mm (default)`}`,
      `windowHeight: ${selectedWindow ? `${selectedWindow.height} mm` : `${DEFAULT_WINDOW_HEIGHT_MM} mm (default)`}`,
      `windowBottomOffset: ${selectedWindow ? `${selectedWindow.bottomOffset} mm` : `${DEFAULT_WINDOW_BOTTOM_OFFSET_MM} mm (default)`}`,
      `windowSegmentId: ${selectedWindow?.segmentId ?? 'null'}`,
      `windowPositionOnSegment: ${selectedWindow ? `${selectedWindow.positionOnSegment.toFixed(0)} mm` : 'null'}`,
      `doorSegmentId: ${selectedDoor?.segmentId ?? 'null'}`,
      `doorPositionOnSegment: ${selectedDoor ? `${selectedDoor.positionOnSegment.toFixed(0)} mm` : 'null'}`,
      `doorWidth: ${selectedDoor ? `${selectedDoor.width} mm` : `${DEFAULT_DOOR_WIDTH_MM} mm (default)`}`,
      `doorHingeSide: ${selectedDoor?.hingeSide ?? 'null'}`,
      `doorSwingSide: ${selectedDoor?.swingSide ?? 'null'}`,
      `lastDoorAction: ${lastDoorAction}`,
      `lastWindowAction: ${lastWindowAction}`,
      `selectedEntityIds: [${selectedEntityIds.join(', ') || 'empty'}]`,
      `selectedSegmentId: ${selectedSegment?.segmentId ?? 'null'}`,
      `selectedSegmentType: ${selectedSegment?.segmentType ?? newSegmentType}`,
      `segmentType: ${selectedSegment?.segmentType ?? newSegmentType}`,
      `wallAlignmentMode: ${selectedSegment?.wallAlignmentMode ?? getWallAlignmentMode(newSegmentType)}`,
      `wallThicknessVisual: ${WALL_THICKNESS_VISUAL ? 'true' : 'false'}`,
      `wallThicknessFrozen: ${WALL_THICKNESS_FROZEN ? 'true' : 'false'}`,
      `wallThickness: ${selectedSegment ? `${selectedSegment.wallThickness} mm` : `${DEFAULT_WALL_THICKNESS_MM} mm (default)`}`,
      `cornerJoinMode: ${selectedSegment?.cornerJoinMode ?? DEFAULT_CORNER_JOIN_MODE}`,
      `connectedSegmentIds: [${selectedSegment?.connectedSegmentIds?.join(', ') || 'empty'}]`,
      `connectionNodeIds: [${selectedSegment?.connectionNodeIds?.join(', ') || 'empty'}]`,
      `shapeId: ${selectedSegment?.shapeId ?? 'null'}`,
      `shapeType: ${selectedSegment?.shapeType ?? 'null'}`,
      `shapeRole: ${selectedSegment?.shapeRole ?? 'null'}`,
      `segmentLength: ${selectedSegment ? formatLineLength(selectedSegment.length) : 'null'}`,
      `segmentAngle: ${selectedSegment ? `${formatAngle(selectedSegment.angle).toFixed(0)}°` : 'null'}`,
      `doorIds: [${selectedSegment?.doorIds.join(', ') || 'empty'}]`,
      `windowIds: [${selectedSegment?.windowIds.join(', ') || 'empty'}]`,
      `selectedCount: ${selectedEntityIds.length + (selectedDoor ? 1 : 0) + (selectedWindow ? 1 : 0) + (selectedRoom ? 1 : 0)}`,
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
      `isDrawingShape: ${shapeStartPoint ? 'true' : 'false'}`,
      `lineDeltaX: ${activeLineDelta ? `${activeLineDelta.x.toFixed(0)} mm` : 'null'}`,
      `lineDeltaY: ${activeLineDelta ? `${activeLineDelta.y.toFixed(0)} mm` : 'null'}`,
      `lineAngle: ${previewLine ? `${formatAngle(previewLine.angle).toFixed(0)}°` : 'null'}`,
      `previewLineAngle: ${previewLine ? `${formatAngle(previewLine.angle).toFixed(0)}°` : 'null'}`,
      `previewLineLength: ${previewLineLength === null ? 'null' : formatLineLength(previewLineLength)}`,
      `selectedLineLength: ${selectedLineLength === null ? 'null' : formatLineLength(selectedLineLength)}`,
      `dimensionLabelRotation: ${inspectedDimensionLabelPlacement ? `${inspectedDimensionLabelPlacement.rotationDeg.toFixed(0)}°` : 'null'}`,
      `dimensionLabelOffset: ${inspectedDimensionLabelPlacement ? `${inspectedDimensionLabelPlacement.offsetPx.toFixed(0)} px` : 'null'}`,
      `segmentSpatialRole: ${inspectedDimensionLabelPlacement?.spatialRole ?? 'unknown'}`,
      `dimensionSide: ${inspectedDimensionLabelPlacement?.side ?? 'null'}`,
      `dimensionOffset: ${inspectedDimensionLabelPlacement ? `${inspectedDimensionLabelPlacement.offsetPx.toFixed(0)} px` : 'null'}`,
      `dimensionNeighborInfo: ${formatDimensionNeighborInfo(inspectedDimensionLabelPlacement?.neighborInfo)}`,
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
      canvasEntryStep,
      currentCanvasMode,
      currentToolMode,
      dimensionCollisionAvoidance,
      dimensionDisplayMode,
      dimensionOffsetPx,
      visibleDimensions.length,
      newSegmentType,
      showLineDimensions,
      doors.length,
      windows.length,
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
      lastShapeTool,
      lastCreatedShapeId,
      lastCreatedShapeType,
      lastCreatedShapeSegmentCount,
      selectedShapeId,
      selectedShapeType,
      selectedShapeSegmentCount,
      lastSelectedShapeAction,
      autoResetTriggered,
      shapeDimensionMode,
      selectedCircleCenterPoint,
      selectedCircleRadius,
      selectedCircleDiameter,
      circleVisualMode,
      shapePreviewActive,
      lastMoveAction,
      lastDoorAction,
      lastWindowAction,
      lastCreatedDoorId,
      lastCreatedWindowId,
      lineStartPoint,
      moveDeltaMm.x,
      moveDeltaMm.y,
      pan.x,
      pan.y,
      polylineLastPoint,
      previewLine,
      previewLineLength,
      liveDimensionPreviewItems.length,
      projectContours.length,
      projectCreated,
      projectInterpretation,
      projectRooms.length,
      projectState,
      redoStack.length,
      resizeAxis,
      resizeScale.x,
      resizeScale.y,
      selectedBoundingBox,
      selectedLineLength,
      selectedDoor,
      selectedRoom,
      selectedWindow,
      selectedEntityIds,
      selectedSegment,
      selectionBox?.active,
      selectionMode,
      shapeStartPoint,
      transformMode,
      undoStack.length,
      isResizing,
      lastTemplateAction,
      lastValidationError,
      selectedTemplateCategory,
      selectedTemplateVariant,
    ],
  );

  const canvasHeight = Math.max(Math.min(windowHeight * 0.66, 760), 460);
  const hasSelection = selectedEntityIds.length > 0 || Boolean(selectedDoorId) || Boolean(selectedWindowId);
  const drawingTools: Array<{ mode: ToolMode; icon: string; label: string }> = [
    { mode: 'rectangle', icon: '▭', label: 'Rectangle' },
    { mode: 'circle', icon: '○', label: 'Circle' },
    { mode: 'select', icon: '↖', label: 'Выбор' },
    { mode: 'line', icon: '╱', label: 'Сегмент' },
    { mode: 'polyline', icon: '⌁', label: 'Стена' },
    { mode: 'door', icon: '▯', label: 'Дверь' },
    { mode: 'window', icon: '═', label: 'Окно' },
  ];
  const projectTabs = projectCreated
    ? [
        { id: 'plan', icon: '▦', label: 'План', active: true },
        { id: '3d', icon: '□', label: '3D', active: false },
        { id: 'inside-view', icon: '◉', label: 'Вид изнутри', active: false },
        { id: 'execution-scheme', icon: '⌗', label: 'Исполнительная схема', active: false },
      ]
    : [
        { id: 'plan', icon: '▦', label: 'План', active: true },
      ];
  const endpointSnapScreenPoint = activeSnap.activeSnapType === 'endpoint' ? worldToScreen(activeSnap.point) : null;
  const selectedEntityIdSet = new Set(selectedEntityIds);
  const selectedBoundingBoxScreenRect = selectedEntities.length > 1 && selectedBoundingBox
    ? getNormalizedRect(worldToScreen({ x: selectedBoundingBox.minX, y: selectedBoundingBox.minY }), worldToScreen({ x: selectedBoundingBox.maxX, y: selectedBoundingBox.maxY }))
    : null;
  const selectionBoxRect = selectionBox?.active ? getNormalizedRect(selectionBox.startPoint, selectionBox.currentPoint) : null;
  const canvasHeaderTitle = canvasEntryStep === 'canvas'
    ? `Canvas V4 — ${currentCanvasMode === 'plan' ? 'PLAN MODE' : 'PROJECT MODE'}`
    : 'Canvas V4 — старт';

  const renderApartmentTemplatePreview = (variant: ApartmentTemplateVariant) => {
    const extraLines = variant === 'one-room'
      ? [
          { id: 'v1', style: { left: '43%', top: '16%', width: 1, height: '68%' } },
          { id: 'h1', style: { left: '43%', top: '52%', width: '38%', height: 1 } },
          { id: 'v2', style: { left: '60%', top: '52%', width: 1, height: '32%' } },
        ] as const
      : variant === 'two-room'
        ? [
            { id: 'v1', style: { left: '41%', top: '14%', width: 1, height: '72%' } },
            { id: 'h1', style: { left: '16%', top: '48%', width: '25%', height: 1 } },
            { id: 'h2', style: { left: '41%', top: '38%', width: '43%', height: 1 } },
            { id: 'v2', style: { left: '60%', top: '38%', width: 1, height: '48%' } },
          ] as const
        : [
            { id: 'v1', style: { left: '36%', top: '14%', width: 1, height: '72%' } },
            { id: 'h1', style: { left: '16%', top: '34%', width: '20%', height: 1 } },
            { id: 'h2', style: { left: '16%', top: '58%', width: '20%', height: 1 } },
            { id: 'h3', style: { left: '36%', top: '40%', width: '48%', height: 1 } },
            { id: 'v2', style: { left: '58%', top: '40%', width: 1, height: '46%' } },
          ] as const;

    return (
      <View style={styles.templatePreviewCanvas} pointerEvents="none">
        <View style={[styles.templatePreviewLine, styles.templatePreviewLineTop]} />
        <View style={[styles.templatePreviewLine, styles.templatePreviewLineRight]} />
        <View style={[styles.templatePreviewLine, styles.templatePreviewLineBottom]} />
        <View style={[styles.templatePreviewLine, styles.templatePreviewLineLeft]} />
        {extraLines.map((line) => (
          <View key={line.id} style={[styles.templatePreviewLine, line.style]} />
        ))}
        <View style={styles.templatePreviewDoor} />
        <View style={styles.templatePreviewWindow} />
      </View>
    );
  };

  const renderEntryFlow = () => {
    if (canvasEntryStep === 'template-categories') {
      return (
        <View style={styles.entryShell}>
          <View style={styles.entryTopBar}>
            <Pressable style={styles.entryBackButton} onPress={() => setCanvasEntryStep('start')}>
              <Text style={styles.entryBackButtonText}>Назад</Text>
            </Pressable>
          </View>
          <View style={styles.entryHeader}>
            <Text style={styles.entryKicker}>Template Flow</Text>
            <Text style={styles.entryTitle}>Выберите тип объекта</Text>
            <Text style={styles.entrySubtitle}>Шаблон создаст обычные WallSegments, двери и окна. После генерации чертёж откроется в PLAN MODE.</Text>
          </View>
          <View style={styles.templateCategoryGrid}>
            {TEMPLATE_CATEGORY_CARDS.map((category) => {
              const isStub = category.availability === 'stub';
              const isSelectedStub = selectedTemplateCategory === category.id && isStub;

              return (
                <Pressable
                  key={category.id}
                  style={[styles.templateCategoryCard, isStub ? styles.templateCategoryCardStub : null, isSelectedStub ? styles.templateCategoryCardSelected : null]}
                  onPress={() => selectTemplateCategory(category.id)}
                >
                  <Text style={styles.templateCardTitle}>{category.title}</Text>
                  <Text style={styles.templateCardSubtitle}>{category.subtitle}</Text>
                  <Text style={[styles.templateCardStatus, isStub ? styles.templateCardStatusStub : null]}>{isStub ? 'Скоро' : 'Доступно'}</Text>
                </Pressable>
              );
            })}
          </View>
          {selectedTemplateCategory && selectedTemplateCategory !== 'apartment' ? (
            <View style={styles.templateStubNotice}>
              <Text style={styles.templateStubNoticeTitle}>Категория в подготовке</Text>
              <Text style={styles.templateStubNoticeText}>На этом этапе генерация включена только для квартир. Дом и коттедж оставлены как foundation-заготовки.</Text>
            </View>
          ) : null}
        </View>
      );
    }

    if (canvasEntryStep === 'apartment-gallery') {
      return (
        <View style={styles.entryShell}>
          <View style={styles.entryTopBar}>
            <Pressable style={styles.entryBackButton} onPress={() => setCanvasEntryStep('template-categories')}>
              <Text style={styles.entryBackButtonText}>Назад</Text>
            </Pressable>
          </View>
          <View style={styles.entryHeader}>
            <Text style={styles.entryKicker}>Квартира</Text>
            <Text style={styles.entryTitle}>Выберите базовый план</Text>
            <Text style={styles.entrySubtitle}>Каждый вариант генерирует редактируемую CAD-геометрию: наружный контур, перегородки, двери, окна и размеры.</Text>
          </View>
          <View style={styles.apartmentGalleryGrid}>
            {APARTMENT_TEMPLATE_CARDS.map((template) => (
              <Pressable key={template.id} style={styles.apartmentTemplateCard} onPress={() => generateApartmentTemplate(template.id)}>
                {renderApartmentTemplatePreview(template.id)}
                <View style={styles.apartmentTemplateInfo}>
                  <Text style={styles.templateCardTitle}>{template.title}</Text>
                  <Text style={styles.templateAreaLabel}>{template.areaLabel}</Text>
                  <Text style={styles.templateCardSubtitle}>{template.roomsLabel}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.entryShell}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryKicker}>Canvas V4 CAD-lite</Text>
          <Text style={styles.entryTitle}>С чего начать чертёж?</Text>
          <Text style={styles.entrySubtitle}>Можно взять редактируемый шаблон квартиры или открыть чистый CAD-план и нарисовать вручную.</Text>
        </View>
        <View style={styles.entryActionGrid}>
          <Pressable style={[styles.entryActionCard, styles.entryActionCardPrimary]} onPress={openTemplateCategories}>
            <Text style={styles.entryActionTitle}>Создать по шаблону</Text>
            <Text style={styles.entryActionText}>Галерея квартир с автоматической WallSegment-геометрией, дверями, окнами и размерами.</Text>
          </Pressable>
          <Pressable style={styles.entryActionCard} onPress={openManualDrawFlow}>
            <Text style={styles.entryActionTitle}>Нарисовать вручную</Text>
            <Text style={styles.entryActionText}>Открыть текущий PLAN MODE с линиями, polyline, rectangle, circle, doors/windows и snapping.</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader title={canvasHeaderTitle} />

      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
        {canvasEntryStep === 'canvas' ? (
          <>
        <View style={styles.systemBar}>
          <Pressable style={styles.controlButton} onPress={() => applyZoom(ZOOM_IN_FACTOR)} accessibilityLabel="Zoom In">
            <Text style={styles.controlButtonText}>+</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={() => applyZoom(ZOOM_OUT_FACTOR)} accessibilityLabel="Zoom Out">
            <Text style={styles.controlButtonText}>-</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, styles.resetButton]} onPress={resetView}>
            <Text style={styles.controlButtonText}>Сброс вида</Text>
            <Text style={styles.controlButtonSubtext}>{((cameraZoom / DEFAULT_ZOOM) * 100).toFixed(0)}%</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, isGridVisible ? styles.controlButtonActive : null]} onPress={() => setGridVisible((current) => !current)}>
            <Text style={styles.controlButtonText}>Сетка</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, showLineDimensions ? styles.controlButtonActive : null]} onPress={() => setShowLineDimensions((current) => !current)}>
            <Text style={styles.controlButtonText}>{showLineDimensions ? 'Скрыть размеры' : 'Показать размеры'}</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, showLineDimensions ? styles.controlButtonActive : styles.toolButtonDisabled]} onPress={cycleDimensionDisplayMode} disabled={!showLineDimensions}>
            <Text style={[styles.controlButtonText, showLineDimensions ? null : styles.toolButtonDisabledText]}>{dimensionDisplayModeLabel}</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, undoStack.length > 0 ? styles.undoButton : styles.toolButtonDisabled]} onPress={undoLastAction} disabled={undoStack.length === 0}>
            <Text style={[styles.controlButtonText, undoStack.length > 0 ? styles.undoButtonText : styles.toolButtonDisabledText]}>↶</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, redoStack.length > 0 ? styles.undoButton : styles.toolButtonDisabled]} onPress={redoLastAction} disabled={redoStack.length === 0}>
            <Text style={[styles.controlButtonText, redoStack.length > 0 ? styles.undoButtonText : styles.toolButtonDisabledText]}>↷</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, isInspectorVisible ? styles.controlButtonActive : null]} onPress={() => setInspectorVisible((current) => !current)}>
            <Text style={styles.controlButtonText}>Инспектор</Text>
          </Pressable>
          {hasSelection ? (
            <Pressable style={[styles.controlButton, styles.dangerButton]} onPress={deleteSelectedEntities}>
              <Text style={[styles.controlButtonText, styles.dangerButtonText]}>Удалить</Text>
            </Pressable>
          ) : null}
        </View>

        {projectValidationMessage ? (
          <View style={styles.projectValidationBanner}>
            <Text style={styles.projectValidationBannerText}>{projectValidationMessage}</Text>
          </View>
        ) : null}

        <View style={styles.canvasShell}>
          <View style={styles.projectRail} pointerEvents="box-none">
            {projectTabs.map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.projectRailButton, tab.active ? styles.projectRailButtonActive : styles.projectRailButtonStub]}
                accessibilityLabel={tab.label}
              >
                <Text style={styles.projectRailIcon}>{tab.icon}</Text>
                <Text style={styles.projectRailText}>{tab.label}</Text>
              </Pressable>
            ))}
            {!projectCreated ? (
              entities.length > 0 ? (
                <Pressable style={[styles.projectRailButton, styles.projectRailCreateButton]} onPress={createProjectStub} accessibilityLabel="Создать проект">
                  <Text style={styles.projectRailIcon}>＋</Text>
                  <Text style={styles.projectRailText}>Создать проект</Text>
                </Pressable>
              ) : (
                <View style={[styles.projectRailButton, styles.projectRailCreateButtonDisabled]} pointerEvents="none">
                  <Text style={[styles.projectRailIcon, styles.projectRailCreateButtonDisabledIcon]}>＋</Text>
                  <Text style={[styles.projectRailText, styles.projectRailCreateButtonDisabledText]}>Чертёж отсутствует</Text>
                </View>
              )
            ) : null}
          </View>

          <View style={styles.drawingToolbar} pointerEvents="box-none">
            {drawingTools.map((tool) => (
              <Pressable
                key={tool.mode}
                style={[styles.drawingToolButton, currentToolMode === tool.mode ? styles.drawingToolButtonActive : null]}
                onPress={() => setToolMode(tool.mode)}
                accessibilityLabel={tool.label}
              >
                <Text style={[styles.drawingToolIcon, currentToolMode === tool.mode ? styles.drawingToolIconActive : null]}>{tool.icon}</Text>
              </Pressable>
            ))}
          </View>

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

            {projectRooms.map((room) => {
              const topLeft = worldToScreen({ x: room.roomBounds.minX, y: room.roomBounds.minY });
              const bottomRight = worldToScreen({ x: room.roomBounds.maxX, y: room.roomBounds.maxY });
              const labelPoint = worldToScreen(room.roomCenter);
              const isSelected = selectedRoomId === room.roomId;
              const roomWidthPx = Math.max(Math.abs(bottomRight.x - topLeft.x), 1);
              const roomHeightPx = Math.max(Math.abs(bottomRight.y - topLeft.y), 1);
              const isCircleRoom = room.roomSegments.length > 0 && room.roomSegments.every((segmentId) => entityBySegmentId.get(segmentId)?.shapeType === 'circle');

              return (
                <React.Fragment key={room.roomId}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.roomOverlayFill,
                      isSelected ? styles.roomOverlayFillSelected : null,
                      {
                        left: Math.min(topLeft.x, bottomRight.x),
                        top: Math.min(topLeft.y, bottomRight.y),
                        width: roomWidthPx,
                        height: roomHeightPx,
                        borderRadius: isCircleRoom ? Math.max(roomWidthPx, roomHeightPx) / 2 : 6,
                      },
                    ]}
                  />
                  <View pointerEvents="none" style={[styles.roomOverlayLabel, isSelected ? styles.roomOverlayLabelSelected : null, { left: labelPoint.x - 54, top: labelPoint.y - 22 }]}>
                    <Text style={styles.roomOverlayLabelTitle}>{room.roomLabel}</Text>
                    <Text style={styles.roomOverlayLabelArea}>{formatRoomArea(room.roomArea)}</Text>
                  </View>
                </React.Fragment>
              );
            })}

            {smoothCircleShapeGroups.map((group) => {
              if (!group.centerPoint || !group.radiusX || !group.radiusY) {
                return null;
              }

              const screenCenter = worldToScreen(group.centerPoint);
              const widthPx = Math.max(group.radiusX * 2 * cameraZoom, CIRCLE_VISUAL_STROKE_WIDTH_PX);
              const heightPx = Math.max(group.radiusY * 2 * cameraZoom, CIRCLE_VISUAL_STROKE_WIDTH_PX);
              const isSelected = group.segments.some((entity) => selectedEntityIdSet.has(entity.entityId));

              return (
                <View
                  key={`${group.shapeId}-smooth-circle`}
                  pointerEvents="none"
                  style={[
                    styles.circleShapeVisual,
                    isSelected ? styles.circleShapeVisualSelected : null,
                    {
                      left: screenCenter.x - widthPx / 2,
                      top: screenCenter.y - heightPx / 2,
                      width: widthPx,
                      height: heightPx,
                      borderRadius: Math.max(widthPx, heightPx) / 2,
                    },
                  ]}
                />
              );
            })}

            {entities.map((entity) => {
              if (entity.shapeType === 'circle' && dimensionDisplayMode !== 'full') {
                return null;
              }

              const geometry = getLineScreenGeometry(entity.startPoint, entity.endPoint);
              const isSelected = selectedEntityIdSet.has(entity.entityId);
              const isProjectWarning = projectWarningSegmentIds.has(entity.segmentId);

              return (
                <React.Fragment key={entity.entityId}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.wallSegmentCenterLine,
                      entity.segmentType === 'external' ? styles.externalWallLine : styles.internalWallLine,
                      isProjectWarning ? styles.wallSegmentWarningLine : null,
                      isSelected ? styles.wallSegmentCenterLineSelected : null,
                      {
                        width: Math.max(geometry.length, 1),
                        left: geometry.centerX - geometry.length / 2,
                        top: geometry.centerY - 1,
                        transform: [{ rotate: `${geometry.angleDeg}deg` }],
                      },
                    ]}
                  />
                </React.Fragment>
              );
            })}

            <View pointerEvents="none" style={styles.dimensionLayer}>
              {visibleDimensions.map((dimension) => (
                <React.Fragment key={dimension.id}>
                  <View pointerEvents="none" style={[styles.dimensionLine, getScreenLineStyle(dimension.placement.lineStart, dimension.placement.lineEnd)]} />
                  <View pointerEvents="none" style={[styles.dimensionExtensionLine, getScreenLineStyle(dimension.placement.extensionStartA, dimension.placement.extensionEndA)]} />
                  <View pointerEvents="none" style={[styles.dimensionExtensionLine, getScreenLineStyle(dimension.placement.extensionStartB, dimension.placement.extensionEndB)]} />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dimensionTick,
                      {
                        left: dimension.placement.tickStart.x - DIMENSION_TICK_LENGTH_PX / 2,
                        top: dimension.placement.tickStart.y - 0.5,
                        transform: [{ rotate: `${dimension.placement.tickAngleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dimensionTick,
                      {
                        left: dimension.placement.tickEnd.x - DIMENSION_TICK_LENGTH_PX / 2,
                        top: dimension.placement.tickEnd.y - 0.5,
                        transform: [{ rotate: `${dimension.placement.tickAngleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dimensionLabel,
                      dimension.isSelected ? styles.dimensionLabelSelected : null,
                      {
                        left: dimension.placement.left,
                        top: dimension.placement.top,
                        transform: [{ rotate: `${dimension.placement.rotationDeg}deg` }],
                      },
                    ]}
                  >
                    <Text style={[styles.dimensionLabelText, dimension.isSelected ? styles.dimensionLabelTextSelected : null]}>{dimension.label}</Text>
                  </View>
                </React.Fragment>
              ))}
              {liveDimensionPreviewItems.map((dimension) => (
                <React.Fragment key={dimension.id}>
                  <View pointerEvents="none" style={[styles.dimensionLine, styles.previewDimensionLine, getScreenLineStyle(dimension.placement.lineStart, dimension.placement.lineEnd)]} />
                  <View pointerEvents="none" style={[styles.dimensionExtensionLine, styles.previewDimensionExtensionLine, getScreenLineStyle(dimension.placement.extensionStartA, dimension.placement.extensionEndA)]} />
                  <View pointerEvents="none" style={[styles.dimensionExtensionLine, styles.previewDimensionExtensionLine, getScreenLineStyle(dimension.placement.extensionStartB, dimension.placement.extensionEndB)]} />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dimensionTick,
                      styles.previewDimensionTick,
                      {
                        left: dimension.placement.tickStart.x - DIMENSION_TICK_LENGTH_PX / 2,
                        top: dimension.placement.tickStart.y - 0.5,
                        transform: [{ rotate: `${dimension.placement.tickAngleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dimensionTick,
                      styles.previewDimensionTick,
                      {
                        left: dimension.placement.tickEnd.x - DIMENSION_TICK_LENGTH_PX / 2,
                        top: dimension.placement.tickEnd.y - 0.5,
                        transform: [{ rotate: `${dimension.placement.tickAngleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dimensionLabel,
                      styles.previewDimensionLabel,
                      {
                        left: dimension.placement.left,
                        top: dimension.placement.top,
                        transform: [{ rotate: `${dimension.placement.rotationDeg}deg` }],
                      },
                    ]}
                  >
                    <Text style={[styles.dimensionLabelText, styles.previewDimensionLabelText]}>{dimension.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {doors.map((door) => {
              const segment = entities.find((entity) => entity.segmentId === door.segmentId);

              if (!segment) {
                return null;
              }

              const center = getPointOnSegmentAtDistance(segment, door.positionOnSegment);
              const screenCenter = worldToScreen(center);
              const segmentGeometry = getLineScreenGeometry(segment.startPoint, segment.endPoint);
              const widthPx = Math.max(door.width * cameraZoom, 18);
              const leafPx = Math.max(door.width * cameraZoom, 28);
              const arcRadiusPx = Math.max(widthPx * DOOR_SWING_ARC_VISUAL_SCALE, 20);
              const halfWidthPx = widthPx / 2;
              const angleRad = (segmentGeometry.angleDeg * Math.PI) / 180;
              const unit = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
              const outwardNormal = normalizeVector(getEntityOutwardNormal(segment, entities));
              const swingNormal = door.swingSide === 'outside' ? outwardNormal : scaleVector(outwardNormal, -1);
              const hingeDirection = door.hingeSide === 'left' ? -1 : 1;
              const hingePoint = { x: screenCenter.x + unit.x * halfWidthPx * hingeDirection, y: screenCenter.y + unit.y * halfWidthPx * hingeDirection };
              const openingDirection = door.hingeSide === 'left' ? unit : scaleVector(unit, -1);
              const leafCenter = { x: hingePoint.x + swingNormal.x * leafPx / 2, y: hingePoint.y + swingNormal.y * leafPx / 2 };
              const leafAngleDeg = (Math.atan2(swingNormal.y, swingNormal.x) * 180) / Math.PI;
              const arcStartAngle = Math.atan2(openingDirection.y, openingDirection.x);
              const arcEndAngle = Math.atan2(swingNormal.y, swingNormal.x);
              let arcDelta = arcEndAngle - arcStartAngle;

              if (arcDelta > Math.PI) {
                arcDelta -= Math.PI * 2;
              }

              if (arcDelta < -Math.PI) {
                arcDelta += Math.PI * 2;
              }

              const arcSegments = Array.from({ length: DOOR_SWING_ARC_SEGMENTS }, (_, index) => {
                const startAngle = arcStartAngle + (arcDelta * index) / DOOR_SWING_ARC_SEGMENTS;
                const endAngle = arcStartAngle + (arcDelta * (index + 1)) / DOOR_SWING_ARC_SEGMENTS;
                const start = {
                  x: hingePoint.x + Math.cos(startAngle) * arcRadiusPx,
                  y: hingePoint.y + Math.sin(startAngle) * arcRadiusPx,
                };
                const end = {
                  x: hingePoint.x + Math.cos(endAngle) * arcRadiusPx,
                  y: hingePoint.y + Math.sin(endAngle) * arcRadiusPx,
                };
                const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
                const segmentAngleDeg = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;

                return {
                  id: `${door.doorId}-arc-${index}`,
                  length: segmentLength,
                  centerX: (start.x + end.x) / 2,
                  centerY: (start.y + end.y) / 2,
                  angleDeg: segmentAngleDeg,
                };
              });
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
                        transform: [{ rotate: `${leafAngleDeg}deg` }],
                      },
                    ]}
                  />
                  {arcSegments.map((arcSegment) => (
                    <View
                      key={arcSegment.id}
                      pointerEvents="none"
                      style={[
                        styles.doorSwingArcSegment,
                        isSelected ? styles.doorElementSelected : null,
                        {
                          width: Math.max(arcSegment.length, 1),
                          left: arcSegment.centerX - arcSegment.length / 2,
                          top: arcSegment.centerY - 1,
                          transform: [{ rotate: `${arcSegment.angleDeg}deg` }],
                        },
                      ]}
                    />
                  ))}
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

            {windows.map((window) => {
              const segment = entities.find((entity) => entity.segmentId === window.segmentId);

              if (!segment) {
                return null;
              }

              const center = getPointOnSegmentAtDistance(segment, window.positionOnSegment);
              const screenCenter = worldToScreen(center);
              const segmentGeometry = getLineScreenGeometry(segment.startPoint, segment.endPoint);
              const widthPx = Math.max(window.width * cameraZoom, 22);
              const halfWidthPx = widthPx / 2;
              const symbolOffsetPx = 5;
              const glassOffsetPx = 2;
              const isSelected = selectedWindowId === window.windowId;

              return (
                <React.Fragment key={window.windowId}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.windowOverlayLine,
                      isSelected ? styles.windowElementSelected : null,
                      {
                        width: widthPx,
                        left: screenCenter.x - halfWidthPx,
                        top: screenCenter.y - 1,
                        transform: [{ rotate: `${segmentGeometry.angleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.windowGlassLine,
                      isSelected ? styles.windowElementSelected : null,
                      {
                        width: widthPx,
                        left: screenCenter.x - halfWidthPx,
                        top: screenCenter.y - glassOffsetPx - 1,
                        transform: [{ rotate: `${segmentGeometry.angleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.windowGlassLine,
                      isSelected ? styles.windowElementSelected : null,
                      {
                        width: widthPx,
                        left: screenCenter.x - halfWidthPx,
                        top: screenCenter.y + glassOffsetPx - 1,
                        transform: [{ rotate: `${segmentGeometry.angleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.windowEndCap,
                      isSelected ? styles.windowElementSelected : null,
                      {
                        left: screenCenter.x - halfWidthPx - 1,
                        top: screenCenter.y - symbolOffsetPx,
                        transform: [{ rotate: `${segmentGeometry.angleDeg}deg` }],
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.windowEndCap,
                      isSelected ? styles.windowElementSelected : null,
                      {
                        left: screenCenter.x + halfWidthPx - 1,
                        top: screenCenter.y - symbolOffsetPx,
                        transform: [{ rotate: `${segmentGeometry.angleDeg}deg` }],
                      },
                    ]}
                  />
                </React.Fragment>
              );
            })}

            {projectContours.map((contour) => {
              const isCircleContour = contour.segmentIds.length > 0 && contour.segmentIds.every((segmentId) => entityBySegmentId.get(segmentId)?.shapeType === 'circle');
              const shouldRenderContourEdges = !(isCircleContour && dimensionDisplayMode !== 'full');

              return (
                <React.Fragment key={contour.contourId}>
                  {shouldRenderContourEdges ? contour.vertices.map((vertex, index) => {
                    const nextVertex = contour.vertices[(index + 1) % contour.vertices.length];
                    const start = worldToScreen(vertex);
                    const end = worldToScreen(nextVertex);

                    return (
                      <View
                        key={`${contour.contourId}-edge-${index}`}
                        pointerEvents="none"
                        style={[styles.projectContourEdge, getScreenLineStyle(start, end)]}
                      />
                    );
                  }) : null}
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
              </React.Fragment>
            ) : null}

            {shapePreview ? (
              <React.Fragment>
                {shapePreview.type === 'circle' ? (() => {
                  const screenCenter = worldToScreen(shapePreview.startPoint);
                  const screenRadiusPoint = worldToScreen(shapePreview.endPoint);
                  const radiusPx = Math.max(Math.hypot(screenRadiusPoint.x - screenCenter.x, screenRadiusPoint.y - screenCenter.y), 1);

                  return (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.circleShapePreview,
                        {
                          left: screenCenter.x - radiusPx,
                          top: screenCenter.y - radiusPx,
                          width: radiusPx * 2,
                          height: radiusPx * 2,
                          borderRadius: radiusPx,
                        },
                      ]}
                    />
                  );
                })() : shapePreview.segments.map((segment) => {
                  const geometry = getLineScreenGeometry(segment.startPoint, segment.endPoint);

                  return (
                    <View
                      key={segment.id}
                      pointerEvents="none"
                      style={[
                        styles.shapePreviewSegment,
                        {
                          width: Math.max(geometry.length, 1),
                          left: geometry.centerX - geometry.length / 2,
                          top: geometry.centerY - 1,
                          transform: [{ rotate: `${geometry.angleDeg}deg` }],
                        },
                      ]}
                    />
                  );
                })}
              </React.Fragment>
            ) : null}

            {lineStartPoint ? <View pointerEvents="none" style={[styles.anchorPoint, { left: worldToScreen(lineStartPoint).x - 5, top: worldToScreen(lineStartPoint).y - 5 }]} /> : null}
            {polylineLastPoint ? <View pointerEvents="none" style={[styles.anchorPoint, styles.polylineAnchor, { left: worldToScreen(polylineLastPoint).x - 5, top: worldToScreen(polylineLastPoint).y - 5 }]} /> : null}
            {shapeStartPoint ? <View pointerEvents="none" style={[styles.anchorPoint, styles.shapeAnchor, { left: worldToScreen(shapeStartPoint).x - 5, top: worldToScreen(shapeStartPoint).y - 5 }]} /> : null}
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

            {selectedDoor || selectedWindow ? (
              <View style={styles.contextPanel}>
                {selectedDoor ? (
                  <>
                    <Pressable style={[styles.contextButton, styles.doorFlipButton]} onPress={changeSelectedDoorHingeSide}>
                      <Text style={[styles.toolButtonText, styles.doorFlipButtonText]}>Петли</Text>
                    </Pressable>
                    <Pressable style={[styles.contextButton, styles.doorFlipButton]} onPress={changeSelectedDoorSwingSide}>
                      <Text style={[styles.toolButtonText, styles.doorFlipButtonText]}>Открывание</Text>
                    </Pressable>
                  </>
                ) : null}
                {selectedWindow ? (
                  <View style={styles.windowWidthControl}>
                    <Text style={styles.windowWidthLabel}>Ширина окна</Text>
                    <TextInput
                      style={styles.windowWidthInput}
                      value={windowWidthInput}
                      onChangeText={setWindowWidthInput}
                      onSubmitEditing={updateSelectedWindowWidth}
                      onBlur={updateSelectedWindowWidth}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

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
          </>
        ) : (
          renderEntryFlow()
        )}
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
  entryShell: {
    minHeight: 520,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7DEE8',
    backgroundColor: '#F8FAFC',
    padding: 18,
    gap: 18,
  },
  entryTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryBackButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  entryBackButtonText: {
    color: '#1F2937',
    fontWeight: '800',
  },
  entryHeader: {
    maxWidth: 720,
    gap: 8,
  },
  entryKicker: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  entryTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
  },
  entrySubtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  entryActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  entryActionCard: {
    flexGrow: 1,
    flexBasis: 280,
    minHeight: 154,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 18,
    justifyContent: 'space-between',
  },
  entryActionCardPrimary: {
    borderColor: '#334155',
    backgroundColor: '#F1F5F9',
  },
  entryActionTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  entryActionText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  templateCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCategoryCard: {
    flexGrow: 1,
    flexBasis: 210,
    minHeight: 132,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 8,
  },
  templateCategoryCardStub: {
    backgroundColor: '#F8FAFC',
  },
  templateCategoryCardSelected: {
    borderColor: '#64748B',
    backgroundColor: '#E2E8F0',
  },
  templateCardTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  templateCardSubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  templateCardStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontSize: 11,
    fontWeight: '900',
  },
  templateCardStatusStub: {
    backgroundColor: '#E2E8F0',
    color: '#475569',
  },
  templateStubNotice: {
    maxWidth: 640,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 4,
  },
  templateStubNoticeTitle: {
    color: '#0F172A',
    fontWeight: '900',
  },
  templateStubNoticeText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  apartmentGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  apartmentTemplateCard: {
    flexGrow: 1,
    flexBasis: 250,
    minHeight: 260,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 12,
  },
  apartmentTemplateInfo: {
    gap: 6,
  },
  templateAreaLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  templatePreviewCanvas: {
    height: 124,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    position: 'relative',
    overflow: 'hidden',
  },
  templatePreviewLine: {
    position: 'absolute',
    backgroundColor: '#111827',
  },
  templatePreviewLineTop: {
    left: '16%',
    top: '14%',
    width: '68%',
    height: 2,
  },
  templatePreviewLineRight: {
    left: '84%',
    top: '14%',
    width: 2,
    height: '72%',
  },
  templatePreviewLineBottom: {
    left: '16%',
    top: '86%',
    width: '68%',
    height: 2,
  },
  templatePreviewLineLeft: {
    left: '16%',
    top: '14%',
    width: 2,
    height: '72%',
  },
  templatePreviewDoor: {
    position: 'absolute',
    left: '50%',
    top: '84%',
    width: '12%',
    height: 4,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  templatePreviewWindow: {
    position: 'absolute',
    left: '60%',
    top: '12%',
    width: '16%',
    height: 5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#F8FAFC',
  },
  systemBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: '#DCE3F2',
  },
  projectValidationBanner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  projectValidationBannerText: {
    color: '#92400E',
    fontWeight: '900',
  },
  controlButton: {
    minHeight: 40,
    paddingHorizontal: 12,
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
  toolButtonText: {
    color: '#334155',
    fontWeight: '800',
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
  doorFlipButton: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  doorFlipButtonText: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  windowWidthControl: {
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#14B8A6',
    backgroundColor: '#CCFBF1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  windowWidthLabel: {
    color: '#0F766E',
    fontWeight: '800',
  },
  windowWidthInput: {
    minWidth: 72,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5EEAD4',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontWeight: '800',
  },
  toolButtonDisabled: {
    opacity: 0.5,
  },
  toolButtonDisabledText: {
    color: '#94A3B8',
  },
  canvasShell: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DCE3F2',
    backgroundColor: '#FFFFFF',
    padding: 6,
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  canvasArea: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FBFCFF',
    position: 'relative',
  },
  projectRail: {
    position: 'absolute',
    left: 14,
    top: 18,
    zIndex: 10,
    width: 68,
    padding: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: '#DCE3F2',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },
  projectRailButton: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
  },
  projectRailButtonActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  projectRailButtonStub: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  projectRailCreateButton: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  projectRailCreateButtonDisabled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
  },
  projectRailCreateButtonDisabledIcon: {
    color: '#94A3B8',
  },
  projectRailCreateButtonDisabledText: {
    color: '#94A3B8',
    fontSize: 8,
    lineHeight: 10,
    textAlign: 'center',
  },
  projectRailIcon: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  projectRailText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '800',
  },
  drawingToolbar: {
    position: 'absolute',
    right: 14,
    top: 18,
    zIndex: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  drawingToolButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawingToolButtonActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#2563EB',
  },
  drawingToolIcon: {
    color: '#E2E8F0',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 26,
  },
  drawingToolIconActive: {
    color: '#FFFFFF',
  },
  contextPanel: {
    position: 'absolute',
    left: 92,
    bottom: 16,
    zIndex: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#DCE3F2',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  contextButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  roomOverlayFill: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.20)',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  roomOverlayFillSelected: {
    borderColor: 'rgba(37, 99, 235, 0.48)',
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  roomOverlayLabel: {
    position: 'absolute',
    width: 108,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  roomOverlayLabelSelected: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(239, 246, 255, 0.92)',
  },
  roomOverlayLabelTitle: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '900',
  },
  roomOverlayLabelArea: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
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
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    borderColor: '#0F172A',
  },
  internalWallLine: {
    backgroundColor: '#0F172A',
  },
  externalWallLine: {
    backgroundColor: '#0F172A',
  },
  wallCornerJoin: {
    position: 'absolute',
    borderRadius: 2,
    borderWidth: 1,
  },
  wallSegmentSelected: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
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
    backgroundColor: '#2563EB',
  },
  wallSegmentWarningLine: {
    backgroundColor: '#D97706',
  },
  circleShapeVisual: {
    position: 'absolute',
    borderWidth: CIRCLE_VISUAL_STROKE_WIDTH_PX,
    borderColor: '#0F172A',
    backgroundColor: 'transparent',
  },
  circleShapeVisualSelected: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.28,
    shadowRadius: 5,
  },
  circleShapePreview: {
    position: 'absolute',
    borderWidth: CIRCLE_VISUAL_STROKE_WIDTH_PX,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    opacity: 0.66,
  },
  previewWallSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    opacity: 0.72,
  },
  shapePreviewSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#2563EB',
    opacity: 0.54,
    borderStyle: 'dashed',
  },
  doorWallBreakOverlay: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.35)',
  },
  doorLeafLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#0F172A',
  },
  doorSwingArcSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#334155',
    opacity: 0.85,
  },
  doorElementSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  doorHingeMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#EFF6FF',
  },
  doorHingeMarkerSelected: {
    backgroundColor: '#2563EB',
  },
  windowOverlayLine: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#0F172A',
  },
  windowGlassLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#0F172A',
  },
  windowEndCap: {
    position: 'absolute',
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: '#0F172A',
  },
  windowElementSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  projectContourEdge: {
    position: 'absolute',
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(29, 78, 216, 0.72)',
  },
  projectContourBadge: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.90)',
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  projectContourBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dimensionLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  dimensionLine: {
    position: 'absolute',
    backgroundColor: 'rgba(51, 65, 85, 0.72)',
  },
  previewDimensionLine: {
    backgroundColor: 'rgba(37, 99, 235, 0.64)',
  },
  dimensionExtensionLine: {
    position: 'absolute',
    backgroundColor: 'rgba(51, 65, 85, 0.46)',
  },
  previewDimensionExtensionLine: {
    backgroundColor: 'rgba(37, 99, 235, 0.36)',
  },
  dimensionTick: {
    position: 'absolute',
    width: DIMENSION_TICK_LENGTH_PX,
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.78)',
  },
  previewDimensionTick: {
    backgroundColor: 'rgba(37, 99, 235, 0.72)',
  },
  dimensionLabel: {
    position: 'absolute',
    width: LINE_DIMENSION_LABEL_WIDTH_PX,
    minWidth: LINE_DIMENSION_LABEL_WIDTH_PX,
    minHeight: LINE_DIMENSION_LABEL_HEIGHT_PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimensionLabelSelected: {},
  previewDimensionLabel: {
    opacity: 0.94,
  },
  dimensionLabelText: {
    color: 'rgba(30, 41, 59, 0.86)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  dimensionLabelTextSelected: {
    color: '#1D4ED8',
  },
  previewDimensionLabelText: {
    color: '#1D4ED8',
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
  shapeAnchor: {
    backgroundColor: '#8B5CF6',
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
