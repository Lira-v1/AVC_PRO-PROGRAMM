import { useCallback, useState } from 'react';
import { CompassOrientation } from '../model/types';

export type CanvasUiStateV2 = {
  isFullscreen: boolean;
  showGrid: boolean;
  showCompass: boolean;
  compassOrientation: CompassOrientation;
};

export const useCanvasUiStateV2 = () => {
  const [state, setState] = useState<CanvasUiStateV2>({
    isFullscreen: false,
    showGrid: true,
    showCompass: true,
    compassOrientation: 'default',
  });

  const toggleFullscreen = useCallback(() => {
    setState((prev) => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  const toggleGrid = useCallback(() => {
    setState((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const toggleCompassOrientation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      compassOrientation: prev.compassOrientation === 'default' ? 'flipped' : 'default',
    }));
  }, []);

  return {
    canvasUiState: state,
    toggleFullscreen,
    toggleGrid,
    toggleCompassOrientation,
  };
};
