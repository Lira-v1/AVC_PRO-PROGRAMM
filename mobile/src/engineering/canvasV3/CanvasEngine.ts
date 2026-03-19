import { CameraSystem } from './CameraSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { GridSystem } from './GridSystem';
import {
  CanvasDebugState,
  CanvasSnapshot,
  CanvasState,
  RoomModel,
  RoomScreenGeometry,
  RoomWorldGeometry,
  ScreenPoint,
  Viewport,
  WorldPoint,
} from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';
import { RoomRenderer } from './RoomRenderer';
import { RoomSelectionSystem } from './RoomSelectionSystem';
import { RoomTransformSystem } from './RoomTransformSystem';

const cloneRoom = (room: RoomModel): RoomModel => ({ ...room });

export class CanvasEngine {
  worldWidth: number;
  worldHeight: number;
  camera: CameraSystem;
  grid: GridSystem;
  canvasState: CanvasState;
  selection: RoomSelectionSystem;
  transform: RoomTransformSystem;
  private rooms: RoomModel[] = [];
  private lastPointerWorldPoint: WorldPoint | null = null;

  constructor(worldWidth = 500, worldHeight = 500) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.camera = new CameraSystem({ zoom: 0.2, panX: 0, panY: 0, minZoom: 0.03, maxZoom: 6 });
    this.grid = new GridSystem(1);
    this.selection = new RoomSelectionSystem();
    this.transform = new RoomTransformSystem();
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
    this.rooms = rooms.map(cloneRoom);
    this.selection.setRooms(this.rooms);
    this.transform.setRooms(this.rooms);
    this.transform.setActiveRoomId(this.selection.getActiveRoomId());
  }

  getRooms(): RoomModel[] {
    return this.rooms.map(cloneRoom);
  }

  getActiveRoomId(): string | null {
    return this.selection.getActiveRoomId();
  }

  getActiveRoom(): RoomModel | null {
    return this.selection.getActiveRoom();
  }

  selectRoom(roomId: string): string | null {
    const activeRoomId = this.selection.selectRoom(roomId);
    this.transform.setActiveRoomId(activeRoomId);
    return activeRoomId;
  }

  clearActiveRoom(): string | null {
    const activeRoomId = this.selection.clearSelection();
    this.transform.setActiveRoomId(activeRoomId);
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
    return activeRoomId;
  }

  startDrag(): boolean {
    return this.transform.startDrag();
  }

  dragBy(screenDelta: ScreenPoint): RoomModel | null {
    const worldDelta = CoordinateSystem.screenDeltaToWorldDelta(this.camera, screenDelta);
    const room = this.transform.dragByWorldDelta(worldDelta);

    return room ? { ...room } : null;
  }

  endDrag() {
    this.transform.endDrag();
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

    return {
      zoom: camera.zoom,
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
      roomIds: this.rooms.map((room) => room.roomId),
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
    return this.grid.snap(point, this.camera.getState().zoom);
  }

  getRoomGeometry(room: RoomModel): RoomWorldGeometry {
    return RoomGeometry.fromModel(room);
  }

  getRoomScreenGeometry(room: RoomModel): RoomScreenGeometry {
    return RoomRenderer.toScreenGeometry(this, this.getRoomGeometry(room));
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
