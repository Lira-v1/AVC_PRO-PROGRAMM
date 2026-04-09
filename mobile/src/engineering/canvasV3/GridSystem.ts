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

  getGridState(
    camera: CameraSystem,
    viewport: Viewport,
    options?: { localBounds?: { minX: number; maxX: number; minY: number; maxY: number }; localStepMm?: number },
  ): GridState {
    const { gridStepMm: baseGridStepMm, gridLevel, cellsPerMeter } = this.getGridMetrics();
    const gridStepMm = options?.localStepMm ?? baseGridStepMm;
    const topLeftWorld = CoordinateSystem.screenToWorld(camera, { x: 0, y: 0 }, viewport);
    const bottomRightWorld = CoordinateSystem.screenToWorld(camera, { x: viewport.width, y: viewport.height }, viewport);
    const worldMinX = Math.min(topLeftWorld.x, bottomRightWorld.x);
    const worldMaxX = Math.max(topLeftWorld.x, bottomRightWorld.x);
    const worldMinY = Math.min(topLeftWorld.y, bottomRightWorld.y);
    const worldMaxY = Math.max(topLeftWorld.y, bottomRightWorld.y);
    const constrainedMinX = options?.localBounds ? Math.max(worldMinX, options.localBounds.minX) : worldMinX;
    const constrainedMaxX = options?.localBounds ? Math.min(worldMaxX, options.localBounds.maxX) : worldMaxX;
    const constrainedMinY = options?.localBounds ? Math.max(worldMinY, options.localBounds.minY) : worldMinY;
    const constrainedMaxY = options?.localBounds ? Math.min(worldMaxY, options.localBounds.maxY) : worldMaxY;

    const startXIndex = getGridOriginIndex(constrainedMinX, gridStepMm, 'start');
    const endXIndex = getGridOriginIndex(constrainedMaxX, gridStepMm, 'end');
    const startYIndex = getGridOriginIndex(constrainedMinY, gridStepMm, 'start');
    const endYIndex = getGridOriginIndex(constrainedMaxY, gridStepMm, 'end');
    const startX = normalizeWorldValue(constrainedMinX);
    const endX = normalizeWorldValue(constrainedMaxX);
    const startY = normalizeWorldValue(constrainedMinY);
    const endY = normalizeWorldValue(constrainedMaxY);

    const lines: GridLine[] = [];

    if (constrainedMinX > constrainedMaxX || constrainedMinY > constrainedMaxY) {
      return {
        baseStep: this.baseStep,
        snapStep: gridStepMm,
        gridStepMm,
        gridLevel,
        cellsPerMeter: getCellsPerMeter(gridStepMm),
        lines,
      };
    }

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
      cellsPerMeter: options?.localStepMm ? getCellsPerMeter(gridStepMm) : cellsPerMeter,
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
