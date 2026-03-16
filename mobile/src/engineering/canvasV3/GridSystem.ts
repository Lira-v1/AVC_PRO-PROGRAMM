import { CameraSystem } from './CameraSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { GridLine, GridState, Viewport, WorldPoint } from './CanvasTypes';

const TARGET_GRID_PIXEL_MIN = 24;
const TARGET_GRID_PIXEL_MAX = 96;

export class GridSystem {
  private baseStep: number;

  constructor(baseStep = 1) {
    this.baseStep = baseStep;
  }

  private getAdaptiveStep(zoom: number): number {
    let step = this.baseStep;

    while (step * zoom < TARGET_GRID_PIXEL_MIN) {
      step *= 2;
    }

    while (step * zoom > TARGET_GRID_PIXEL_MAX && step > this.baseStep / 2) {
      step /= 2;
    }

    return step;
  }

  getGridState(camera: CameraSystem, viewport: Viewport): GridState {
    const zoom = camera.getState().zoom;
    const step = this.getAdaptiveStep(zoom);
    const topLeftWorld = CoordinateSystem.screenToWorld(camera, { x: 0, y: 0 }, viewport);
    const bottomRightWorld = CoordinateSystem.screenToWorld(camera, { x: viewport.width, y: viewport.height }, viewport);

    const startX = Math.floor(topLeftWorld.x / step) * step;
    const endX = Math.ceil(bottomRightWorld.x / step) * step;
    const startY = Math.floor(topLeftWorld.y / step) * step;
    const endY = Math.ceil(bottomRightWorld.y / step) * step;

    const lines: GridLine[] = [];

    for (let x = startX; x <= endX; x += step) {
      const from = CoordinateSystem.worldToScreen(camera, { x, y: startY }, viewport);
      const to = CoordinateSystem.worldToScreen(camera, { x, y: endY }, viewport);
      lines.push({ id: `v-${x}`, from, to, axis: 'y' });
    }

    for (let y = startY; y <= endY; y += step) {
      const from = CoordinateSystem.worldToScreen(camera, { x: startX, y }, viewport);
      const to = CoordinateSystem.worldToScreen(camera, { x: endX, y }, viewport);
      lines.push({ id: `h-${y}`, from, to, axis: 'x' });
    }

    return {
      baseStep: this.baseStep,
      snapStep: step,
      lines,
    };
  }

  snap(point: WorldPoint, zoom: number): WorldPoint {
    const step = this.getAdaptiveStep(zoom);
    return {
      x: Math.round(point.x / step) * step,
      y: Math.round(point.y / step) * step,
    };
  }
}
