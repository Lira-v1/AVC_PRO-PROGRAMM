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
  const scaledWidth = bounds.width * zoom;
  const scaledHeight = bounds.height * zoom;

  const targetX = viewportWidth / 2 - (bounds.x * zoom + scaledWidth / 2);
  const targetY = viewportHeight / 2 - (bounds.y * zoom + scaledHeight / 2);

  return {
    panX: targetX,
    panY: targetY,
  };
};

