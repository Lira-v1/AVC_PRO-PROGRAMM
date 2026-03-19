import { CameraSystem } from './CameraSystem';
import { CoordinateSystem } from './CoordinateSystem';
import { GridLine, GridState, Viewport, WorldPoint } from './CanvasTypes';

type GridLevelConfig = {
  level: string;
  stepMm: number;
  minDisplayZoom?: number;
  maxDisplayZoom?: number;
};

const GRID_LEVELS: GridLevelConfig[] = [
  { level: 'macro-1000', stepMm: 1000, maxDisplayZoom: -40 },
  { level: 'coarse-500', stepMm: 500, maxDisplayZoom: -20 },
  { level: 'base-250', stepMm: 250, minDisplayZoom: -20, maxDisplayZoom: 20 },
  { level: 'detail-125', stepMm: 125, minDisplayZoom: 20, maxDisplayZoom: 40 },
  { level: 'micro-62.5', stepMm: 62.5, minDisplayZoom: 40 },
];

const REFERENCE_ROOM_SIZE_MM = 1000;

const getCellsPerMeter = (stepMm: number) => REFERENCE_ROOM_SIZE_MM / stepMm;

export class GridSystem {
  private baseStep: number;

  constructor(baseStep = 250) {
    this.baseStep = baseStep;
  }

  private getLevelConfig(displayZoom: number): GridLevelConfig {
    const matchedLevel = GRID_LEVELS.find((level) => {
      const withinMin = level.minDisplayZoom === undefined || displayZoom >= level.minDisplayZoom;
      const withinMax = level.maxDisplayZoom === undefined || displayZoom <= level.maxDisplayZoom;

      return withinMin && withinMax;
    });

    return matchedLevel ?? { level: 'base-250', stepMm: this.baseStep };
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
    const step = gridStepMm;
    const topLeftWorld = CoordinateSystem.screenToWorld(camera, { x: 0, y: 0 }, viewport);
    const bottomRightWorld = CoordinateSystem.screenToWorld(camera, { x: viewport.width, y: viewport.height }, viewport);

    const startX = Math.floor(topLeftWorld.x / step) * step;
    const endX = Math.ceil(bottomRightWorld.x / step) * step;
    const startY = Math.floor(topLeftWorld.y / step) * step;
    const endY = Math.ceil(bottomRightWorld.y / step) * step;

    const lines: GridLine[] = [];

    for (let x = startX; x <= endX; x += step) {
      const normalizedX = Number(x.toFixed(4));
      const from = CoordinateSystem.worldToScreen(camera, { x: normalizedX, y: startY }, viewport);
      const to = CoordinateSystem.worldToScreen(camera, { x: normalizedX, y: endY }, viewport);
      lines.push({ id: `v-${normalizedX}`, from, to, axis: 'y' });
    }

    for (let y = startY; y <= endY; y += step) {
      const normalizedY = Number(y.toFixed(4));
      const from = CoordinateSystem.worldToScreen(camera, { x: startX, y: normalizedY }, viewport);
      const to = CoordinateSystem.worldToScreen(camera, { x: endX, y: normalizedY }, viewport);
      lines.push({ id: `h-${normalizedY}`, from, to, axis: 'x' });
    }

    return {
      baseStep: this.baseStep,
      snapStep: step,
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
