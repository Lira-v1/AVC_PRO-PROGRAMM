import { CameraSystem } from './CameraSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { GridSystem } from './GridSystem';
import { CanvasDebugState, CanvasSnapshot, CanvasState, RoomModel, RoomScreenGeometry, RoomWorldGeometry, ScreenPoint, Viewport, WorldPoint } from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';
import { RoomRenderer } from './RoomRenderer';
import { RoomSelectionSystem } from './RoomSelectionSystem';

export class CanvasEngine {
  worldWidth: number;
  worldHeight: number;
  camera: CameraSystem;
  grid: GridSystem;
  canvasState: CanvasState;
  selection: RoomSelectionSystem;

  constructor(worldWidth = 500, worldHeight = 500) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.camera = new CameraSystem({ zoom: 0.2, panX: 0, panY: 0, minZoom: 0.05, maxZoom: 4 });
    this.grid = new GridSystem(1);
    this.selection = new RoomSelectionSystem();
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
    this.selection.setRooms(rooms);
  }

  getRooms(): RoomModel[] {
    return this.selection.getRooms();
  }

  getActiveRoomId(): string | null {
    return this.selection.getActiveRoomId();
  }

  getActiveRoom(): RoomModel | null {
    return this.selection.getActiveRoom();
  }

  selectRoom(roomId: string): string | null {
    return this.selection.selectRoom(roomId);
  }

  clearActiveRoom(): string | null {
    return this.selection.clearSelection();
  }

  handleTap(point: ScreenPoint): string | null {
    const worldPoint = this.screenToWorld(point);
    return this.selection.selectRoomAt(worldPoint);
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
      panX: camera.panX,
      panY: camera.panY,
      minZoom: camera.minZoom,
      maxZoom: camera.maxZoom,
      viewport: this.canvasState.viewport,
      worldCenter: this.getWorldCenter(),
      screenCenter,
      worldAtScreenCenter: this.screenToWorld(screenCenter),
      activeRoomId: this.getActiveRoomId(),
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
      roomIds: this.getRooms().map((room) => room.roomId),
    };
  }
}
