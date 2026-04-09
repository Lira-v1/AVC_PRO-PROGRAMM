import { CameraSystem } from './CameraSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { GridSystem } from './GridSystem';
import {
  CanvasMode,
  CanvasToolMode,
  CanvasDebugState,
  CanvasSnapshot,
  CanvasState,
  CameraState,
  ContourShapeScreenGeometry,
  ContourShapeWorldGeometry,
  DimensionLineScreenGeometry,
  DimensionLineWorldGeometry,
  DimensionUnit,
  RoomModel,
  RoomSettings,
  RoomResizeHandleId,
  RoomResizeHandleScreenGeometry,
  RoomOpenEntryPoint,
  RoomSurfaceScreenGeometry,
  SharedSurfaceLink,
  RoomSurfaceType,
  RoomSurfaceWorldGeometry,
  RoomScreenGeometry,
  RoomWorldGeometry,
  ScreenPoint,
  SharedSurfaceMode,
  Viewport,
  WallNode,
  WallSegment,
  ClosedRegion,
  WorldPoint,
} from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';
import { RoomRenderer } from './RoomRenderer';
import { DimensionLabelSystem } from './DimensionLabelSystem';
import { RoomSelectionSystem } from './RoomSelectionSystem';
import { RoomTransformSystem } from './RoomTransformSystem';
import { RoomResizeSystem } from './RoomResizeSystem';
import { RoomRotateSystem } from './RoomRotateSystem';

const cloneRoom = (room: RoomModel): RoomModel => ({
  ...room,
  verticesMm: room.verticesMm?.map((vertex) => ({ ...vertex })),
});
const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  name: 'Комната',
  dimensionUnit: 'm',
  isSizeLocked: false,
  isDimensionsHidden: false,
};

const withDefaultSettings = (room: RoomModel): RoomModel => ({
  ...room,
  settings: {
    ...DEFAULT_ROOM_SETTINGS,
    ...(room.settings ?? {}),
  },
});
const DISPLAY_ZOOM_STEP = 20;
const BASELINE_DISPLAY_ZOOM_OFFSET = 30;
const LEGACY_BASE_ZOOM = 0.03;
const BASE_ZOOM = LEGACY_BASE_ZOOM * 2 ** (BASELINE_DISPLAY_ZOOM_OFFSET / DISPLAY_ZOOM_STEP);
const MIN_ZOOM = 0.005;
const MAX_ZOOM = 6;
const ZOOM_EPSILON = 1e-9;
const DEFAULT_GRID_STEP_MM = 100;
const ROOM_FALLBACK_PREFIX = 'Комната';
const DEFAULT_WALL_HEIGHT_MM = 2700;
const DEFAULT_ROOM_SIZE_MM = 1000;
const NEW_ROOM_OFFSET_MM = 1200;
const NEW_ROOM_COLUMNS = 3;
const MIN_CONTOUR_POINTS_TO_CLOSE = 4;
const CONTOUR_CLOSE_THRESHOLD_MM = 160;
const ORTHOGONAL_SEGMENT_ANGLES_DEG = [0, 45, 90, 135] as const;
const SURFACE_SCENE_GAP_MM = 280;
const SURFACE_SCENE_VIEWPORT_PADDING_PX = 32;
const SINGLE_SURFACE_VIEWPORT_FILL_RATIO = 0.65;
const WALL_SURFACE_TYPES: RoomSurfaceType[] = ['north', 'south', 'west', 'east', 'wall'];
const SELECTABLE_SURFACE_TYPES: RoomSurfaceType[] = [...WALL_SURFACE_TYPES, 'floor', 'ceiling'];
const SHARED_SURFACE_TOLERANCE_MM = 0.5;
const SPLIT_INTERSECTION_EPSILON_MM = 0.01;
const WALL_NODE_SNAP_THRESHOLD_MM = 160;
const WALL_SEGMENT_SNAP_THRESHOLD_MM = 140;
const WALL_REGION_MIN_AREA_MM2 = 2000;

const getRotatedHalfExtent = (widthMm: number, heightMm: number, rotationDeg: number) => {
  const normalizedRotation = ((rotationDeg % 360) + 360) % 360;
  const angleRad = normalizedRotation * (Math.PI / 180);
  const absCos = Math.abs(Math.cos(angleRad));
  const absSin = Math.abs(Math.sin(angleRad));

  return {
    halfWidth: (widthMm * absCos + heightMm * absSin) / 2,
    halfHeight: (widthMm * absSin + heightMm * absCos) / 2,
  };
};

const getDisplayZoom = (cameraZoom: number, _minZoom: number, baseZoom: number, _maxZoom: number) => {
  if (Math.abs(cameraZoom - baseZoom) <= ZOOM_EPSILON) {
    return 0;
  }

  return Math.log(cameraZoom / baseZoom) / Math.log(2) * DISPLAY_ZOOM_STEP;
};

const withDefaultWallHeight = (room: RoomModel): RoomModel => ({
  ...room,
  wallHeightMm: Math.max(400, room.wallHeightMm ?? DEFAULT_WALL_HEIGHT_MM),
});

const withDefaultRoomLabelVisibility = (room: RoomModel): RoomModel => ({
  ...room,
  roomLabelVisible: room.roomLabelVisible ?? true,
});

const normalizeRoomModel = (room: RoomModel): RoomModel => withDefaultRoomLabelVisibility(withDefaultWallHeight(withDefaultSettings(cloneRoom(room))));
type WallSurfaceSegment = {
  surfaceId: string;
  roomId: string;
  type: RoomSurfaceType;
  directionDeg: number;
  from: WorldPoint;
  to: WorldPoint;
  length: number;
};

const distance = (from: WorldPoint, to: WorldPoint) => Math.hypot(to.x - from.x, to.y - from.y);
const subtract = (a: WorldPoint, b: WorldPoint): WorldPoint => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: WorldPoint, b: WorldPoint): number => a.x * b.x + a.y * b.y;
const cross = (a: WorldPoint, b: WorldPoint): number => a.x * b.y - a.y * b.x;
const addScaled = (point: WorldPoint, direction: WorldPoint, scalar: number): WorldPoint => ({
  x: point.x + direction.x * scalar,
  y: point.y + direction.y * scalar,
});
const isSamePoint = (left: WorldPoint, right: WorldPoint, epsilon = SPLIT_INTERSECTION_EPSILON_MM) =>
  Math.hypot(left.x - right.x, left.y - right.y) <= epsilon;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const intersectSegments = (a1: WorldPoint, a2: WorldPoint, b1: WorldPoint, b2: WorldPoint, epsilon = SPLIT_INTERSECTION_EPSILON_MM): SegmentIntersection | null => {
  const a = subtract(a2, a1);
  const b = subtract(b2, b1);
  const denominator = cross(a, b);
  const diff = subtract(b1, a1);

  if (Math.abs(denominator) <= epsilon) {
    return null;
  }

  const tA = cross(diff, b) / denominator;
  const tB = cross(diff, a) / denominator;

  if (tA < -epsilon || tA > 1 + epsilon || tB < -epsilon || tB > 1 + epsilon) {
    return null;
  }

  return {
    point: {
      x: a1.x + a.x * tA,
      y: a1.y + a.y * tA,
    },
    tA: clamp01(tA),
    tB: clamp01(tB),
  };
};

const dedupePath = (points: WorldPoint[], epsilon = SPLIT_INTERSECTION_EPSILON_MM): WorldPoint[] =>
  points.reduce<WorldPoint[]>((acc, point) => {
    const last = acc[acc.length - 1];
    if (!last || !isSamePoint(last, point, epsilon)) {
      acc.push(point);
    }
    return acc;
  }, []);

const simplifyCollinear = (points: WorldPoint[], epsilon = SPLIT_INTERSECTION_EPSILON_MM): WorldPoint[] => {
  if (points.length < 4) {
    return points;
  }

  const simplified: WorldPoint[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const prev = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const v1 = subtract(current, prev);
    const v2 = subtract(next, current);
    const lengthProduct = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);

    if (lengthProduct <= epsilon) {
      continue;
    }

    const area = Math.abs(cross(v1, v2));
    if (area <= epsilon * lengthProduct) {
      continue;
    }

    simplified.push(current);
  }

  return simplified.length >= 3 ? simplified : points;
};

type SharedSegmentDetection = {
  start: WorldPoint;
  end: WorldPoint;
  length: number;
  mode: SharedSurfaceMode;
};

type SegmentIntersection = {
  point: WorldPoint;
  tA: number;
  tB: number;
};

type BoundaryIntersectionPoint = {
  point: WorldPoint;
  contourSegmentIndex: number;
  contourSegmentT: number;
  edgeIndex: number;
  edgeT: number;
  contourDistance: number;
};

type SegmentPointProjection = {
  point: WorldPoint;
  t: number;
  distance: number;
};

type DirectedWallEdge = {
  edgeId: string;
  segmentId: string;
  fromNodeId: string;
  toNodeId: string;
  angle: number;
};

export class CanvasEngine {
  worldWidth: number;
  worldHeight: number;
  camera: CameraSystem;
  grid: GridSystem;
  canvasState: CanvasState;
  selection: RoomSelectionSystem;
  transform: RoomTransformSystem;
  resize: RoomResizeSystem;
  rotate: RoomRotateSystem;
  private rooms: RoomModel[] = [];
  private readonly projectId: string;
  private lastPointerWorldPoint: WorldPoint | null = null;
  private mode: CanvasMode = 'main';
  private surfaceSceneRoomId: string | null = null;
  private activeSurfaceId: string | null = null;
  private savedMainCameraState: CameraState | null = null;
  private savedRoomSurfaceSceneCameraState: CameraState | null = null;
  private isDrawingMode = false;
  private currentToolMode: CanvasToolMode = 'select';
  private currentContourPoints: WorldPoint[] = [];
  private contourShapes: ContourShapeWorldGeometry[] = [];
  private isContourClosed = false;
  private isContourConvertedToRoom = false;
  private currentSegmentAngle: number | null = null;
  private lastCreatedShapeId: string | null = null;
  private isRoomSplitOperation = false;
  private splitSourceRoomId: string | null = null;
  private splitNewRoomIds: string[] = [];
  private wallNodes: WallNode[] = [];
  private wallSegments: WallSegment[] = [];
  private closedRegions: ClosedRegion[] = [];
  private wallChainStartNodeId: string | null = null;
  private wallChainCurrentNodeId: string | null = null;
  private lastCreatedWallId: string | null = null;
  private lastCreatedNodeId: string | null = null;
  private lastDetectedRoomId: string | null = null;
  private wallGraphUpdated = false;
  private autoRoomByRegionId = new Map<string, string>();

  private getRoomFallbackNameById(roomId: string): string {
    const roomIndex = this.rooms.findIndex((room) => room.roomId === roomId);

    return `${ROOM_FALLBACK_PREFIX} ${roomIndex >= 0 ? roomIndex + 1 : 1}`;
  }

  private resolveRoomName(room: RoomModel): string {
    const explicitRoomName = room.roomName?.trim();

    if (explicitRoomName) {
      return explicitRoomName;
    }

    const legacySettingsName = room.settings?.name?.trim();

    if (legacySettingsName) {
      return legacySettingsName;
    }

    return this.getRoomFallbackNameById(room.roomId);
  }

  constructor(worldWidth = 500, worldHeight = 500) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.camera = new CameraSystem({ zoom: BASE_ZOOM, panX: 0, panY: 0, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM });
    this.grid = new GridSystem(DEFAULT_GRID_STEP_MM);
    this.selection = new RoomSelectionSystem();
    this.transform = new RoomTransformSystem(DEFAULT_GRID_STEP_MM);
    this.resize = new RoomResizeSystem();
    this.rotate = new RoomRotateSystem();
    this.canvasState = {
      isReady: false,
      viewport: { width: 0, height: 0 },
    };
    this.projectId = `project-${Date.now().toString(36)}-${Math.floor(Math.random() * 999).toString(36)}`;
  }

  getProjectId(): string {
    return this.projectId;
  }

  private getNextRoomId(): string {
    const maxNumericId = this.rooms.reduce((maxValue, room) => {
      const match = room.roomId.match(/^room-(\d+)$/);
      const parsed = match ? Number(match[1]) : Number.NaN;

      if (!Number.isFinite(parsed)) {
        return maxValue;
      }

      return Math.max(maxValue, parsed);
    }, 0);

    return `room-${maxNumericId + 1}`;
  }

  private alignRoomPositionToGrid(room: RoomModel): RoomModel {
    const snappedCenter = this.grid.snap({ x: room.centerX, y: room.centerY });

    return {
      ...room,
      centerX: snappedCenter.x,
      centerY: snappedCenter.y,
    };
  }

  addRoom(): RoomModel {
    const nextIndex = this.rooms.length;
    const column = nextIndex % NEW_ROOM_COLUMNS;
    const row = Math.floor(nextIndex / NEW_ROOM_COLUMNS);
    const roomId = this.getNextRoomId();
    const roomName = `${ROOM_FALLBACK_PREFIX} ${nextIndex + 1}`;
    const nextRoom = this.alignRoomPositionToGrid(normalizeRoomModel({
      roomId,
      roomName,
      roomLabelVisible: true,
      centerX: column * NEW_ROOM_OFFSET_MM,
      centerY: row * NEW_ROOM_OFFSET_MM,
      widthMm: DEFAULT_ROOM_SIZE_MM,
      heightMm: DEFAULT_ROOM_SIZE_MM,
      wallHeightMm: DEFAULT_WALL_HEIGHT_MM,
      rotationDeg: 0,
      settings: {
        ...DEFAULT_ROOM_SETTINGS,
        name: roomName,
      },
    }));

    this.rooms.push(nextRoom);
    this.setRooms(this.rooms);
    this.selectRoom(roomId);

    return normalizeRoomModel(nextRoom);
  }

  private getNextWallId(): string {
    const maxNumericId = this.wallSegments.reduce((maxValue, segment) => {
      const match = segment.wallId.match(/^wall-(\d+)$/);

      if (!match) {
        return maxValue;
      }

      const parsed = Number.parseInt(match[1], 10);

      if (Number.isNaN(parsed)) {
        return maxValue;
      }

      return Math.max(maxValue, parsed);
    }, 0);

    return `wall-${maxNumericId + 1}`;
  }

  private getNextWallNodeId(): string {
    const maxNumericId = this.wallNodes.reduce((maxValue, node) => {
      const match = node.nodeId.match(/^node-(\d+)$/);

      if (!match) {
        return maxValue;
      }

      const parsed = Number.parseInt(match[1], 10);

      if (Number.isNaN(parsed)) {
        return maxValue;
      }

      return Math.max(maxValue, parsed);
    }, 0);

    return `node-${maxNumericId + 1}`;
  }

  private createWallNode(position: WorldPoint): WallNode {
    const node: WallNode = {
      nodeId: this.getNextWallNodeId(),
      position: { ...position },
      connectedWallIds: [],
    };
    this.wallNodes.push(node);
    this.lastCreatedNodeId = node.nodeId;
    return node;
  }

  private getNodeById(nodeId: string): WallNode | null {
    return this.wallNodes.find((node) => node.nodeId === nodeId) ?? null;
  }

  private getSegmentById(wallId: string): WallSegment | null {
    return this.wallSegments.find((segment) => segment.wallId === wallId) ?? null;
  }

  private connectWallToNode(nodeId: string, wallId: string) {
    const node = this.getNodeById(nodeId);

    if (!node) {
      return;
    }

    if (!node.connectedWallIds.includes(wallId)) {
      node.connectedWallIds.push(wallId);
    }
  }

  private disconnectWallFromNode(nodeId: string, wallId: string) {
    const node = this.getNodeById(nodeId);

    if (!node) {
      return;
    }

    node.connectedWallIds = node.connectedWallIds.filter((id) => id !== wallId);
  }

  private removeSegment(segmentId: string) {
    const segment = this.getSegmentById(segmentId);

    if (!segment) {
      return;
    }

    this.disconnectWallFromNode(segment.startNodeId, segment.wallId);
    this.disconnectWallFromNode(segment.endNodeId, segment.wallId);
    this.wallSegments = this.wallSegments.filter((candidate) => candidate.wallId !== segment.wallId);
  }

  private createWallSegment(startNodeId: string, endNodeId: string): WallSegment | null {
    if (startNodeId === endNodeId) {
      return null;
    }

    const startNode = this.getNodeById(startNodeId);
    const endNode = this.getNodeById(endNodeId);

    if (!startNode || !endNode) {
      return null;
    }

    const existing = this.wallSegments.find(
      (segment) =>
        (segment.startNodeId === startNodeId && segment.endNodeId === endNodeId) ||
        (segment.startNodeId === endNodeId && segment.endNodeId === startNodeId),
    );

    if (existing) {
      return existing;
    }

    const segmentLength = distance(startNode.position, endNode.position);

    if (segmentLength <= SPLIT_INTERSECTION_EPSILON_MM) {
      return null;
    }

    const segmentAngle = (Math.atan2(endNode.position.y - startNode.position.y, endNode.position.x - startNode.position.x) * 180) / Math.PI;
    const segment: WallSegment = {
      wallId: this.getNextWallId(),
      startNodeId,
      endNodeId,
      startPoint: { ...startNode.position },
      endPoint: { ...endNode.position },
      length: segmentLength,
      angle: segmentAngle,
      roomIds: [],
      surfaceIds: [],
      isExternal: true,
      isInternal: false,
    };
    this.wallSegments.push(segment);
    this.connectWallToNode(startNodeId, segment.wallId);
    this.connectWallToNode(endNodeId, segment.wallId);
    this.lastCreatedWallId = segment.wallId;
    return segment;
  }

  private projectPointToSegment(point: WorldPoint, segment: WallSegment): SegmentPointProjection | null {
    const from = segment.startPoint;
    const to = segment.endPoint;
    const direction = subtract(to, from);
    const lengthSq = dot(direction, direction);

    if (lengthSq <= Number.EPSILON) {
      return null;
    }

    const relative = subtract(point, from);
    const rawT = dot(relative, direction) / lengthSq;
    const t = clamp01(rawT);
    const projected = addScaled(from, direction, t);
    return {
      point: projected,
      t,
      distance: distance(projected, point),
    };
  }

  private getNearestWallNode(point: WorldPoint, thresholdMm = WALL_NODE_SNAP_THRESHOLD_MM): WallNode | null {
    let nearest: WallNode | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const node of this.wallNodes) {
      const nodeDistance = distance(point, node.position);

      if (nodeDistance < nearestDistance && nodeDistance <= thresholdMm) {
        nearest = node;
        nearestDistance = nodeDistance;
      }
    }

    return nearest;
  }

  private splitSegmentAtNode(segmentId: string, nodeId: string): boolean {
    const segment = this.getSegmentById(segmentId);
    const node = this.getNodeById(nodeId);

    if (!segment || !node) {
      return false;
    }

    if (segment.startNodeId === nodeId || segment.endNodeId === nodeId) {
      return false;
    }

    this.removeSegment(segment.wallId);
    const first = this.createWallSegment(segment.startNodeId, nodeId);
    const second = this.createWallSegment(nodeId, segment.endNodeId);

    return Boolean(first || second);
  }

  private ensureNodeOnSegment(segment: WallSegment, point: WorldPoint): WallNode {
    const nearestNode = this.getNearestWallNode(point, WALL_NODE_SNAP_THRESHOLD_MM / 2);

    if (nearestNode) {
      this.splitSegmentAtNode(segment.wallId, nearestNode.nodeId);
      return nearestNode;
    }

    const node = this.createWallNode(point);
    this.splitSegmentAtNode(segment.wallId, node.nodeId);
    return node;
  }

  private resolveWallPointToNode(rawWorldPoint: WorldPoint): WallNode {
    const snappedWorldPoint = this.snapToGrid(rawWorldPoint);
    const nearestNode = this.getNearestWallNode(snappedWorldPoint);

    if (nearestNode) {
      return nearestNode;
    }

    let bestSegment: WallSegment | null = null;
    let bestProjection: SegmentPointProjection | null = null;

    for (const segment of this.wallSegments) {
      const projection = this.projectPointToSegment(snappedWorldPoint, segment);

      if (!projection) {
        continue;
      }

      if (projection.t <= SPLIT_INTERSECTION_EPSILON_MM || projection.t >= 1 - SPLIT_INTERSECTION_EPSILON_MM) {
        continue;
      }

      if (projection.distance > WALL_SEGMENT_SNAP_THRESHOLD_MM) {
        continue;
      }

      if (!bestProjection || projection.distance < bestProjection.distance) {
        bestProjection = projection;
        bestSegment = segment;
      }
    }

    if (bestSegment && bestProjection) {
      return this.ensureNodeOnSegment(bestSegment, this.snapToGrid(bestProjection.point));
    }

    return this.createWallNode(snappedWorldPoint);
  }

  private snapWallPointToDirection(anchor: WorldPoint, rawPoint: WorldPoint): WorldPoint {
    const deltaX = rawPoint.x - anchor.x;
    const deltaY = rawPoint.y - anchor.y;

    if (Math.abs(deltaX) <= Number.EPSILON && Math.abs(deltaY) <= Number.EPSILON) {
      return { ...anchor };
    }

    const rawAngleDeg = ((Math.atan2(deltaY, deltaX) * 180) / Math.PI + 360) % 180;
    const nearestAngle = ORTHOGONAL_SEGMENT_ANGLES_DEG.reduce((nearest, candidate) => {
      const nearestDiff = Math.min(Math.abs(rawAngleDeg - nearest), 180 - Math.abs(rawAngleDeg - nearest));
      const candidateDiff = Math.min(Math.abs(rawAngleDeg - candidate), 180 - Math.abs(rawAngleDeg - candidate));
      return candidateDiff < nearestDiff ? candidate : nearest;
    }, ORTHOGONAL_SEGMENT_ANGLES_DEG[0]);
    const directionRad = (nearestAngle * Math.PI) / 180;
    const direction = { x: Math.cos(directionRad), y: Math.sin(directionRad) };
    const projection = deltaX * direction.x + deltaY * direction.y;

    return this.snapToGrid(addScaled(anchor, direction, projection));
  }

  private splitSegmentByIntersections(segment: WallSegment): string[] {
    const intersections: Array<{ point: WorldPoint; t: number }> = [];

    for (const existing of this.wallSegments) {
      if (existing.wallId === segment.wallId) {
        continue;
      }

      const intersection = intersectSegments(segment.startPoint, segment.endPoint, existing.startPoint, existing.endPoint);

      if (!intersection) {
        continue;
      }

      if (intersection.tB > SPLIT_INTERSECTION_EPSILON_MM && intersection.tB < 1 - SPLIT_INTERSECTION_EPSILON_MM) {
        const node = this.resolveWallPointToNode(intersection.point);
        this.splitSegmentAtNode(existing.wallId, node.nodeId);
      }

      if (intersection.tA > SPLIT_INTERSECTION_EPSILON_MM && intersection.tA < 1 - SPLIT_INTERSECTION_EPSILON_MM) {
        intersections.push({ point: this.snapToGrid(intersection.point), t: intersection.tA });
      }
    }

    if (!intersections.length) {
      return [segment.wallId];
    }

    intersections.sort((left, right) => left.t - right.t);
    const splitNodes: string[] = [];

    for (const intersection of intersections) {
      const node = this.resolveWallPointToNode(intersection.point);
      splitNodes.push(node.nodeId);
    }

    let currentSegmentIds = [segment.wallId];
    for (const nodeId of splitNodes) {
      const nextSegmentIds: string[] = [];

      for (const segmentId of currentSegmentIds) {
        const targetSegment = this.getSegmentById(segmentId);

        if (!targetSegment) {
          continue;
        }

        const didSplit = this.splitSegmentAtNode(targetSegment.wallId, nodeId);

        if (!didSplit) {
          nextSegmentIds.push(targetSegment.wallId);
          continue;
        }

        const node = this.getNodeById(nodeId);
        if (node) {
          nextSegmentIds.push(...node.connectedWallIds.filter((candidateId) => {
            const candidate = this.getSegmentById(candidateId);
            return Boolean(
              candidate &&
                ((candidate.startNodeId === nodeId && candidate.endNodeId !== nodeId) || (candidate.endNodeId === nodeId && candidate.startNodeId !== nodeId)),
            );
          }));
        }
      }

      currentSegmentIds = [...new Set(nextSegmentIds)];
    }

    return currentSegmentIds;
  }

  setDrawingMode(next: boolean): boolean {
    if (this.mode !== 'main') {
      return this.isDrawingMode;
    }

    this.isDrawingMode = next;
    this.currentToolMode = next ? 'wall' : 'select';
    this.transform.endDrag();
    this.resize.endResize();

    if (!next) {
      this.resetDrawingSession();
    }
    this.isContourConvertedToRoom = false;

    return this.isDrawingMode;
  }

  getIsDrawingMode(): boolean {
    return this.isDrawingMode;
  }

  getCurrentToolMode(): CanvasToolMode {
    return this.currentToolMode;
  }

  private resetDrawingSession() {
    this.currentContourPoints = [];
    this.currentSegmentAngle = null;
    this.contourShapes = [];
    this.lastPointerWorldPoint = null;
    this.wallChainStartNodeId = null;
    this.wallChainCurrentNodeId = null;
  }

  private getNodePosition(nodeId: string): WorldPoint | null {
    return this.getNodeById(nodeId)?.position ?? null;
  }

  private getDirectedEdgesByNode(): Map<string, DirectedWallEdge[]> {
    const edgesByNode = new Map<string, DirectedWallEdge[]>();

    const pushEdge = (edge: DirectedWallEdge) => {
      const bucket = edgesByNode.get(edge.fromNodeId) ?? [];
      bucket.push(edge);
      edgesByNode.set(edge.fromNodeId, bucket);
    };

    for (const segment of this.wallSegments) {
      const from = this.getNodePosition(segment.startNodeId);
      const to = this.getNodePosition(segment.endNodeId);

      if (!from || !to) {
        continue;
      }

      pushEdge({
        edgeId: `${segment.wallId}::forward`,
        segmentId: segment.wallId,
        fromNodeId: segment.startNodeId,
        toNodeId: segment.endNodeId,
        angle: Math.atan2(to.y - from.y, to.x - from.x),
      });
      pushEdge({
        edgeId: `${segment.wallId}::backward`,
        segmentId: segment.wallId,
        fromNodeId: segment.endNodeId,
        toNodeId: segment.startNodeId,
        angle: Math.atan2(from.y - to.y, from.x - to.x),
      });
    }

    for (const [nodeId, edges] of edgesByNode.entries()) {
      edges.sort((left, right) => left.angle - right.angle);
      edgesByNode.set(nodeId, edges);
    }

    return edgesByNode;
  }

  private getFaceArea(points: WorldPoint[]): number {
    if (points.length < 3) {
      return 0;
    }

    let area = 0;

    for (let index = 0; index < points.length; index += 1) {
      const nextIndex = (index + 1) % points.length;
      area += points[index].x * points[nextIndex].y - points[nextIndex].x * points[index].y;
    }

    return area / 2;
  }

  private detectClosedRegions(): ClosedRegion[] {
    const edgesByNode = this.getDirectedEdgesByNode();
    const visited = new Set<string>();
    const detected: ClosedRegion[] = [];

    const getReverseEdgeId = (edge: DirectedWallEdge) => `${edge.segmentId}::${edge.edgeId.endsWith('forward') ? 'backward' : 'forward'}`;

    for (const edgeList of edgesByNode.values()) {
      for (const edge of edgeList) {
        if (visited.has(edge.edgeId)) {
          continue;
        }

        const pathEdges: DirectedWallEdge[] = [];
        const pathNodeIds: string[] = [];
        let currentEdge: DirectedWallEdge | null = edge;
        let guard = 0;

        while (currentEdge && guard < this.wallSegments.length * 4 + 8) {
          guard += 1;
          const activeEdge: DirectedWallEdge = currentEdge;

          if (visited.has(activeEdge.edgeId)) {
            break;
          }

          visited.add(activeEdge.edgeId);
          pathEdges.push(activeEdge);
          pathNodeIds.push(activeEdge.fromNodeId);
          const outgoing: DirectedWallEdge[] = edgesByNode.get(activeEdge.toNodeId) ?? [];
          const reverseEdgeId = getReverseEdgeId(activeEdge);
          const reverseIndex = outgoing.findIndex((candidate: DirectedWallEdge) => candidate.edgeId === reverseEdgeId);

          if (reverseIndex < 0 || outgoing.length === 0) {
            currentEdge = null;
            break;
          }

          const nextIndex = (reverseIndex - 1 + outgoing.length) % outgoing.length;
          currentEdge = outgoing[nextIndex];

          const candidateEdge = currentEdge;
          if (candidateEdge && candidateEdge.edgeId === edge.edgeId) {
            pathNodeIds.push(candidateEdge.fromNodeId);
            break;
          }
        }

        if (pathEdges.length < 3 || pathNodeIds.length < 4 || pathNodeIds[0] !== pathNodeIds[pathNodeIds.length - 1]) {
          continue;
        }

        const polygon = pathNodeIds.slice(0, -1).map((nodeId) => this.getNodePosition(nodeId)).filter((point): point is WorldPoint => Boolean(point));

        if (polygon.length < 3) {
          continue;
        }

        const area = this.getFaceArea(polygon);
        if (area <= WALL_REGION_MIN_AREA_MM2) {
          continue;
        }

        const regionId = `region-${pathEdges.map((candidate) => candidate.segmentId).sort().join('-')}`;
        detected.push({
          regionId,
          vertices: polygon,
          wallSegmentIds: [...new Set(pathEdges.map((candidate) => candidate.segmentId))],
          roomId: null,
        });
      }
    }

    return detected;
  }

  private syncAutoRoomsFromRegions() {
    const autoRoomIds = new Set(this.autoRoomByRegionId.values());
    this.rooms = this.rooms.filter((room) => !autoRoomIds.has(room.roomId));
    const nextAutoRoomByRegionId = new Map<string, string>();

    for (const region of this.closedRegions) {
      if (region.vertices.length < 3) {
        continue;
      }

      const bounds = region.vertices.reduce(
        (acc, point) => ({
          minX: Math.min(acc.minX, point.x),
          maxX: Math.max(acc.maxX, point.x),
          minY: Math.min(acc.minY, point.y),
          maxY: Math.max(acc.maxY, point.y),
        }),
        { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
      );
      const center = this.snapToGrid({
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      });
      const roomId = this.autoRoomByRegionId.get(region.regionId) ?? this.getNextRoomId();
      const roomName = `${ROOM_FALLBACK_PREFIX} ${this.rooms.length + 1}`;
      const room = normalizeRoomModel({
        roomId,
        roomName,
        roomLabelVisible: true,
        centerX: center.x,
        centerY: center.y,
        verticesMm: region.vertices.map((vertex) => ({ x: vertex.x - center.x, y: vertex.y - center.y })),
        widthMm: Math.max(400, bounds.maxX - bounds.minX),
        heightMm: Math.max(400, bounds.maxY - bounds.minY),
        wallHeightMm: DEFAULT_WALL_HEIGHT_MM,
        rotationDeg: 0,
        settings: {
          ...DEFAULT_ROOM_SETTINGS,
          name: roomName,
        },
      });

      region.roomId = roomId;
      this.lastDetectedRoomId = roomId;
      this.rooms.push(room);
      nextAutoRoomByRegionId.set(region.regionId, roomId);
    }

    this.autoRoomByRegionId = nextAutoRoomByRegionId;
    this.selection.setRooms(this.rooms);
    this.transform.setRooms(this.rooms);
    this.transform.setActiveRoomId(this.selection.getActiveRoomId());
    this.resize.setRooms(this.rooms);
    this.resize.setActiveRoomId(this.selection.getActiveRoomId());
    this.rotate.setRooms(this.rooms);
    this.rotate.setActiveRoomId(this.selection.getActiveRoomId());
  }

  private recomputeWallTopology() {
    this.closedRegions = this.detectClosedRegions();

    for (const segment of this.wallSegments) {
      const linkedRoomIds = this.closedRegions
        .filter((region) => region.wallSegmentIds.includes(segment.wallId))
        .map((region) => region.roomId)
        .filter((roomId): roomId is string => Boolean(roomId));

      segment.roomIds = [...new Set(linkedRoomIds)];
      segment.isInternal = segment.roomIds.length >= 2;
      segment.isExternal = segment.roomIds.length <= 1;
    }

    this.syncAutoRoomsFromRegions();

    for (const segment of this.wallSegments) {
      const linkedRoomIds = this.closedRegions
        .filter((region) => region.wallSegmentIds.includes(segment.wallId))
        .map((region) => region.roomId)
        .filter((roomId): roomId is string => Boolean(roomId));
      segment.roomIds = [...new Set(linkedRoomIds)];
      segment.isInternal = segment.roomIds.length >= 2;
      segment.isExternal = segment.roomIds.length <= 1;
    }

    this.wallGraphUpdated = true;
  }

  addWallPointAtScreenPoint(point: ScreenPoint): WallSegment[] {
    if (!this.isDrawingMode || this.mode !== 'main') {
      return [];
    }

    const worldPoint = this.screenToWorld(point);
    const chainNode = this.wallChainCurrentNodeId ? this.getNodeById(this.wallChainCurrentNodeId) : null;
    const snappedPoint = chainNode ? this.snapWallPointToDirection(chainNode.position, worldPoint) : this.snapToGrid(worldPoint);
    const targetNode = this.resolveWallPointToNode(snappedPoint);

    if (!this.wallChainCurrentNodeId) {
      this.wallChainStartNodeId = targetNode.nodeId;
      this.wallChainCurrentNodeId = targetNode.nodeId;
      this.lastPointerWorldPoint = { ...targetNode.position };
      return [];
    }

    const created = this.createWallSegment(this.wallChainCurrentNodeId, targetNode.nodeId);

    if (!created) {
      return [];
    }

    const previousNodeId = this.wallChainCurrentNodeId;
    this.splitSegmentByIntersections(created);
    this.wallChainCurrentNodeId = targetNode.nodeId;
    this.lastPointerWorldPoint = { ...targetNode.position };
    const targetConnections = this.getNodeById(targetNode.nodeId)?.connectedWallIds.length ?? 0;
    this.isContourClosed = Boolean(this.wallChainStartNodeId && (targetNode.nodeId === this.wallChainStartNodeId || (targetConnections > 1 && previousNodeId !== targetNode.nodeId)));
    this.recomputeWallTopology();
    return [created];
  }

  private registerSplitDebugState(sourceRoomId: string, newRoomIds: string[]) {
    this.isRoomSplitOperation = true;
    this.splitSourceRoomId = sourceRoomId;
    this.splitNewRoomIds = [...newRoomIds];
  }

  private clearSplitDebugState() {
    this.isRoomSplitOperation = false;
    this.splitSourceRoomId = null;
    this.splitNewRoomIds = [];
  }

  private getContourCloseThresholdMm(): number {
    const { gridStepMm } = this.grid.getGridMetrics();
    return Math.max(CONTOUR_CLOSE_THRESHOLD_MM, gridStepMm * 1.5);
  }

  private isPointNearContourStart(point: WorldPoint): boolean {
    if (this.currentContourPoints.length < MIN_CONTOUR_POINTS_TO_CLOSE) {
      return false;
    }

    const start = this.currentContourPoints[0];
    return distance(point, start) <= this.getContourCloseThresholdMm();
  }

  private snapContourPointToOrthogonalDirection(rawPoint: WorldPoint): { point: WorldPoint; angleDeg: number | null } {
    const anchor = this.currentContourPoints[this.currentContourPoints.length - 1];

    if (!anchor) {
      return { point: rawPoint, angleDeg: null };
    }

    const deltaX = rawPoint.x - anchor.x;
    const deltaY = rawPoint.y - anchor.y;

    if (Math.abs(deltaX) <= Number.EPSILON && Math.abs(deltaY) <= Number.EPSILON) {
      return { point: anchor, angleDeg: null };
    }

    const rawAngleDeg = ((Math.atan2(deltaY, deltaX) * 180) / Math.PI + 360) % 180;
    const nearestAngle = ORTHOGONAL_SEGMENT_ANGLES_DEG.reduce((nearest, candidate) => {
      const nearestDiff = Math.min(Math.abs(rawAngleDeg - nearest), 180 - Math.abs(rawAngleDeg - nearest));
      const candidateDiff = Math.min(Math.abs(rawAngleDeg - candidate), 180 - Math.abs(rawAngleDeg - candidate));
      return candidateDiff < nearestDiff ? candidate : nearest;
    }, ORTHOGONAL_SEGMENT_ANGLES_DEG[0]);
    const directionRad = (nearestAngle * Math.PI) / 180;
    const direction = { x: Math.cos(directionRad), y: Math.sin(directionRad) };
    const projection = deltaX * direction.x + deltaY * direction.y;
    const sign = projection >= 0 ? 1 : -1;
    const normalizedDirection = { x: direction.x * sign, y: direction.y * sign };
    const { gridStepMm } = this.grid.getGridMetrics();

    if (nearestAngle === 0) {
      const nextX = Math.round((anchor.x + projection) / gridStepMm) * gridStepMm;
      return {
        point: { x: nextX, y: anchor.y },
        angleDeg: 0,
      };
    }

    if (nearestAngle === 90) {
      const nextY = Math.round((anchor.y + projection) / gridStepMm) * gridStepMm;
      return {
        point: { x: anchor.x, y: nextY },
        angleDeg: 90,
      };
    }

    const diagonalComponent = projection / Math.SQRT2;
    const snappedComponent = Math.round(diagonalComponent / gridStepMm) * gridStepMm;
    const point = {
      x: anchor.x + snappedComponent * Math.sign(normalizedDirection.x || 1),
      y: anchor.y + snappedComponent * Math.sign(normalizedDirection.y || 1),
    };

    return {
      point,
      angleDeg: nearestAngle,
    };
  }

  isContourSnapToStartActive(): boolean {
    if (!this.isDrawingMode || !this.lastPointerWorldPoint) {
      return false;
    }

    return this.isPointNearContourStart(this.lastPointerWorldPoint);
  }

  private getContourBoundaryIntersections(room: RoomModel, contourPoints: WorldPoint[]): BoundaryIntersectionPoint[] {
    if (contourPoints.length < 2) {
      return [];
    }

    const geometry = this.getRoomGeometry(room);
    const intersections: BoundaryIntersectionPoint[] = [];
    let contourDistance = 0;

    for (let contourIndex = 0; contourIndex < contourPoints.length - 1; contourIndex += 1) {
      const from = contourPoints[contourIndex];
      const to = contourPoints[contourIndex + 1];
      const segmentLength = distance(from, to);

      if (segmentLength <= SPLIT_INTERSECTION_EPSILON_MM) {
        contourDistance += segmentLength;
        continue;
      }

      for (let edgeIndex = 0; edgeIndex < geometry.edges.length; edgeIndex += 1) {
        const edge = geometry.edges[edgeIndex];
        const intersection = intersectSegments(from, to, edge.from, edge.to);

        if (!intersection) {
          continue;
        }

        intersections.push({
          point: intersection.point,
          contourSegmentIndex: contourIndex,
          contourSegmentT: intersection.tA,
          edgeIndex,
          edgeT: intersection.tB,
          contourDistance: contourDistance + segmentLength * intersection.tA,
        });
      }

      contourDistance += segmentLength;
    }

    intersections.sort((left, right) => left.contourDistance - right.contourDistance);

    return intersections.filter((candidate, index, list) => {
      const duplicate = list.findIndex((entry) =>
        Math.abs(entry.contourDistance - candidate.contourDistance) <= SPLIT_INTERSECTION_EPSILON_MM &&
        isSamePoint(entry.point, candidate.point),
      );
      return duplicate === index;
    });
  }

  private getBoundaryPath(
    corners: WorldPoint[],
    startIntersection: BoundaryIntersectionPoint,
    endIntersection: BoundaryIntersectionPoint,
    direction: 1 | -1,
  ): WorldPoint[] {
    const vertexCount = corners.length;
    const path: WorldPoint[] = [{ ...startIntersection.point }];

    if (startIntersection.edgeIndex === endIntersection.edgeIndex) {
      const isForwardOnSameEdge = endIntersection.edgeT >= startIntersection.edgeT;
      if ((direction === 1 && isForwardOnSameEdge) || (direction === -1 && !isForwardOnSameEdge)) {
        path.push({ ...endIntersection.point });
        return dedupePath(path);
      }
    }

    let edgeIndex = startIntersection.edgeIndex;
    let guard = 0;

    while (guard < vertexCount + 2) {
      const nextVertexIndex = direction === 1 ? (edgeIndex + 1) % vertexCount : edgeIndex;
      path.push({ ...corners[nextVertexIndex] });

      if ((direction === 1 ? nextVertexIndex : (edgeIndex - 1 + vertexCount) % vertexCount) === endIntersection.edgeIndex) {
        path.push({ ...endIntersection.point });
        break;
      }

      edgeIndex = direction === 1 ? (edgeIndex + 1) % vertexCount : (edgeIndex - 1 + vertexCount) % vertexCount;
      guard += 1;
    }

    return dedupePath(path);
  }

  private splitRoomByContour(sourceRoom: RoomModel, contourPoints: WorldPoint[]): { sourceRoomId: string; newRoomIds: string[] } | null {
    if (!RoomGeometry.hasPolygonGeometry(sourceRoom) || contourPoints.length < 2) {
      return null;
    }

    const geometry = this.getRoomGeometry(sourceRoom);
    const intersections = this.getContourBoundaryIntersections(sourceRoom, contourPoints);

    if (intersections.length < 2) {
      return null;
    }

    const firstIntersection = intersections[0];
    const secondIntersection = intersections[1];
    const splitterPath: WorldPoint[] = [{ ...firstIntersection.point }];

    for (let index = firstIntersection.contourSegmentIndex + 1; index <= secondIntersection.contourSegmentIndex; index += 1) {
      splitterPath.push({ ...contourPoints[index] });
    }

    splitterPath.push({ ...secondIntersection.point });
    const forwardBoundary = this.getBoundaryPath(geometry.corners, firstIntersection, secondIntersection, 1);
    const backwardBoundary = this.getBoundaryPath(geometry.corners, secondIntersection, firstIntersection, 1);
    const reversedSplitterPath = [...splitterPath].reverse();
    const polygonA = simplifyCollinear(dedupePath([...splitterPath, ...backwardBoundary.slice(1)]));
    const polygonB = simplifyCollinear(dedupePath([...reversedSplitterPath, ...forwardBoundary.slice(1)]));

    if (polygonA.length < 3 || polygonB.length < 3) {
      return null;
    }

    const createDerivedRoom = (polygon: WorldPoint[], nameSuffix: string): RoomModel => {
      const bounds = polygon.reduce(
        (acc, point) => ({
          minX: Math.min(acc.minX, point.x),
          maxX: Math.max(acc.maxX, point.x),
          minY: Math.min(acc.minY, point.y),
          maxY: Math.max(acc.maxY, point.y),
        }),
        {
          minX: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
        },
      );
      const center = this.snapToGrid({
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      });
      const widthMm = Math.max(400, bounds.maxX - bounds.minX);
      const heightMm = Math.max(400, bounds.maxY - bounds.minY);

      return normalizeRoomModel({
        ...sourceRoom,
        roomId: this.getNextRoomId(),
        roomName: `${this.resolveRoomName(sourceRoom)} ${nameSuffix}`,
        centerX: center.x,
        centerY: center.y,
        widthMm,
        heightMm,
        rotationDeg: 0,
        verticesMm: polygon.map((point) => ({
          x: point.x - center.x,
          y: point.y - center.y,
        })),
      });
    };

    this.rooms = this.rooms.filter((room) => room.roomId !== sourceRoom.roomId);
    const firstRoom = createDerivedRoom(polygonA, 'A');
    this.rooms.push(firstRoom);
    const secondRoom = createDerivedRoom(polygonB, 'B');
    this.rooms.push(secondRoom);
    this.setRooms(this.rooms);
    this.selectRoom(firstRoom.roomId);

    return {
      sourceRoomId: sourceRoom.roomId,
      newRoomIds: [firstRoom.roomId, secondRoom.roomId],
    };
  }

  private trySplitRoomByContour(contourPoints: WorldPoint[]): boolean {
    if (contourPoints.length < 2) {
      return false;
    }

    const sourceRoom = this.rooms.find((room) => RoomGeometry.hasPolygonGeometry(room) && RoomGeometry.containsPoint(room, contourPoints[0]));

    if (!sourceRoom) {
      return false;
    }

    const splitResult = this.splitRoomByContour(sourceRoom, contourPoints);

    if (!splitResult) {
      return false;
    }

    this.registerSplitDebugState(splitResult.sourceRoomId, splitResult.newRoomIds);
    this.resetDrawingSession();
    this.isContourClosed = false;
    this.isContourConvertedToRoom = true;
    this.lastCreatedShapeId = splitResult.newRoomIds[0] ?? null;
    this.isDrawingMode = false;
    return true;
  }

  addContourPointAtScreenPoint(point: ScreenPoint): ContourShapeWorldGeometry | null {
    if (!this.isDrawingMode || this.mode !== 'main') {
      return null;
    }

    if (this.currentToolMode === 'wall') {
      this.addWallPointAtScreenPoint(point);
      return null;
    }

    const worldPoint = this.snapToGrid(this.screenToWorld(point));
    const snappedSegment = this.snapContourPointToOrthogonalDirection(worldPoint);
    const contourPoint = this.currentContourPoints.length === 0 ? worldPoint : this.snapToGrid(snappedSegment.point);
    this.currentSegmentAngle = snappedSegment.angleDeg;
    this.lastPointerWorldPoint = contourPoint;

    if (this.currentContourPoints.length >= MIN_CONTOUR_POINTS_TO_CLOSE && this.isPointNearContourStart(contourPoint)) {
      const closedPoints = [...this.currentContourPoints];
      const room = this.createRoomFromContour(closedPoints);
      this.resetDrawingSession();
      this.isContourClosed = true;
      this.isContourConvertedToRoom = room !== null;
      this.lastCreatedShapeId = room?.roomId ?? null;
      this.clearSplitDebugState();
      this.isDrawingMode = false;
      return null;
    }

    const anchor = this.currentContourPoints[this.currentContourPoints.length - 1];

    if (anchor && distance(anchor, contourPoint) <= Number.EPSILON) {
      return null;
    }

    this.currentContourPoints.push(contourPoint);
    if (this.trySplitRoomByContour(this.currentContourPoints)) {
      return null;
    }

    this.clearSplitDebugState();
    this.isContourClosed = false;
    this.isContourConvertedToRoom = false;
    return null;
  }

  private createRoomFromContour(points: WorldPoint[]): RoomModel | null {
    if (points.length < MIN_CONTOUR_POINTS_TO_CLOSE) {
      return null;
    }

    const bounds = points.reduce(
      (acc, point) => ({
        minX: Math.min(acc.minX, point.x),
        maxX: Math.max(acc.maxX, point.x),
        minY: Math.min(acc.minY, point.y),
        maxY: Math.max(acc.maxY, point.y),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );
    const widthMm = Math.max(400, bounds.maxX - bounds.minX);
    const heightMm = Math.max(400, bounds.maxY - bounds.minY);
    const center = this.snapToGrid({
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    });
    const verticesMm = points.map((point) => ({
      x: point.x - center.x,
      y: point.y - center.y,
    }));
    const roomName = `${ROOM_FALLBACK_PREFIX} ${this.rooms.length + 1}`;
    const room = normalizeRoomModel({
      roomId: this.getNextRoomId(),
      roomName,
      roomLabelVisible: true,
      centerX: center.x,
      centerY: center.y,
      verticesMm,
      widthMm,
      heightMm,
      wallHeightMm: DEFAULT_WALL_HEIGHT_MM,
      rotationDeg: 0,
      settings: {
        ...DEFAULT_ROOM_SETTINGS,
        name: roomName,
      },
    });

    this.rooms.push(room);
    this.setRooms(this.rooms);
    this.selectRoom(room.roomId);
    return room;
  }

  getCurrentContourPointsScreen(): ScreenPoint[] {
    return this.currentContourPoints.map((point) => this.worldToScreen(point));
  }

  getContourShapesScreen(): ContourShapeScreenGeometry[] {
    return this.contourShapes.map((shape) => ({
      ...shape,
      points: shape.points.map((point) => this.worldToScreen(point)),
    }));
  }

  getWallGraphNodes(): WallNode[] {
    return this.wallNodes.map((node) => ({
      ...node,
      position: { ...node.position },
      connectedWallIds: [...node.connectedWallIds],
    }));
  }

  getWallGraphSegments(): WallSegment[] {
    return this.wallSegments.map((segment) => ({
      ...segment,
      startPoint: { ...segment.startPoint },
      endPoint: { ...segment.endPoint },
      roomIds: [...segment.roomIds],
      surfaceIds: [...segment.surfaceIds],
    }));
  }

  getWallClosedRegions(): ClosedRegion[] {
    return this.closedRegions.map((region) => ({
      ...region,
      vertices: region.vertices.map((vertex) => ({ ...vertex })),
      wallSegmentIds: [...region.wallSegmentIds],
    }));
  }

  setViewport(viewport: Viewport) {
    this.canvasState = {
      ...this.canvasState,
      isReady: viewport.width > 0 && viewport.height > 0,
      viewport,
    };

    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      this.fitSurfaceSceneToViewport();
    }
  }

  setRooms(rooms: RoomModel[]) {
    this.rooms = rooms.map((room) => {
      const normalizedRoom = this.alignRoomPositionToGrid(normalizeRoomModel(room));
      const legacySettingsName = normalizedRoom.settings?.name?.trim();

      if (!normalizedRoom.roomName && legacySettingsName) {
        normalizedRoom.roomName = legacySettingsName;
      }

      return normalizedRoom;
    });
    this.selection.setRooms(this.rooms);
    this.transform.setRooms(this.rooms);
    this.transform.setActiveRoomId(this.selection.getActiveRoomId());
    this.resize.setRooms(this.rooms);
    this.resize.setActiveRoomId(this.selection.getActiveRoomId());
    this.rotate.setRooms(this.rooms);
    this.rotate.setActiveRoomId(this.selection.getActiveRoomId());
    if (this.wallSegments.length > 0) {
      this.recomputeWallTopology();
    }
  }

  getRooms(): RoomModel[] {
    return this.rooms.map((room) => normalizeRoomModel(room));
  }

  getActiveRoomId(): string | null {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return this.surfaceSceneRoomId;
    }

    return this.selection.getActiveRoomId();
  }

  getActiveRoom(): RoomModel | null {
    const activeRoom = this.selection.getActiveRoom();

    return activeRoom ? normalizeRoomModel(activeRoom) : null;
  }

  isPolygonRoom(room: RoomModel): boolean {
    return RoomGeometry.hasPolygonGeometry(room);
  }

  updateRoomDimensions(roomId: string, widthMm: number, heightMm: number): RoomModel | null {
    const room = this.rooms.find((candidate) => candidate.roomId === roomId);

    if (!room) {
      return null;
    }

    if (this.isPolygonRoom(room)) {
      return normalizeRoomModel(room);
    }

    room.widthMm = Math.max(400, widthMm);
    room.heightMm = Math.max(400, heightMm);

    return withDefaultSettings({ ...room });
  }

  updateRoomSettings(roomId: string, patch: Partial<RoomSettings>): RoomModel | null {
    const room = this.rooms.find((candidate) => candidate.roomId === roomId);

    if (!room) {
      return null;
    }

    room.settings = {
      ...DEFAULT_ROOM_SETTINGS,
      ...(room.settings ?? {}),
      ...patch,
    };

    return normalizeRoomModel(room);
  }

  updateRoomDimensionUnit(roomId: string, unit: DimensionUnit): RoomModel | null {
    return this.updateRoomSettings(roomId, { dimensionUnit: unit });
  }

  updateRoomName(roomId: string, name: string): RoomModel | null {
    const room = this.rooms.find((candidate) => candidate.roomId === roomId);

    if (!room) {
      return null;
    }

    const nextRoomName = name.trim();
    room.roomName = nextRoomName;
    room.settings = {
      ...DEFAULT_ROOM_SETTINGS,
      ...(room.settings ?? {}),
      name: nextRoomName,
    };

    return normalizeRoomModel(room);
  }

  updateRoomLabelVisibility(roomId: string, isVisible: boolean): RoomModel | null {
    const room = this.rooms.find((candidate) => candidate.roomId === roomId);

    if (!room) {
      return null;
    }

    room.roomLabelVisible = isVisible;

    return normalizeRoomModel(room);
  }

  updateRoomWallHeight(roomId: string, wallHeightMm: number): RoomModel | null {
    const room = this.rooms.find((candidate) => candidate.roomId === roomId);

    if (!room) {
      return null;
    }

    room.wallHeightMm = Math.max(400, wallHeightMm);

    return normalizeRoomModel(room);
  }

  getRoomOpenEntryPoint(roomId: string): RoomOpenEntryPoint | null {
    const room = this.rooms.find((candidate) => candidate.roomId === roomId);

    if (!room) {
      return null;
    }

    const geometry = this.getRoomGeometry(room);

    return {
      roomId: room.roomId,
      roomName: this.resolveRoomName(room),
      widthMm: geometry.bounds.width,
      heightMm: geometry.bounds.height,
      rotationDeg: room.rotationDeg,
    };
  }

  selectRoom(roomId: string): string | null {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return this.surfaceSceneRoomId;
    }

    const activeRoomId = this.selection.selectRoom(roomId);
    this.transform.setActiveRoomId(activeRoomId);
    this.resize.setActiveRoomId(activeRoomId);
    this.rotate.setActiveRoomId(activeRoomId);
    return activeRoomId;
  }

  clearActiveRoom(): string | null {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return this.surfaceSceneRoomId;
    }

    const activeRoomId = this.selection.clearSelection();
    this.transform.setActiveRoomId(activeRoomId);
    this.resize.setActiveRoomId(activeRoomId);
    this.rotate.setActiveRoomId(activeRoomId);
    return activeRoomId;
  }

  updateLastPointer(screenPoint: ScreenPoint): WorldPoint {
    const worldPoint = this.screenToWorld(screenPoint);

    if (this.isDrawingMode && (this.currentContourPoints.length > 0 || this.wallChainCurrentNodeId !== null)) {
      if (this.currentToolMode === 'wall' && this.wallChainCurrentNodeId) {
        const anchor = this.getNodeById(this.wallChainCurrentNodeId)?.position ?? this.snapToGrid(worldPoint);
        const snappedPoint = this.snapWallPointToDirection(anchor, this.snapToGrid(worldPoint));
        this.currentSegmentAngle = (Math.atan2(snappedPoint.y - anchor.y, snappedPoint.x - anchor.x) * 180) / Math.PI;
        this.lastPointerWorldPoint = snappedPoint;
      } else {
        const snappedSegment = this.snapContourPointToOrthogonalDirection(this.snapToGrid(worldPoint));
        this.currentSegmentAngle = snappedSegment.angleDeg;
        this.lastPointerWorldPoint = this.snapToGrid(snappedSegment.point);
      }
      return this.lastPointerWorldPoint;
    }

    this.lastPointerWorldPoint = worldPoint;
    this.currentSegmentAngle = null;
    return worldPoint;
  }

  getRoomIdAtScreenPoint(point: ScreenPoint): string | null {
    if (this.mode === 'room-surface-scene') {
      return this.surfaceSceneRoomId;
    }

    return this.selection.getRoomIdAt(this.updateLastPointer(point));
  }

  handleTap(point: ScreenPoint): string | null {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      this.updateLastPointer(point);
      return this.surfaceSceneRoomId;
    }

    const worldPoint = this.updateLastPointer(point);
    const activeRoomId = this.selection.selectRoomAt(worldPoint);
    this.transform.setActiveRoomId(activeRoomId);
    this.resize.setActiveRoomId(activeRoomId);
    this.rotate.setActiveRoomId(activeRoomId);
    return activeRoomId;
  }

  startDrag(): boolean {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return false;
    }

    this.resize.endResize();
    return this.transform.startDrag();
  }

  startResize(handleId: RoomResizeHandleId): boolean {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return false;
    }

    this.transform.endDrag();
    return this.resize.startResize(handleId);
  }

  dragBy(screenDelta: ScreenPoint): RoomModel | null {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return null;
    }

    const worldDelta = CoordinateSystem.screenDeltaToWorldDelta(this.camera, screenDelta);
    const room = this.transform.dragByWorldDelta(worldDelta);

    return room ? { ...room } : null;
  }

  endDrag() {
    this.transform.endDrag();
  }

  resizeBy(screenDelta: ScreenPoint): RoomModel | null {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return null;
    }

    const worldDelta = CoordinateSystem.screenDeltaToWorldDelta(this.camera, screenDelta);
    const room = this.resize.resizeByWorldDelta(worldDelta);

    return room ? { ...room } : null;
  }

  endResize() {
    this.resize.endResize();
  }

  rotateActiveRoom(stepDeg = 90): RoomModel | null {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return null;
    }

    this.transform.endDrag();
    this.resize.endResize();

    const room = this.rotate.rotateActiveRoom(stepDeg);

    return room ? { ...room } : null;
  }

  getRoomRotation(roomId: string): number {
    return this.rooms.find((room) => room.roomId === roomId)?.rotationDeg ?? 0;
  }

  panBy(deltaX: number, deltaY: number) {
    this.camera.panByScreenDelta(deltaX, deltaY);
  }

  zoomBy(factor: number) {
    this.camera.zoomBy(factor);
  }

  resetView() {
    this.camera.resetView();
  }

  getWorldCenter(): WorldPoint {
    return {
      x: 0,
      y: 0,
    };
  }

  getScreenCenter(): ScreenPoint {
    return {
      x: this.canvasState.viewport.width / 2,
      y: this.canvasState.viewport.height / 2,
    };
  }

  private getWallSegments(): WallSurfaceSegment[] {
    return this.rooms.flatMap((room) => {
      const geometry = this.getRoomGeometry(room);

      return geometry.edges.map((edge, edgeIndex) => ({
        surfaceId: `${room.roomId}-wall-${edgeIndex + 1}`,
        roomId: room.roomId,
        type: edgeIndex < 4 ? (['north', 'east', 'south', 'west'][edgeIndex] as RoomSurfaceType) : 'wall',
        directionDeg: (Math.atan2(edge.to.y - edge.from.y, edge.to.x - edge.from.x) * 180) / Math.PI,
        from: edge.from,
        to: edge.to,
        length: distance(edge.from, edge.to),
      }));
    });
  }

  private detectSharedSegment(left: WallSurfaceSegment, right: WallSurfaceSegment, toleranceMm = SHARED_SURFACE_TOLERANCE_MM): SharedSegmentDetection | null {
    if (left.roomId === right.roomId || left.length <= toleranceMm || right.length <= toleranceMm) {
      return null;
    }

    const leftDirectionRaw = subtract(left.to, left.from);
    const lineLength = left.length;
    const leftDirection = { x: leftDirectionRaw.x / lineLength, y: leftDirectionRaw.y / lineLength };

    const rightFromOffset = subtract(right.from, left.from);
    const rightToOffset = subtract(right.to, left.from);
    const rightFromCross = Math.abs(cross(leftDirectionRaw, rightFromOffset));
    const rightToCross = Math.abs(cross(leftDirectionRaw, rightToOffset));
    const lineDistanceTolerance = toleranceMm * lineLength;

    if (rightFromCross > lineDistanceTolerance || rightToCross > lineDistanceTolerance) {
      return null;
    }

    const leftStart = 0;
    const leftEnd = lineLength;
    const rightFromProjection = dot(rightFromOffset, leftDirection);
    const rightToProjection = dot(rightToOffset, leftDirection);
    const rightStart = Math.min(rightFromProjection, rightToProjection);
    const rightEnd = Math.max(rightFromProjection, rightToProjection);
    const overlapStart = Math.max(leftStart, rightStart);
    const overlapEnd = Math.min(leftEnd, rightEnd);
    const overlapLength = overlapEnd - overlapStart;

    if (overlapLength <= toleranceMm) {
      return null;
    }

    const sharedMode: SharedSurfaceMode =
      Math.abs(overlapLength - left.length) <= toleranceMm && Math.abs(overlapLength - right.length) <= toleranceMm ? 'full' : 'partial';

    return {
      start: addScaled(left.from, leftDirection, overlapStart),
      end: addScaled(left.from, leftDirection, overlapEnd),
      length: overlapLength,
      mode: sharedMode,
    };
  }

  private getSharedSurfaceLinksById(): Map<string, SharedSurfaceLink> {
    const segments = this.getWallSegments();
    const pairCandidates: Array<{
      source: WallSurfaceSegment;
      target: WallSurfaceSegment;
      sharedLength: number;
      sharedMode: SharedSurfaceMode;
      sharedSegmentStart: WorldPoint;
      sharedSegmentEnd: WorldPoint;
    }> = [];

    for (let index = 0; index < segments.length; index += 1) {
      const source = segments[index];

      for (let nextIndex = index + 1; nextIndex < segments.length; nextIndex += 1) {
        const target = segments[nextIndex];
        const shared = this.detectSharedSegment(source, target);

        if (!shared) {
          continue;
        }

        pairCandidates.push({
          source,
          target,
          sharedLength: shared.length,
          sharedMode: shared.mode,
          sharedSegmentStart: shared.start,
          sharedSegmentEnd: shared.end,
        });
      }
    }

    const linksById = new Map<string, SharedSurfaceLink>();
    const assignedSurfaceIds = new Set<string>();
    pairCandidates.sort((left, right) => right.sharedLength - left.sharedLength);

    for (const pair of pairCandidates) {
      if (assignedSurfaceIds.has(pair.source.surfaceId) || assignedSurfaceIds.has(pair.target.surfaceId)) {
        continue;
      }

      linksById.set(pair.source.surfaceId, {
        linkedSurfaceId: pair.target.surfaceId,
        linkedRoomId: pair.target.roomId,
        sharedMode: pair.sharedMode,
        sharedSegmentStart: pair.sharedSegmentStart,
        sharedSegmentEnd: pair.sharedSegmentEnd,
        sharedLength: pair.sharedLength,
      });
      linksById.set(pair.target.surfaceId, {
        linkedSurfaceId: pair.source.surfaceId,
        linkedRoomId: pair.source.roomId,
        sharedMode: pair.sharedMode,
        sharedSegmentStart: pair.sharedSegmentStart,
        sharedSegmentEnd: pair.sharedSegmentEnd,
        sharedLength: pair.sharedLength,
      });
      assignedSurfaceIds.add(pair.source.surfaceId);
      assignedSurfaceIds.add(pair.target.surfaceId);
    }

    return linksById;
  }

  private getSurfaceSharedDebugState() {
    const activeSurfaceId = this.activeSurfaceId;

    if (!activeSurfaceId) {
      return null;
    }

    const link = this.getSharedSurfaceLinksById().get(activeSurfaceId) ?? null;

    return {
      isSharedSurface: Boolean(link),
      linkedSurfaceId: link?.linkedSurfaceId ?? null,
      linkedRoomId: link?.linkedRoomId ?? null,
      sharedMode: link?.sharedMode ?? null,
      sharedLength: link ? Math.round(link.sharedLength * 1000) / 1000 : null,
      surfaceType: link ? 'internal' : 'external',
    } as const;
  }

  getDebugState(): CanvasDebugState {
    const camera = this.camera.getState();
    const screenCenter = this.getScreenCenter();
    const displayZoom = getDisplayZoom(camera.zoom, camera.minZoom, BASE_ZOOM, camera.maxZoom);

    const gridMetrics = this.grid.getGridMetrics();
    const activeRoom = this.getActiveRoom();
    const activeRoomGeometry = activeRoom ? this.getRoomGeometry(activeRoom) : null;
    const roomVerticesCount = activeRoomGeometry?.corners.length ?? null;
    const roomEdgesCount = activeRoomGeometry?.edges.length ?? null;

    return {
      projectId: this.projectId,
      cameraZoom: camera.zoom,
      displayZoom,
      zoomPercent: Math.round(camera.zoom * 100),
      panX: camera.panX,
      panY: camera.panY,
      minZoom: camera.minZoom,
      maxZoom: camera.maxZoom,
      viewport: this.canvasState.viewport,
      worldCenter: this.getWorldCenter(),
      screenCenter,
      worldAtScreenCenter: this.screenToWorld(screenCenter),
      activeRoomId: this.getActiveRoomId(),
      snappedRoomId: this.transform.getSnappedRoomId(),
      snapTargetRoomId: this.transform.getSnapTargetRoomId(),
      snapPreview: this.transform.getSnapPreview(),
      isDraggingRoom: this.transform.isDragActive(),
      isResizingRoom: this.resize.isResizeActive(),
      activeResizeHandleId: this.resize.getActiveHandleId(),
      activeRoomRotationDeg: this.getActiveRoom()?.rotationDeg ?? null,
      roomIds: this.rooms.map((room) => room.roomId),
      roomsCount: this.rooms.length,
      roomPositions: this.rooms.map((room) => ({ roomId: room.roomId, centerX: room.centerX, centerY: room.centerY })),
      isDrawingMode: this.isDrawingMode,
      currentToolMode: this.currentToolMode,
      wallDrawingMode: this.isDrawingMode && this.currentToolMode === 'wall',
      isOrthogonalDrawingMode: this.isDrawingMode,
      currentSegmentAngle: this.currentSegmentAngle,
      currentContourPointsCount: this.currentContourPoints.length,
      isContourClosed: this.isContourClosed,
      isContourConvertedToRoom: this.isContourConvertedToRoom,
      lastCreatedShapeId: this.lastCreatedShapeId,
      roomVerticesCount,
      roomIsPolygon: Boolean(activeRoom && this.isPolygonRoom(activeRoom)),
      roomEdgesCount,
      activeSurfaceSharedDebug: this.getSurfaceSharedDebugState(),
      gridStepMm: gridMetrics.gridStepMm,
      gridLevel: gridMetrics.gridLevel,
      cellsPerMeter: gridMetrics.cellsPerMeter,
      lastPointerWorldX: this.lastPointerWorldPoint?.x ?? null,
      lastPointerWorldY: this.lastPointerWorldPoint?.y ?? null,
      isRoomSplitOperation: this.isRoomSplitOperation,
      splitSourceRoomId: this.splitSourceRoomId,
      newRoomIds: [...this.splitNewRoomIds],
      wallSegmentsCount: this.wallSegments.length,
      wallNodesCount: this.wallNodes.length,
      closedRegionsCount: this.closedRegions.length,
      lastCreatedWallId: this.lastCreatedWallId,
      lastCreatedNodeId: this.lastCreatedNodeId,
      lastDetectedRoomId: this.lastDetectedRoomId,
      wallGraphUpdated: this.wallGraphUpdated,
    };
  }

  screenToWorld(point: ScreenPoint): WorldPoint {
    return CoordinateSystem.screenToWorld(this.camera, point, this.canvasState.viewport);
  }

  worldToScreen(point: WorldPoint): ScreenPoint {
    return CoordinateSystem.worldToScreen(this.camera, point, this.canvasState.viewport);
  }

  snapToGrid(point: WorldPoint): WorldPoint {
    return this.grid.snap(point);
  }

  getRoomGeometry(room: RoomModel): RoomWorldGeometry {
    return RoomGeometry.fromModel(room);
  }

  getRoomWallSurfaceWorldGeometry(roomId: string): RoomSurfaceWorldGeometry[] {
    const room = this.rooms.find((candidate) => candidate.roomId === roomId);

    if (!room) {
      return [];
    }

    const geometry = this.getRoomGeometry(room);
    const linksBySurfaceId = this.getSharedSurfaceLinksById();
    const wallHeight = this.getWallHeightMm(room);

    return geometry.edges.map((edge, edgeIndex) => {
      const surfaceType = edgeIndex < 4 ? (['north', 'east', 'south', 'west'][edgeIndex] as RoomSurfaceType) : 'wall';
      const surfaceId = `${room.roomId}-wall-${edgeIndex + 1}`;
      const sharedSurfaceLink = linksBySurfaceId.get(surfaceId) ?? null;
      const center = {
        x: (edge.from.x + edge.to.x) / 2,
        y: (edge.from.y + edge.to.y) / 2,
      };
      const angleDeg = (Math.atan2(edge.to.y - edge.from.y, edge.to.x - edge.from.x) * 180) / Math.PI;
      const widthMm = distance(edge.from, edge.to);
      const halfWidth = widthMm / 2;
      const halfHeight = wallHeight / 2;

      return {
        surfaceId,
        roomId: room.roomId,
        type: surfaceType,
        directionDeg: angleDeg,
        widthMm,
        heightMm: wallHeight,
        rotationDeg: angleDeg,
        center,
        surfaceType: sharedSurfaceLink ? 'internal' : 'external',
        isSharedSurface: Boolean(sharedSurfaceLink),
        sharedSurfaceLink,
        bounds: {
          minX: center.x - halfWidth,
          maxX: center.x + halfWidth,
          minY: center.y - halfHeight,
          maxY: center.y + halfHeight,
          width: widthMm,
          height: wallHeight,
        },
      };
    });
  }

  getRoomScreenGeometry(room: RoomModel): RoomScreenGeometry {
    return RoomRenderer.toScreenGeometry(this, this.getRoomGeometry(room));
  }

  getCanvasMode(): CanvasMode {
    return this.mode;
  }

  getSurfaceSceneRoomId(): string | null {
    return this.surfaceSceneRoomId;
  }

  getActiveSurfaceId(): string | null {
    return this.activeSurfaceId;
  }

  openRoomSurfaceScene(roomId: string): RoomSurfaceWorldGeometry[] | null {
    const room = this.rooms.find((candidate) => candidate.roomId === roomId);

    if (!room) {
      return null;
    }

    this.savedMainCameraState = this.camera.getState();
    this.mode = 'room-surface-scene';
    this.surfaceSceneRoomId = roomId;
    this.activeSurfaceId = null;
    this.savedRoomSurfaceSceneCameraState = null;
    this.transform.endDrag();
    this.resize.endResize();
    this.fitSurfaceSceneToViewport();

    return this.getRoomSurfaceSceneWorldGeometry();
  }

  closeRoomSurfaceScene() {
    const restoreState = this.savedMainCameraState;

    if (restoreState) {
      this.camera.setView(restoreState);
    }

    this.mode = 'main';
    this.surfaceSceneRoomId = null;
    this.activeSurfaceId = null;
    this.savedMainCameraState = null;
    this.savedRoomSurfaceSceneCameraState = null;
  }

  openActiveSurfaceScene(): RoomSurfaceWorldGeometry | null {
    if (this.mode !== 'room-surface-scene' || !this.activeSurfaceId) {
      return null;
    }

    const activeSurface = this.getRoomSurfaceSceneWorldGeometry().find((surface) => surface.surfaceId === this.activeSurfaceId) ?? null;

    if (!activeSurface) {
      return null;
    }

    this.savedRoomSurfaceSceneCameraState = this.camera.getState();
    this.mode = 'surface-scene';
    this.fitSurfaceSceneToViewport();

    return this.getActiveSurfaceSceneWorldGeometry()[0] ?? null;
  }

  closeActiveSurfaceScene() {
    if (this.mode !== 'surface-scene') {
      return;
    }

    const restoreState = this.savedRoomSurfaceSceneCameraState;

    this.mode = 'room-surface-scene';
    this.savedRoomSurfaceSceneCameraState = null;

    if (restoreState) {
      this.camera.setView(restoreState);
    } else {
      this.fitSurfaceSceneToViewport();
    }
  }

  setCameraView(next: { zoom: number; panX: number; panY: number }) {
    this.camera.setView(next);
  }

  private getRoomSurfaceByScreenPoint(point: ScreenPoint): RoomSurfaceWorldGeometry | null {
    const worldPoint = this.screenToWorld(point);
    const surfaces = this.getRoomSurfaceSceneWorldGeometry();

    return surfaces.find(
      (surface) =>
        worldPoint.x >= surface.bounds.minX &&
        worldPoint.x <= surface.bounds.maxX &&
        worldPoint.y >= surface.bounds.minY &&
        worldPoint.y <= surface.bounds.maxY,
    ) ?? null;
  }

  private isSelectableSurfaceType(type: RoomSurfaceType): boolean {
    return SELECTABLE_SURFACE_TYPES.includes(type);
  }

  selectSurfaceAtScreenPoint(point: ScreenPoint): string | null {
    if (this.mode !== 'room-surface-scene') {
      return null;
    }

    const hitSurface = this.getRoomSurfaceByScreenPoint(point);

    if (!hitSurface || !this.isSelectableSurfaceType(hitSurface.type)) {
      return this.activeSurfaceId;
    }

    this.activeSurfaceId = hitSurface.surfaceId;
    return this.activeSurfaceId;
  }

  private fitSurfaceSceneToViewport() {
    const surfaceGeometry = this.mode === 'surface-scene' ? this.getActiveSurfaceSceneWorldGeometry() : this.getRoomSurfaceSceneWorldGeometry();
    const viewport = this.canvasState.viewport;

    if (!surfaceGeometry.length || viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    const sceneBounds = surfaceGeometry.reduce(
      (acc, surface) => ({
        minX: Math.min(acc.minX, surface.bounds.minX),
        minY: Math.min(acc.minY, surface.bounds.minY),
        maxX: Math.max(acc.maxX, surface.bounds.maxX),
        maxY: Math.max(acc.maxY, surface.bounds.maxY),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );

    const boundsWidth = Math.max(1, sceneBounds.maxX - sceneBounds.minX);
    const boundsHeight = Math.max(1, sceneBounds.maxY - sceneBounds.minY);
    const availableWidth = Math.max(1, viewport.width - SURFACE_SCENE_VIEWPORT_PADDING_PX * 2);
    const availableHeight = Math.max(1, viewport.height - SURFACE_SCENE_VIEWPORT_PADDING_PX * 2);
    const fillRatio = this.mode === 'surface-scene' ? SINGLE_SURFACE_VIEWPORT_FILL_RATIO : 1;
    const fitZoom = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight) * fillRatio;
    const sceneCenterX = (sceneBounds.minX + sceneBounds.maxX) / 2;
    const sceneCenterY = (sceneBounds.minY + sceneBounds.maxY) / 2;

    this.camera.setView({
      zoom: fitZoom,
      panX: sceneCenterX,
      panY: sceneCenterY,
    });
  }

  private getWallHeightMm(room: RoomModel): number {
    return Math.max(400, room.wallHeightMm ?? DEFAULT_WALL_HEIGHT_MM);
  }

  private getSurfaceSceneBaseWorldGeometry(): RoomSurfaceWorldGeometry[] {
    if (!this.surfaceSceneRoomId) {
      return [];
    }

    const room = this.rooms.find((candidate) => candidate.roomId === this.surfaceSceneRoomId);

    if (!room) {
      return [];
    }

    const roomHeightMm = this.getWallHeightMm(room);
    const roomGeometry = this.getRoomGeometry(room);
    const floor = { widthMm: roomGeometry.bounds.width, heightMm: roomGeometry.bounds.height };
    const ceiling = { ...floor };
    const floorExtent = getRotatedHalfExtent(floor.widthMm, floor.heightMm, 0);
    const floorCenterX = 0;
    const floorCenterY = 0;
    const wallBaseSurfaces = this.getRoomWallSurfaceWorldGeometry(room.roomId);
    const wallSurfaces = wallBaseSurfaces.map((wallSurface, index) => {
      const wallExtent = getRotatedHalfExtent(wallSurface.widthMm, roomHeightMm, 0);

      return {
        type: wallSurface.type,
        surfaceId: wallSurface.surfaceId,
        directionDeg: wallSurface.directionDeg,
        widthMm: wallSurface.widthMm,
        heightMm: roomHeightMm,
        rotationDeg: 0,
        centerX: floorCenterX,
        centerY: floorCenterY - (floorExtent.halfHeight + SURFACE_SCENE_GAP_MM + wallExtent.halfHeight) - index * (roomHeightMm + SURFACE_SCENE_GAP_MM),
      };
    });
    const ceilingExtent = getRotatedHalfExtent(ceiling.widthMm, ceiling.heightMm, 0);
    const topWallCenterY = wallSurfaces.length > 0 ? wallSurfaces[wallSurfaces.length - 1].centerY : floorCenterY - (floorExtent.halfHeight + SURFACE_SCENE_GAP_MM);
    const ceilingCenterY = topWallCenterY - (roomHeightMm / 2 + SURFACE_SCENE_GAP_MM + ceilingExtent.halfHeight);
    const surfaces: Array<{ type: RoomSurfaceType; surfaceId: string; directionDeg: number; widthMm: number; heightMm: number; rotationDeg: number; centerX: number; centerY: number }> = [
      { type: 'floor', surfaceId: `${room.roomId}-floor`, directionDeg: 0, widthMm: floor.widthMm, heightMm: floor.heightMm, rotationDeg: 0, centerX: floorCenterX, centerY: floorCenterY },
      ...wallSurfaces,
      { type: 'ceiling', surfaceId: `${room.roomId}-ceiling`, directionDeg: 0, widthMm: ceiling.widthMm, heightMm: ceiling.heightMm, rotationDeg: 0, centerX: floorCenterX, centerY: ceilingCenterY },
    ];
    const linksBySurfaceId = this.getSharedSurfaceLinksById();

    return surfaces.map((surface) => {
      const halfWidth = surface.widthMm / 2;
      const halfHeight = surface.heightMm / 2;
      const bounds = {
        minX: surface.centerX - halfWidth,
        maxX: surface.centerX + halfWidth,
        minY: surface.centerY - halfHeight,
        maxY: surface.centerY + halfHeight,
      };
      const sharedSurfaceLink = linksBySurfaceId.get(surface.surfaceId) ?? null;
      const isWallSurface = WALL_SURFACE_TYPES.includes(surface.type);

      return {
        surfaceId: surface.surfaceId,
        roomId: room.roomId,
        type: surface.type,
        directionDeg: surface.directionDeg,
        widthMm: surface.widthMm,
        heightMm: surface.heightMm,
        rotationDeg: surface.rotationDeg,
        center: { x: surface.centerX, y: surface.centerY },
        surfaceType: isWallSurface && sharedSurfaceLink ? 'internal' : 'external',
        isSharedSurface: Boolean(isWallSurface && sharedSurfaceLink),
        sharedSurfaceLink: isWallSurface ? sharedSurfaceLink : null,
        bounds: {
          ...bounds,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
        },
      };
    });
  }

  private getActiveSurfaceSceneWorldGeometry(): RoomSurfaceWorldGeometry[] {
    if (this.mode !== 'surface-scene' || !this.activeSurfaceId) {
      return [];
    }

    const surface = this.getSurfaceSceneBaseWorldGeometry().find((candidate) => candidate.surfaceId === this.activeSurfaceId);

    if (!surface) {
      return [];
    }

    const halfWidth = surface.widthMm / 2;
    const halfHeight = surface.heightMm / 2;

    return [
      {
        ...surface,
        center: { x: 0, y: 0 },
        bounds: {
          minX: -halfWidth,
          maxX: halfWidth,
          minY: -halfHeight,
          maxY: halfHeight,
          width: surface.widthMm,
          height: surface.heightMm,
        },
      },
    ];
  }

  getRoomSurfaceSceneWorldGeometry(): RoomSurfaceWorldGeometry[] {
    if (this.mode !== 'room-surface-scene' && this.mode !== 'surface-scene') {
      return [];
    }
    return this.getSurfaceSceneBaseWorldGeometry();
  }

  getRoomSurfaceSceneScreenGeometry(): RoomSurfaceScreenGeometry[] {
    const surfaceWorldGeometry = this.mode === 'surface-scene' ? this.getActiveSurfaceSceneWorldGeometry() : this.getRoomSurfaceSceneWorldGeometry();

    return surfaceWorldGeometry.map((surface) => {
      const topLeft = this.worldToScreen({ x: surface.bounds.minX, y: surface.bounds.minY });
      const bottomRight = this.worldToScreen({ x: surface.bounds.maxX, y: surface.bounds.maxY });
      const width = Math.abs(bottomRight.x - topLeft.x);
      const height = Math.abs(bottomRight.y - topLeft.y);

      return {
        surfaceId: surface.surfaceId,
        roomId: surface.roomId,
        type: surface.type,
        widthPx: width,
        heightPx: height,
        rotationDeg: surface.rotationDeg,
        center: this.worldToScreen(surface.center),
        bounds: {
          left: Math.min(topLeft.x, bottomRight.x),
          right: Math.max(topLeft.x, bottomRight.x),
          top: Math.min(topLeft.y, bottomRight.y),
          bottom: Math.max(topLeft.y, bottomRight.y),
          width,
          height,
        },
      };
    });
  }

  getActiveRoomDimensionLabels(): DimensionLineScreenGeometry[] {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return [];
    }

    const activeRoom = this.getActiveRoom();

    if (!activeRoom || activeRoom.settings?.isDimensionsHidden) {
      return [];
    }

    const roomGeometry = this.getRoomGeometry(activeRoom);
    const labels: DimensionLineWorldGeometry[] = DimensionLabelSystem.getLabelsForRoom(activeRoom, roomGeometry);

    return RoomRenderer.getDimensionLabels(this, labels);
  }

  getActiveRoomResizeHandles(): RoomResizeHandleScreenGeometry[] {
    if (this.mode === 'room-surface-scene' || this.mode === 'surface-scene') {
      return [];
    }

    const activeRoom = this.getActiveRoom();

    if (!activeRoom) {
      return [];
    }
    if (this.isPolygonRoom(activeRoom)) {
      return [];
    }

    return RoomRenderer.getResizeHandles(this, this.getRoomGeometry(activeRoom), this.resize.getActiveHandleId());
  }

  getResizeHandleAtScreenPoint(point: ScreenPoint, hitRadiusPx = 14): RoomResizeHandleId | null {
    const handles = this.getActiveRoomResizeHandles();

    for (const handle of handles) {
      const distance = Math.hypot(point.x - handle.point.x, point.y - handle.point.y);

      if (distance <= hitRadiusPx) {
        return handle.handleId;
      }
    }

    return null;
  }

  getSnapshot(): CanvasSnapshot {
    const activeSurfaceGeometry = this.mode === 'surface-scene' ? this.getActiveSurfaceSceneWorldGeometry()[0] ?? null : null;
    const surfaceGridState = activeSurfaceGeometry
      ? this.grid.getGridState(this.camera, this.canvasState.viewport, {
          localBounds: activeSurfaceGeometry.bounds,
          localStepMm: DEFAULT_GRID_STEP_MM,
        })
      : this.grid.getGridState(this.camera, this.canvasState.viewport);

    return {
      projectId: this.projectId,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      camera: this.camera.getState(),
      grid: surfaceGridState,
      canvasState: this.canvasState,
      activeRoomId: this.getActiveRoomId(),
      roomIds: this.rooms.map((room) => room.roomId),
      roomsCount: this.rooms.length,
      mode: this.mode,
      surfaceSceneRoomId: this.surfaceSceneRoomId,
      activeSurfaceId: this.activeSurfaceId,
      isSurfaceSceneMode: this.mode === 'surface-scene',
      isDrawingMode: this.isDrawingMode,
      currentToolMode: this.currentToolMode,
      wallDrawingMode: this.isDrawingMode && this.currentToolMode === 'wall',
      currentContourPointsCount: this.currentContourPoints.length,
      isContourClosed: this.isContourClosed,
      lastCreatedShapeId: this.lastCreatedShapeId,
    };
  }
}
