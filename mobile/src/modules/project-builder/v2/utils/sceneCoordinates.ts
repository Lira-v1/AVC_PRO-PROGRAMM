import { CanvasCameraState } from '../model/types';

export const SCENE_WIDTH = 10000;
export const SCENE_HEIGHT = 10000;
export const SCENE_CENTER_X = SCENE_WIDTH / 2;
export const SCENE_CENTER_Y = SCENE_HEIGHT / 2;

export type ScenePoint = { x: number; y: number };
export type SceneRect = { x: number; y: number; width: number; height: number };

export const worldToScenePoint = (point: ScenePoint): ScenePoint => ({
  x: point.x + SCENE_CENTER_X,
  y: point.y + SCENE_CENTER_Y,
});

export const sceneToWorldPoint = (point: ScenePoint): ScenePoint => ({
  x: point.x - SCENE_CENTER_X,
  y: point.y - SCENE_CENTER_Y,
});

export const worldToSceneRect = (rect: SceneRect): SceneRect => {
  const point = worldToScenePoint({ x: rect.x, y: rect.y });
  return { ...rect, ...point };
};

export const sceneToWorldRect = (rect: SceneRect): SceneRect => {
  const point = sceneToWorldPoint({ x: rect.x, y: rect.y });
  return { ...rect, ...point };
};

export const worldRectToSceneStyle = (rect: SceneRect) => {
  const sceneRect = worldToSceneRect(rect);
  return {
    left: sceneRect.x,
    top: sceneRect.y,
    width: sceneRect.width,
    height: sceneRect.height,
  };
};

export const viewportSceneBase = (viewportWidth: number, viewportHeight: number) => ({
  left: viewportWidth / 2 - SCENE_CENTER_X,
  top: viewportHeight / 2 - SCENE_CENTER_Y,
});

export const screenToScenePoint = (
  point: ScenePoint,
  viewportWidth: number,
  viewportHeight: number,
  camera: CanvasCameraState,
): ScenePoint => {
  const base = viewportSceneBase(viewportWidth, viewportHeight);
  const safeZoom = Math.max(camera.zoom, 0.0001);

  return {
    x: (point.x - base.left) / safeZoom - camera.panX,
    y: (point.y - base.top) / safeZoom - camera.panY,
  };
};
