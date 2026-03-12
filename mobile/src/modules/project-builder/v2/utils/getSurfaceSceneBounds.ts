export type SurfaceSceneItem = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const getSurfaceSceneBounds = (items: SurfaceSceneItem[]) => {
  if (!items.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const minX = Math.min(...items.map((item) => item.x));
  const minY = Math.min(...items.map((item) => item.y));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  const maxY = Math.max(...items.map((item) => item.y + item.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};
