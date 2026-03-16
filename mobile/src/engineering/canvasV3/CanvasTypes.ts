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
};

export type CanvasDebugState = {
  zoom: number;
  panX: number;
  panY: number;
  minZoom: number;
  maxZoom: number;
  viewport: Viewport;
  worldCenter: WorldPoint;
  screenCenter: ScreenPoint;
  worldAtScreenCenter: WorldPoint;
};
