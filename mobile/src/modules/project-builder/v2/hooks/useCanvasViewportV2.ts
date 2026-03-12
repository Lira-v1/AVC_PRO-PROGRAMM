import { useCallback, useMemo, useState } from 'react';
import { CanvasViewportStateV2 } from '../model/types';

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.1;
const BASE_SCALE = 1;
const BASE_OFFSET = 0;

const clampScale = (nextScale: number) => {
  const safeScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
  return Number(safeScale.toFixed(2));
};

export const useCanvasViewportV2 = () => {
  const [viewport, setViewport] = useState<CanvasViewportStateV2>({
    scale: BASE_SCALE,
    offsetX: BASE_OFFSET,
    offsetY: BASE_OFFSET,
  });

  const setViewportScale = useCallback((nextScale: number) => {
    setViewport((prev) => ({
      ...prev,
      scale: clampScale(nextScale),
    }));
  }, []);

  const setViewportOffset = useCallback((offsetX: number, offsetY: number) => {
    setViewport((prev) => ({
      ...prev,
      offsetX,
      offsetY,
    }));
  }, []);

  const resetViewport = useCallback(() => {
    setViewport({
      scale: BASE_SCALE,
      offsetX: BASE_OFFSET,
      offsetY: BASE_OFFSET,
    });
  }, []);

  const zoomIn = useCallback(() => {
    setViewportScale(viewport.scale + SCALE_STEP);
  }, [setViewportScale, viewport.scale]);

  const zoomOut = useCallback(() => {
    setViewportScale(viewport.scale - SCALE_STEP);
  }, [setViewportScale, viewport.scale]);

  const viewportApi = useMemo(
    () => ({
      // Shared API for buttons/wheel/pinch integrations.
      setViewportScale,
      setViewportOffset,
    }),
    [setViewportScale, setViewportOffset],
  );

  return {
    ...viewport,
    zoomIn,
    zoomOut,
    resetViewport,
    setViewportScale,
    setViewportOffset,
    viewportApi,
  };
};
