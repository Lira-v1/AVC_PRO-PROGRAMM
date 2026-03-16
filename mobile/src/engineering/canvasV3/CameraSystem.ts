import { CameraState, ScreenPoint, Viewport, WorldPoint } from './CanvasTypes';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class CameraSystem {
  private state: CameraState;
  private readonly initialState: CameraState;

  constructor(initial?: Partial<CameraState>) {
    this.initialState = {
      zoom: initial?.zoom ?? 1,
      panX: initial?.panX ?? 0,
      panY: initial?.panY ?? 0,
      minZoom: initial?.minZoom ?? 0.25,
      maxZoom: initial?.maxZoom ?? 4,
    };

    this.state = { ...this.initialState };
  }

  getState(): CameraState {
    return { ...this.state };
  }

  setZoom(nextZoom: number) {
    this.state.zoom = clamp(nextZoom, this.state.minZoom, this.state.maxZoom);
  }

  zoomBy(factor: number) {
    this.setZoom(this.state.zoom * factor);
  }

  resetView() {
    this.state = { ...this.initialState };
  }

  panByScreenDelta(deltaX: number, deltaY: number) {
    this.state.panX -= deltaX / this.state.zoom;
    this.state.panY -= deltaY / this.state.zoom;
  }

  worldToScreen(point: WorldPoint, viewport: Viewport): ScreenPoint {
    return {
      x: (point.x - this.state.panX) * this.state.zoom + viewport.width / 2,
      y: (point.y - this.state.panY) * this.state.zoom + viewport.height / 2,
    };
  }

  screenToWorld(point: ScreenPoint, viewport: Viewport): WorldPoint {
    return {
      x: (point.x - viewport.width / 2) / this.state.zoom + this.state.panX,
      y: (point.y - viewport.height / 2) / this.state.zoom + this.state.panY,
    };
  }
}
