export type WorldPoint = {
  x: number;
  y: number;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export type Viewport = {
  width: number;
  height: number;
};

export type WorldBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export type WorldEdge = {
  id: string;
  from: WorldPoint;
  to: WorldPoint;
};

export type ContourShapeWorldGeometry = {
  shapeId: string;
  points: WorldPoint[];
  isClosed: boolean;
  createdRoomId: string | null;
};

export type ContourShapeScreenGeometry = {
  shapeId: string;
  points: ScreenPoint[];
  isClosed: boolean;
  createdRoomId: string | null;
};

export type ScreenEdge = {
  id: string;
  from: ScreenPoint;
  to: ScreenPoint;
  length: number;
  angleDeg: number;
  center: ScreenPoint;
};

export type RoomResizeHandleId = 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
export type DimensionUnit = 'mm' | 'cm' | 'm';

export type RoomSettings = {
  name: string;
  dimensionUnit: DimensionUnit;
  isSizeLocked: boolean;
  isDimensionsHidden: boolean;
};

export type RoomModel = {
  roomId: string;
  roomName?: string;
  roomLabelVisible?: boolean;
  centerX: number;
  centerY: number;
  /**
   * Polygon vertices stored in local room coordinates (relative to room center).
   * If omitted, room geometry falls back to rectangular width/height model.
   */
  verticesMm?: WorldPoint[];
  widthMm: number;
  heightMm: number;
  wallHeightMm?: number;
  rotationDeg: number;
  settings?: RoomSettings;
};

export type CanvasMode = 'main' | 'room-surface-scene' | 'surface-scene';
export type RoomSurfaceType = 'north' | 'south' | 'west' | 'east' | 'wall' | 'floor' | 'ceiling';
export type SharedSurfaceMode = 'full' | 'partial';
export type SurfaceWallType = 'internal' | 'external';

export type SharedSurfaceLink = {
  linkedSurfaceId: string;
  linkedRoomId: string;
  sharedMode: SharedSurfaceMode;
  sharedSegmentStart: WorldPoint;
  sharedSegmentEnd: WorldPoint;
  sharedLength: number;
};

export type RoomSurfaceWorldGeometry = {
  surfaceId: string;
  roomId: string;
  type: RoomSurfaceType;
  directionDeg: number;
  widthMm: number;
  heightMm: number;
  rotationDeg: number;
  center: WorldPoint;
  bounds: WorldBounds;
  surfaceType: SurfaceWallType;
  isSharedSurface: boolean;
  sharedSurfaceLink: SharedSurfaceLink | null;
};

export type RoomSurfaceScreenGeometry = {
  surfaceId: string;
  roomId: string;
  type: RoomSurfaceType;
  widthPx: number;
  heightPx: number;
  rotationDeg: number;
  center: ScreenPoint;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
};

export type RoomWorldGeometry = {
  roomId: string;
  center: WorldPoint;
  corners: WorldPoint[];
  edges: WorldEdge[];
  bounds: WorldBounds;
};

export type RoomScreenGeometry = {
  roomId: string;
  isActive: boolean;
  rotationDeg: number;
  center: ScreenPoint;
  corners: ScreenPoint[];
  edges: ScreenEdge[];
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
};

export type RoomResizeHandleScreenGeometry = {
  roomId: string;
  handleId: RoomResizeHandleId;
  point: ScreenPoint;
  isActive: boolean;
};

export type DimensionLabelKind = 'length' | 'width';
export type DimensionAxis = 'horizontal' | 'vertical';

export type DimensionLineWorldGeometry = {
  id: string;
  roomId: string;
  kind: DimensionLabelKind;
  axis: DimensionAxis;
  valueMm: number;
  formattedValue: string;
  lineFrom: WorldPoint;
  lineTo: WorldPoint;
  textAnchor: WorldPoint;
  ticks: [
    { from: WorldPoint; to: WorldPoint },
    { from: WorldPoint; to: WorldPoint },
  ];
};

export type DimensionLineScreenGeometry = {
  id: string;
  roomId: string;
  kind: DimensionLabelKind;
  axis: DimensionAxis;
  formattedValue: string;
  lineFrom: ScreenPoint;
  lineTo: ScreenPoint;
  textAnchor: ScreenPoint;
  ticks: [
    { from: ScreenPoint; to: ScreenPoint },
    { from: ScreenPoint; to: ScreenPoint },
  ];
};

export type CameraState = {
  zoom: number;
  panX: number;
  panY: number;
  minZoom: number;
  maxZoom: number;
};

export type GridLine = {
  id: string;
  from: ScreenPoint;
  to: ScreenPoint;
  axis: 'x' | 'y';
};

export type GridState = {
  baseStep: number;
  snapStep: number;
  gridStepMm: number;
  gridLevel: string;
  cellsPerMeter: number;
  lines: GridLine[];
};

export type CanvasState = {
  isReady: boolean;
  viewport: Viewport;
};

export type CanvasSnapshot = {
  projectId: string;
  worldWidth: number;
  worldHeight: number;
  camera: CameraState;
  grid: GridState;
  canvasState: CanvasState;
  activeRoomId: string | null;
  roomIds: string[];
  roomsCount: number;
  mode: CanvasMode;
  surfaceSceneRoomId: string | null;
  activeSurfaceId: string | null;
  isSurfaceSceneMode: boolean;
  isDrawingMode: boolean;
  currentContourPointsCount: number;
  isContourClosed: boolean;
  lastCreatedShapeId: string | null;
};

export type RoomOpenEntryPoint = {
  roomId: string;
  roomName: string;
  widthMm: number;
  heightMm: number;
  rotationDeg: number;
};

export type CanvasDebugState = {
  projectId: string;
  cameraZoom: number;
  displayZoom: number;
  zoomPercent: number;
  panX: number;
  panY: number;
  minZoom: number;
  maxZoom: number;
  viewport: Viewport;
  worldCenter: WorldPoint;
  screenCenter: ScreenPoint;
  worldAtScreenCenter: WorldPoint;
  activeRoomId: string | null;
  snappedRoomId: string | null;
  snapTargetRoomId: string | null;
  snapPreview: {
    kind: 'side' | 'corner-room' | 'corner-grid';
    centerX: number;
    centerY: number;
    fromPoint: WorldPoint;
    toPoint: WorldPoint;
    targetRoomId: string | null;
  } | null;
  isDraggingRoom: boolean;
  isResizingRoom: boolean;
  activeResizeHandleId: RoomResizeHandleId | null;
  activeRoomRotationDeg: number | null;
  roomIds: string[];
  roomsCount: number;
  roomPositions: Array<{ roomId: string; centerX: number; centerY: number }>;
  isDrawingMode: boolean;
  isOrthogonalDrawingMode: boolean;
  currentSegmentAngle: number | null;
  currentContourPointsCount: number;
  isContourClosed: boolean;
  isContourConvertedToRoom: boolean;
  lastCreatedShapeId: string | null;
  roomVerticesCount: number | null;
  roomIsPolygon: boolean;
  roomEdgesCount: number | null;
  activeSurfaceSharedDebug: {
    isSharedSurface: boolean;
    linkedSurfaceId: string | null;
    linkedRoomId: string | null;
    sharedMode: SharedSurfaceMode | null;
    sharedLength: number | null;
    surfaceType: SurfaceWallType;
  } | null;
  gridStepMm: number;
  gridLevel: string;
  cellsPerMeter: number;
  lastPointerWorldX: number | null;
  lastPointerWorldY: number | null;
};
