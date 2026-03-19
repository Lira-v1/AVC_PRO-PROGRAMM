import { CameraSystem } from './CameraSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { GridLine, GridState, Viewport, WorldPoint } from './CanvasTypes';

type GridLevelConfig = {
  level: string;
  stepMm: number;
};

const GRID_LEVELS: GridLevelConfig[] = [
  { level: 'macro-1000', stepMm: 1000 },
  { level: 'coarse-500', stepMm: 500 },
  { level: 'base-250', stepMm: 250 },
  { level: 'detail-125', stepMm: 125 },
  { level: 'micro-62.5', stepMm: 62.5 },
];

const REFERENCE_ROOM_SIZE_MM = 1000;
const GRID_PRECISION = 4;

const getCellsPerMeter = (stepMm: number) => REFERENCE_ROOM_SIZE_MM / stepMm;
const normalizeWorldValue = (value: number) => Number(value.toFixed(GRID_PRECISION));
const getGridOriginIndex = (worldValue: number, stepMm: number, direction: 'start' | 'end') =>
  direction === 'start' ? Math.floor(worldValue / stepMm) : Math.ceil(worldValue / stepMm);

export class GridSystem {
  private baseStep: number;

  constructor(baseStep = 250) {
    this.baseStep = baseStep;
  }

  private getLevelConfig(displayZoom: number): GridLevelConfig {
    if (displayZoom <= -40) {
      return GRID_LEVELS[0];
    }

    if (displayZoom <= -20) {
      return GRID_LEVELS[1];
    }

    if (displayZoom >= 40) {
      return GRID_LEVELS[4];
    }

    if (displayZoom >= 20) {
      return GRID_LEVELS[3];
    }

    return GRID_LEVELS.find((level) => level.stepMm === this.baseStep) ?? GRID_LEVELS[2];
  }

  getGridMetrics(displayZoom: number) {
    const level = this.getLevelConfig(displayZoom);

    return {
      gridStepMm: level.stepMm,
      gridLevel: level.level,
      cellsPerMeter: getCellsPerMeter(level.stepMm),
    };
  }

  getGridState(camera: CameraSystem, viewport: Viewport, displayZoom: number): GridState {
    const { gridStepMm, gridLevel, cellsPerMeter } = this.getGridMetrics(displayZoom);
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

  snap(point: WorldPoint, _zoom: number, displayZoom = 0): WorldPoint {
    const { gridStepMm } = this.getGridMetrics(displayZoom);

    return {
      x: Math.round(point.x / gridStepMm) * gridStepMm,
      y: Math.round(point.y / gridStepMm) * gridStepMm,
    };
  }
}
