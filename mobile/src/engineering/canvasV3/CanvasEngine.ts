import { CameraSystem } from './CameraSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { GridSystem } from './GridSystem';
import {
  CanvasMode,
  CanvasDebugState,
  CanvasSnapshot,
  CanvasState,
  CameraState,
  DimensionLineScreenGeometry,
  DimensionLineWorldGeometry,
  DimensionUnit,
  RoomModel,
  RoomSettings,
  RoomResizeHandleId,
  RoomResizeHandleScreenGeometry,
  RoomOpenEntryPoint,
  RoomSurfaceScreenGeometry,
  RoomSurfaceType,
  RoomSurfaceWorldGeometry,
  RoomScreenGeometry,
  RoomWorldGeometry,
  ScreenPoint,
  Viewport,
  WorldPoint,
} from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';
import { RoomRenderer } from './RoomRenderer';
import { DimensionLabelSystem } from './DimensionLabelSystem';
import { RoomSelectionSystem } from './RoomSelectionSystem';
import { RoomTransformSystem } from './RoomTransformSystem';
import { RoomResizeSystem } from './RoomResizeSystem';
import { RoomRotateSystem } from './RoomRotateSystem';

const cloneRoom = (room: RoomModel): RoomModel => ({ ...room });
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
const SURFACE_SCENE_GAP_MM = 280;
const SURFACE_SCENE_VIEWPORT_PADDING_PX = 32;
const WALL_SURFACE_TYPES: RoomSurfaceType[] = ['north', 'south', 'west', 'east'];
const SELECTABLE_SURFACE_TYPES: RoomSurfaceType[] = [...WALL_SURFACE_TYPES, 'floor'];

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
  private lastPointerWorldPoint: WorldPoint | null = null;
  private mode: CanvasMode = 'main';
  private surfaceSceneRoomId: string | null = null;
  private activeSurfaceId: string | null = null;
  private savedMainCameraState: CameraState | null = null;

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
    this.transform = new RoomTransformSystem();
    this.resize = new RoomResizeSystem();
    this.rotate = new RoomRotateSystem();
    this.canvasState = {
      isReady: false,
      viewport: { width: 0, height: 0 },
    };
  }

  setViewport(viewport: Viewport) {
    this.canvasState = {
      ...this.canvasState,
      isReady: viewport.width > 0 && viewport.height > 0,
      viewport,
    };

    if (this.mode === 'room-surface-scene') {
      this.fitSurfaceSceneToViewport();
    }
  }

  setRooms(rooms: RoomModel[]) {
    this.rooms = rooms.map((room) => {
      const normalizedRoom = normalizeRoomModel(room);
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
  }

  getRooms(): RoomModel[] {
    return this.rooms.map((room) => normalizeRoomModel(room));
  }

  getActiveRoomId(): string | null {
    if (this.mode === 'room-surface-scene') {
      return this.surfaceSceneRoomId;
    }

    return this.selection.getActiveRoomId();
  }

  getActiveRoom(): RoomModel | null {
    const activeRoom = this.selection.getActiveRoom();

    return activeRoom ? normalizeRoomModel(activeRoom) : null;
  }

  updateRoomDimensions(roomId: string, widthMm: number, heightMm: number): RoomModel | null {
    const room = this.rooms.find((candidate) => candidate.roomId === roomId);

    if (!room) {
      return null;
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

    return {
      roomId: room.roomId,
      roomName: this.resolveRoomName(room),
      widthMm: room.widthMm,
      heightMm: room.heightMm,
      rotationDeg: room.rotationDeg,
    };
  }

  selectRoom(roomId: string): string | null {
    if (this.mode === 'room-surface-scene') {
      return this.surfaceSceneRoomId;
    }

    const activeRoomId = this.selection.selectRoom(roomId);
    this.transform.setActiveRoomId(activeRoomId);
    this.resize.setActiveRoomId(activeRoomId);
    this.rotate.setActiveRoomId(activeRoomId);
    return activeRoomId;
  }

  clearActiveRoom(): string | null {
    if (this.mode === 'room-surface-scene') {
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
    this.lastPointerWorldPoint = worldPoint;
    return worldPoint;
  }

  getRoomIdAtScreenPoint(point: ScreenPoint): string | null {
    if (this.mode === 'room-surface-scene') {
      return this.surfaceSceneRoomId;
    }

    return this.selection.getRoomIdAt(this.updateLastPointer(point));
  }

  handleTap(point: ScreenPoint): string | null {
    if (this.mode === 'room-surface-scene') {
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
    if (this.mode === 'room-surface-scene') {
      return false;
    }

    this.resize.endResize();
    return this.transform.startDrag();
  }

  startResize(handleId: RoomResizeHandleId): boolean {
    if (this.mode === 'room-surface-scene') {
      return false;
    }

    this.transform.endDrag();
    return this.resize.startResize(handleId);
  }

  dragBy(screenDelta: ScreenPoint): RoomModel | null {
    if (this.mode === 'room-surface-scene') {
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
    if (this.mode === 'room-surface-scene') {
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
    if (this.mode === 'room-surface-scene') {
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

  getDebugState(): CanvasDebugState {
    const camera = this.camera.getState();
    const screenCenter = this.getScreenCenter();
    const displayZoom = getDisplayZoom(camera.zoom, camera.minZoom, BASE_ZOOM, camera.maxZoom);

    const gridMetrics = this.grid.getGridMetrics();

    return {
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
      isDraggingRoom: this.transform.isDragActive(),
      isResizingRoom: this.resize.isResizeActive(),
      activeResizeHandleId: this.resize.getActiveHandleId(),
      activeRoomRotationDeg: this.getActiveRoom()?.rotationDeg ?? null,
      roomIds: this.rooms.map((room) => room.roomId),
      gridStepMm: gridMetrics.gridStepMm,
      gridLevel: gridMetrics.gridLevel,
      cellsPerMeter: gridMetrics.cellsPerMeter,
      lastPointerWorldX: this.lastPointerWorldPoint?.x ?? null,
      lastPointerWorldY: this.lastPointerWorldPoint?.y ?? null,
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
    const surfaceGeometry = this.getRoomSurfaceSceneWorldGeometry();
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
    const fitZoom = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight);
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

  getRoomSurfaceSceneWorldGeometry(): RoomSurfaceWorldGeometry[] {
    if (this.mode !== 'room-surface-scene' || !this.surfaceSceneRoomId) {
      return [];
    }

    const room = this.rooms.find((candidate) => candidate.roomId === this.surfaceSceneRoomId);

    if (!room) {
      return [];
    }

    const roomWidthMm = room.widthMm;
    const roomLengthMm = room.heightMm;
    const roomHeightMm = this.getWallHeightMm(room);

    const floor = { widthMm: roomWidthMm, heightMm: roomLengthMm };
    const ceiling = { widthMm: roomWidthMm, heightMm: roomLengthMm };
    const north = { widthMm: roomWidthMm, heightMm: roomHeightMm };
    const south = { widthMm: roomWidthMm, heightMm: roomHeightMm };
    const west = { widthMm: roomLengthMm, heightMm: roomHeightMm };
    const east = { widthMm: roomLengthMm, heightMm: roomHeightMm };
    const floorRotationDeg = 0;
    const northRotationDeg = 0;
    const southRotationDeg = 0;
    const westRotationDeg = 90;
    const eastRotationDeg = 90;
    const ceilingRotationDeg = 0;

    const floorExtent = getRotatedHalfExtent(floor.widthMm, floor.heightMm, floorRotationDeg);
    const northExtent = getRotatedHalfExtent(north.widthMm, north.heightMm, northRotationDeg);
    const southExtent = getRotatedHalfExtent(south.widthMm, south.heightMm, southRotationDeg);
    const westExtent = getRotatedHalfExtent(west.widthMm, west.heightMm, westRotationDeg);
    const eastExtent = getRotatedHalfExtent(east.widthMm, east.heightMm, eastRotationDeg);
    const ceilingExtent = getRotatedHalfExtent(ceiling.widthMm, ceiling.heightMm, ceilingRotationDeg);

    const floorCenterX = 0;
    const floorCenterY = 0;

    const northCenterX = floorCenterX;
    const northCenterY = floorCenterY - (floorExtent.halfHeight + SURFACE_SCENE_GAP_MM + northExtent.halfHeight);

    const southCenterX = floorCenterX;
    const southCenterY = floorCenterY + (floorExtent.halfHeight + SURFACE_SCENE_GAP_MM + southExtent.halfHeight);

    const westCenterX = floorCenterX - (floorExtent.halfWidth + SURFACE_SCENE_GAP_MM + westExtent.halfWidth);
    const westCenterY = floorCenterY;

    const eastCenterX = floorCenterX + (floorExtent.halfWidth + SURFACE_SCENE_GAP_MM + eastExtent.halfWidth);
    const eastCenterY = floorCenterY;

    const ceilingCenterX = northCenterX;
    const ceilingCenterY = northCenterY - (northExtent.halfHeight + SURFACE_SCENE_GAP_MM + ceilingExtent.halfHeight);

    const surfaces: Array<{ type: RoomSurfaceType; widthMm: number; heightMm: number; rotationDeg: number; centerX: number; centerY: number }> = [
      { type: 'floor', widthMm: floor.widthMm, heightMm: floor.heightMm, rotationDeg: floorRotationDeg, centerX: floorCenterX, centerY: floorCenterY },
      { type: 'north', widthMm: north.widthMm, heightMm: north.heightMm, rotationDeg: northRotationDeg, centerX: northCenterX, centerY: northCenterY },
      { type: 'south', widthMm: south.widthMm, heightMm: south.heightMm, rotationDeg: southRotationDeg, centerX: southCenterX, centerY: southCenterY },
      { type: 'west', widthMm: west.widthMm, heightMm: west.heightMm, rotationDeg: westRotationDeg, centerX: westCenterX, centerY: westCenterY },
      { type: 'east', widthMm: east.widthMm, heightMm: east.heightMm, rotationDeg: eastRotationDeg, centerX: eastCenterX, centerY: eastCenterY },
      { type: 'ceiling', widthMm: ceiling.widthMm, heightMm: ceiling.heightMm, rotationDeg: ceilingRotationDeg, centerX: ceilingCenterX, centerY: ceilingCenterY },
    ];

    return surfaces.map((surface) => {
      const halfWidth = surface.widthMm / 2;
      const halfHeight = surface.heightMm / 2;
      const bounds = {
        minX: surface.centerX - halfWidth,
        maxX: surface.centerX + halfWidth,
        minY: surface.centerY - halfHeight,
        maxY: surface.centerY + halfHeight,
      };

      return {
        surfaceId: `${room.roomId}-${surface.type}`,
        roomId: room.roomId,
        type: surface.type,
        widthMm: surface.widthMm,
        heightMm: surface.heightMm,
        rotationDeg: surface.rotationDeg,
        center: { x: surface.centerX, y: surface.centerY },
        bounds: {
          ...bounds,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
        },
      };
    });
  }

  getRoomSurfaceSceneScreenGeometry(): RoomSurfaceScreenGeometry[] {
    return this.getRoomSurfaceSceneWorldGeometry().map((surface) => {
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
    if (this.mode === 'room-surface-scene') {
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
    if (this.mode === 'room-surface-scene') {
      return [];
    }

    const activeRoom = this.getActiveRoom();

    if (!activeRoom) {
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
    return {
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      camera: this.camera.getState(),
      grid: this.grid.getGridState(this.camera, this.canvasState.viewport),
      canvasState: this.canvasState,
      activeRoomId: this.getActiveRoomId(),
      roomIds: this.rooms.map((room) => room.roomId),
      mode: this.mode,
      surfaceSceneRoomId: this.surfaceSceneRoomId,
      activeSurfaceId: this.activeSurfaceId,
    };
  }
}
