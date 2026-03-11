import { CardinalDirection, ProjectOrientation } from './types';

export const CARDINAL_DIRECTIONS: CardinalDirection[] = ['north', 'east', 'south', 'west'];

export const CARDINAL_DIRECTION_LABELS: Record<CardinalDirection, string> = {
  north: 'Север',
  east: 'Восток',
  south: 'Юг',
  west: 'Запад',
};

export const WALL_DIRECTION_LABELS: Record<CardinalDirection, string> = {
  north: 'Северная стена',
  east: 'Восточная стена',
  south: 'Южная стена',
  west: 'Западная стена',
};

export const DEFAULT_PROJECT_ORIENTATION: ProjectOrientation = {
  northLabel: 'Север',
  eastLabel: 'Восток',
  southLabel: 'Юг',
  westLabel: 'Запад',
};
