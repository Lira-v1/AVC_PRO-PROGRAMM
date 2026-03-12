export type CompassViewMode = 'default' | 'flipped';

export type ProjectOrientationV2 = {
  canonicalNorth: 'top';
  viewMode: CompassViewMode;
};

export const INITIAL_PROJECT_ORIENTATION_V2: ProjectOrientationV2 = {
  canonicalNorth: 'top',
  viewMode: 'default',
};
