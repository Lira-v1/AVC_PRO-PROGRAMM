import { CameraSystem } from './CameraSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { GridSystem } from './GridSystem';
import {
  CanvasDebugState,
  CanvasSnapshot,
  CanvasState,
  DimensionLineScreenGeometry,
  DimensionLineWorldGeometry,
  DimensionUnit,
  RoomModel,
  RoomSettings,
  RoomResizeHandleId,
  RoomResizeHandleScreenGeometry,
  RoomOpenEntryPoint,
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

const getDisplayZoom = (cameraZoom: number, _minZoom: number, baseZoom: number, _maxZoom: number) => {
  if (Math.abs(cameraZoom - baseZoom) <= ZOOM_EPSILON) {
    return 0;
  }

  return Math.log(cameraZoom / baseZoom) / Math.log(2) * DISPLAY_ZOOM_STEP;
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
  private lastPointerWorldPoint: WorldPoint | null = null;

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
  }

  setRooms(rooms: RoomModel[]) {
    this.rooms = rooms.map((room) => {
      const normalizedRoom = withDefaultSettings(cloneRoom(room));
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
    return this.rooms.map((room) => withDefaultSettings(cloneRoom(room)));
  }

  getActiveRoomId(): string | null {
    return this.selection.getActiveRoomId();
  }

  getActiveRoom(): RoomModel | null {
    const activeRoom = this.selection.getActiveRoom();

    return activeRoom ? withDefaultSettings(activeRoom) : null;
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

    return withDefaultSettings({ ...room });
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

    return withDefaultSettings({ ...room });
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
    const activeRoomId = this.selection.selectRoom(roomId);
    this.transform.setActiveRoomId(activeRoomId);
    this.resize.setActiveRoomId(activeRoomId);
    this.rotate.setActiveRoomId(activeRoomId);
    return activeRoomId;
  }

  clearActiveRoom(): string | null {
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
    return this.selection.getRoomIdAt(this.updateLastPointer(point));
  }

  handleTap(point: ScreenPoint): string | null {
    const worldPoint = this.updateLastPointer(point);
    const activeRoomId = this.selection.selectRoomAt(worldPoint);
    this.transform.setActiveRoomId(activeRoomId);
    this.resize.setActiveRoomId(activeRoomId);
    this.rotate.setActiveRoomId(activeRoomId);
    return activeRoomId;
  }

  startDrag(): boolean {
    this.resize.endResize();
    return this.transform.startDrag();
  }

  startResize(handleId: RoomResizeHandleId): boolean {
    this.transform.endDrag();
    return this.resize.startResize(handleId);
  }

  dragBy(screenDelta: ScreenPoint): RoomModel | null {
    const worldDelta = CoordinateSystem.screenDeltaToWorldDelta(this.camera, screenDelta);
    const room = this.transform.dragByWorldDelta(worldDelta);

    return room ? { ...room } : null;
  }

  endDrag() {
    this.transform.endDrag();
  }

  resizeBy(screenDelta: ScreenPoint): RoomModel | null {
    const worldDelta = CoordinateSystem.screenDeltaToWorldDelta(this.camera, screenDelta);
    const room = this.resize.resizeByWorldDelta(worldDelta);

    return room ? { ...room } : null;
  }

  endResize() {
    this.resize.endResize();
  }

  rotateActiveRoom(stepDeg = 90): RoomModel | null {
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

  getActiveRoomDimensionLabels(): DimensionLineScreenGeometry[] {
    const activeRoom = this.getActiveRoom();

    if (!activeRoom || activeRoom.settings?.isDimensionsHidden) {
      return [];
    }

    const roomGeometry = this.getRoomGeometry(activeRoom);
    const labels: DimensionLineWorldGeometry[] = DimensionLabelSystem.getLabelsForRoom(activeRoom, roomGeometry);

    return RoomRenderer.getDimensionLabels(this, labels);
  }

  getActiveRoomResizeHandles(): RoomResizeHandleScreenGeometry[] {
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
    };
  }
}
