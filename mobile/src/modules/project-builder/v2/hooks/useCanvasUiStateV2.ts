import { useCallback, useState } from 'react';

export type CanvasUiStateV2 = {
  isFullscreen: boolean;
  showGrid: boolean;
  showCompass: boolean;
};

export const useCanvasUiStateV2 = () => {
  const [state, setState] = useState<CanvasUiStateV2>({
    isFullscreen: false,
    showGrid: true,
    showCompass: true,
  });

  const toggleFullscreen = useCallback(() => {
    setState((prev) => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  const toggleGrid = useCallback(() => {
    setState((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  return {
    canvasUiState: state,
    toggleFullscreen,
    toggleGrid,
  };
};
