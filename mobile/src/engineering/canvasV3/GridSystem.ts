import { CameraSystem } from './CameraSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { GridLine, GridState, Viewport, WorldPoint } from './CanvasTypes';

const REFERENCE_ROOM_SIZE_MM = 1000;
const GRID_PRECISION = 4;
const FIXED_GRID_LEVEL = 'world-100';

const getCellsPerMeter = (stepMm: number) => REFERENCE_ROOM_SIZE_MM / stepMm;
const normalizeWorldValue = (value: number) => Number(value.toFixed(GRID_PRECISION));
const getGridOriginIndex = (worldValue: number, stepMm: number, direction: 'start' | 'end') =>
  direction === 'start' ? Math.floor(worldValue / stepMm) : Math.ceil(worldValue / stepMm);

export class GridSystem {
  private baseStep: number;

  constructor(baseStep = 250) {
    this.baseStep = baseStep;
  }

  getGridMetrics() {
    return {
      gridStepMm: this.baseStep,
      gridLevel: FIXED_GRID_LEVEL,
      cellsPerMeter: getCellsPerMeter(this.baseStep),
    };
  }

  getGridState(camera: CameraSystem, viewport: Viewport): GridState {
    const { gridStepMm, gridLevel, cellsPerMeter } = this.getGridMetrics();
    const topLeftWorld = CoordinateSystem.screenToWorld(camera, { x: 0, y: 0 }, viewport);
    const bottomRightWorld = CoordinateSystem.screenToWorld(camera, { x: viewport.width, y: viewport.height }, viewport);
    const startXIndex = getGridOriginIndex(topLeftWorld.x, gridStepMm, 'start');
    const endXIndex = getGridOriginIndex(bottomRightWorld.x, gridStepMm, 'end');
    const startYIndex = getGridOriginIndex(topLeftWorld.y, gridStepMm, 'start');
    const endYIndex = getGridOriginIndex(bottomRightWorld.y, gridStepMm, 'end');
    const startX = normalizeWorldValue(startXIndex * gridStepMm);
    const endX = normalizeWorldValue(endXIndex * gridStepMm);
    const startY = normalizeWorldValue(startYIndex * gridStepMm);
    const endY = normalizeWorldValue(endYIndex * gridStepMm);

    const lines: GridLine[] = [];

    for (let xIndex = startXIndex; xIndex <= endXIndex; xIndex += 1) {
      const normalizedX = normalizeWorldValue(xIndex * gridStepMm);
      const from = CoordinateSystem.worldToScreen(camera, { x: normalizedX, y: startY }, viewport);
      const to = CoordinateSystem.worldToScreen(camera, { x: normalizedX, y: endY }, viewport);
      lines.push({ id: `v-${normalizedX}`, from, to, axis: 'y' });
    }

    for (let yIndex = startYIndex; yIndex <= endYIndex; yIndex += 1) {
      const normalizedY = normalizeWorldValue(yIndex * gridStepMm);
      const from = CoordinateSystem.worldToScreen(camera, { x: startX, y: normalizedY }, viewport);
      const to = CoordinateSystem.worldToScreen(camera, { x: endX, y: normalizedY }, viewport);
      lines.push({ id: `h-${normalizedY}`, from, to, axis: 'x' });
    }

    return {
      baseStep: this.baseStep,
      snapStep: gridStepMm,
      gridStepMm,
      gridLevel,
      cellsPerMeter,
      lines,
    };
  }

  snap(point: WorldPoint): WorldPoint {
    const { gridStepMm } = this.getGridMetrics();

    return {
      x: Math.round(point.x / gridStepMm) * gridStepMm,
      y: Math.round(point.y / gridStepMm) * gridStepMm,
    };
  }
}
