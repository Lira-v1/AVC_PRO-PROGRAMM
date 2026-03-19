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

export type RoomModel = {
  roomId: string;
  centerX: number;
  centerY: number;
  widthMm: number;
  heightMm: number;
  rotationDeg: number;
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
  lastPointerWorldX: number | null;
  lastPointerWorldY: number | null;
};
