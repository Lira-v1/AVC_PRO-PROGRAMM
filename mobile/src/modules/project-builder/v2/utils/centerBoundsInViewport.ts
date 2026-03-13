import { worldToScenePoint, SCENE_CENTER_X, SCENE_CENTER_Y } from './sceneCoordinates';

export type SceneBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const centerBoundsInViewport = (
  bounds: SceneBounds,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
) => {
  void viewportWidth;
  void viewportHeight;

  const boundsCenterWorldX = bounds.x + bounds.width / 2;
  const boundsCenterWorldY = bounds.y + bounds.height / 2;
  const boundsCenterScene = worldToScenePoint({ x: boundsCenterWorldX, y: boundsCenterWorldY });

  const targetX = SCENE_CENTER_X - boundsCenterScene.x * zoom;
  const targetY = SCENE_CENTER_Y - boundsCenterScene.y * zoom;

  return {
    panX: targetX,
    panY: targetY,
  };
};
