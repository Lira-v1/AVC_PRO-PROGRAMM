export type CompassViewMode = 'default' | 'flipped';
export type WallLayoutSlot = 'top' | 'right' | 'bottom' | 'left';

export type ProjectOrientationV2 = {
  canonicalNorth: 'top';
  viewMode: CompassViewMode;
};

export const INITIAL_PROJECT_ORIENTATION_V2: ProjectOrientationV2 = {
  canonicalNorth: 'top',
  viewMode: 'default',
};

export const getSurfaceLayoutSlotsByCompass = (viewMode: CompassViewMode): Record<WallLayoutSlot, 'north' | 'east' | 'south' | 'west'> => {
  if (viewMode === 'flipped') {
    return {
      top: 'south',
      right: 'west',
      bottom: 'north',
      left: 'east',
    };
  }

  return {
    top: 'north',
    right: 'east',
    bottom: 'south',
    left: 'west',
  };
};
