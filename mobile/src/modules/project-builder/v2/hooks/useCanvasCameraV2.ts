import { useCallback, useState } from 'react';
import { CanvasCameraState } from '../model/types';
import { SceneBounds, centerBoundsInViewport } from '../utils/centerBoundsInViewport';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

type ZoomAnchorOptions = {
  anchorX: number;
  anchorY: number;
  baseCamera?: CanvasCameraState;
};

export const useCanvasCameraV2 = () => {
  const [camera, setCamera] = useState<CanvasCameraState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const zoomIn = useCallback(() => {
    setCamera((prev) => {
      const nextZoom = Math.min(MAX_ZOOM, +(prev.zoom + ZOOM_STEP).toFixed(2));
      return {
        ...prev,
        zoom: nextZoom,
      };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setCamera((prev) => {
      const nextZoom = Math.max(MIN_ZOOM, +(prev.zoom - ZOOM_STEP).toFixed(2));
      return {
        ...prev,
        zoom: nextZoom,
      };
    });
  }, []);

  const resetCamera = useCallback(() => {
    setCamera({
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  }, []);

  const setCameraPosition = useCallback((panX: number, panY: number) => {
    setCamera((prev) => ({
      ...prev,
      panX,
      panY,
    }));
  }, []);

  const panCamera = useCallback((dx: number, dy: number) => {
    setCamera((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    const safeZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

    setCamera((prev) => ({
      ...prev,
      zoom: +safeZoom.toFixed(2),
    }));
  }, []);

  const zoomTo = useCallback((zoom: number, options: ZoomAnchorOptions) => {
    const safeZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    const roundedZoom = +safeZoom.toFixed(2);

    setCamera((prev) => {
      const baseCamera = options.baseCamera ?? prev;

      if (roundedZoom === baseCamera.zoom) {
        return prev;
      }

      const sceneX = (options.anchorX - baseCamera.panX) / baseCamera.zoom;
      const sceneY = (options.anchorY - baseCamera.panY) / baseCamera.zoom;

      return {
        zoom: roundedZoom,
        panX: +(options.anchorX - sceneX * roundedZoom).toFixed(2),
        panY: +(options.anchorY - sceneY * roundedZoom).toFixed(2),
      };
    });
  }, []);

  const centerOnBounds = useCallback(
    (bounds: SceneBounds, viewportWidth: number, viewportHeight: number, zoom = camera.zoom) => {
      const centered = centerBoundsInViewport(bounds, viewportWidth, viewportHeight, zoom);
      setCamera((prev) => ({
        ...prev,
        zoom: +Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)).toFixed(2),
        panX: centered.panX,
        panY: centered.panY,
      }));
    },
    [camera.zoom],
  );

  return {
    camera,
    zoomIn,
    zoomOut,
    resetCamera,
    panCamera,
    setCameraPosition,
    setZoom,
    zoomTo,
    centerOnBounds,
    zoomStep: ZOOM_STEP,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
  };
};
