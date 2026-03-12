import { useCallback, useState } from 'react';
import { CanvasCameraState } from '../model/types';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export const useCanvasCameraV2 = () => {
  const [camera, setCamera] = useState<CanvasCameraState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const zoomIn = useCallback(() => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, +(prev.zoom + ZOOM_STEP).toFixed(2)),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, +(prev.zoom - ZOOM_STEP).toFixed(2)),
    }));
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

  return {
    camera,
    zoomIn,
    zoomOut,
    resetCamera,
    panCamera,
    setCameraPosition,
    setZoom,
  };
};
