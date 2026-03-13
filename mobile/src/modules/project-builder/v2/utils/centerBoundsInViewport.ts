export type SceneBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SCENE_CENTER_X = 5000;
const SCENE_CENTER_Y = 5000;

export const centerBoundsInViewport = (
  bounds: SceneBounds,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
) => {
  void viewportWidth;
  void viewportHeight;

  const boundsCenterX = bounds.x + bounds.width / 2;
  const boundsCenterY = bounds.y + bounds.height / 2;

  const targetX = SCENE_CENTER_X - boundsCenterX * zoom;
  const targetY = SCENE_CENTER_Y - boundsCenterY * zoom;

  return {
    panX: targetX,
    panY: targetY,
  };
};
