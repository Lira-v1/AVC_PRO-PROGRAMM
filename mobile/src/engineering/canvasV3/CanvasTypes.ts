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
  centerX: number;
  centerY: number;
  widthMm: number;
  heightMm: number;
  wallHeightMm?: number;
  rotationDeg: number;
  settings?: RoomSettings;
};

export type CanvasMode = 'main' | 'room-surface-scene';
export type RoomSurfaceType = 'north' | 'south' | 'west' | 'east' | 'floor' | 'ceiling';

export type RoomSurfaceWorldGeometry = {
  surfaceId: string;
  roomId: string;
  type: RoomSurfaceType;
  widthMm: number;
  heightMm: number;
  center: WorldPoint;
  bounds: WorldBounds;
};

export type RoomSurfaceScreenGeometry = {
  surfaceId: string;
  roomId: string;
  type: RoomSurfaceType;
  widthPx: number;
  heightPx: number;
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
  corners: [WorldPoint, WorldPoint, WorldPoint, WorldPoint];
  edges: [WorldEdge, WorldEdge, WorldEdge, WorldEdge];
  bounds: WorldBounds;
};

export type RoomScreenGeometry = {
  roomId: string;
  isActive: boolean;
  rotationDeg: number;
  center: ScreenPoint;
  corners: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  edges: [ScreenEdge, ScreenEdge, ScreenEdge, ScreenEdge];
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
  worldWidth: number;
  worldHeight: number;
  camera: CameraState;
  grid: GridState;
  canvasState: CanvasState;
  activeRoomId: string | null;
  roomIds: string[];
  mode: CanvasMode;
  surfaceSceneRoomId: string | null;
};

export type RoomOpenEntryPoint = {
  roomId: string;
  roomName: string;
  widthMm: number;
  heightMm: number;
  rotationDeg: number;
};

export type CanvasDebugState = {
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
  isDraggingRoom: boolean;
  isResizingRoom: boolean;
  activeResizeHandleId: RoomResizeHandleId | null;
  activeRoomRotationDeg: number | null;
  roomIds: string[];
  gridStepMm: number;
  gridLevel: string;
  cellsPerMeter: number;
  lastPointerWorldX: number | null;
  lastPointerWorldY: number | null;
};
