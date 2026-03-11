import { ElementNode, ElementType, Wall } from './types';
import { getWallLength as getWallLengthBase } from './walls';

export const DEFAULT_ELEMENT_WIDTH_MM: Partial<Record<ElementType, number>> = {
  socket: 80,
  double_socket: 150,
  switch: 80,
  double_switch: 150,
  junction_box: 100,
  panel: 400,
  door: 900,
  window: 1200,
};

const ELECTRIC_RESTRICTED_TYPES: ElementType[] = ['socket', 'double_socket', 'switch', 'double_switch', 'junction_box', 'panel'];
const OPENING_TYPES: ElementType[] = ['door', 'window'];

export type AxisRange = { start: number; end: number };

export const getWallLength = (wall: Pick<Wall, 'x1' | 'y1' | 'x2' | 'y2' | 'length'>): number => {
  return wall.length ?? getWallLengthBase(wall);
};

export const getDefaultElementWidthMm = (type: ElementType): number => {
  return DEFAULT_ELEMENT_WIDTH_MM[type] ?? 80;
};

export const getElementWidthMm = (element: Pick<ElementNode, 'type' | 'widthMm'>): number => {
  return Math.max(1, element.widthMm ?? getDefaultElementWidthMm(element.type));
};

export const getDoorRange = (door: Pick<ElementNode, 'type' | 'offsetMm' | 'widthMm'>): AxisRange | null => {
  if (door.type !== 'door' || typeof door.offsetMm !== 'number') return null;
  const width = getElementWidthMm(door);
  return { start: door.offsetMm - width / 2, end: door.offsetMm + width / 2 };
};

export const getRestrictedZone = (door: Pick<ElementNode, 'type' | 'offsetMm' | 'widthMm'>): AxisRange | null => {
  const range = getDoorRange(door);
  if (!range) return null;
  return { start: range.start - 80, end: range.end + 80 };
};

export const isOffsetInsideRange = (offset: number, range: AxisRange): boolean => offset >= range.start && offset <= range.end;

export const getElementOffsetFromPosition = (wall: Wall, position: { x: number; y: number }): number => {
  const wallLength = getWallLength(wall);
  if (wallLength <= 0) return 0;

  if (wall.side === 'top' || wall.side === 'bottom') {
    return Math.max(0, Math.min(wallLength, position.x - wall.x1));
  }

  return Math.max(0, Math.min(wallLength, position.y - wall.y1));
};

export const getPositionFromOffset = (wall: Wall, offsetMm: number): { x: number; y: number } => {
  const wallLength = Math.max(1, getWallLength(wall));
  const clampedOffset = Math.max(0, Math.min(wallLength, offsetMm));

  if (wall.side === 'top' || wall.side === 'bottom') {
    return { x: wall.x1 + clampedOffset, y: wall.y1 };
  }

  return { x: wall.x1, y: wall.y1 + clampedOffset };
};

const intersects = (a: AxisRange, b: AxisRange): boolean => a.start <= b.end && b.start <= a.end;

export const validateWallPlacement = (
  element: ElementNode,
  wall: Wall,
  wallElements: ElementNode[],
): { valid: boolean; reason?: string } => {
  if (typeof element.offsetMm !== 'number') {
    return { valid: false, reason: 'missing_offset' };
  }

  const wallLength = getWallLength(wall);
  const width = getElementWidthMm(element);
  const half = width / 2;
  const range: AxisRange = { start: element.offsetMm - half, end: element.offsetMm + half };

  if (range.start < 0 || range.end > wallLength) {
    return { valid: false, reason: 'out_of_wall_bounds' };
  }

  const openings = wallElements.filter((item) => OPENING_TYPES.includes(item.type) && item.id !== element.id);

  if (OPENING_TYPES.includes(element.type)) {
    const overlaps = openings.some((opening) => {
      const openingWidth = getElementWidthMm(opening);
      if (typeof opening.offsetMm !== 'number') return false;
      return intersects(range, { start: opening.offsetMm - openingWidth / 2, end: opening.offsetMm + openingWidth / 2 });
    });

    if (overlaps) return { valid: false, reason: 'opening_overlap' };
  }

  const insideOpening = openings.some((opening) => {
    const openingWidth = getElementWidthMm(opening);
    if (typeof opening.offsetMm !== 'number') return false;
    return intersects(range, { start: opening.offsetMm - openingWidth / 2, end: opening.offsetMm + openingWidth / 2 });
  });

  if (insideOpening) {
    return { valid: false, reason: 'opening_overlap' };
  }

  if (ELECTRIC_RESTRICTED_TYPES.includes(element.type)) {
    const insideDoorRestricted = wallElements.some((item) => {
      if (item.type !== 'door' || item.id === element.id) return false;
      const restricted = getRestrictedZone(item);
      return restricted ? isOffsetInsideRange(element.offsetMm as number, restricted) : false;
    });

    if (insideDoorRestricted) {
      return { valid: false, reason: 'restricted_near_door' };
    }
  }

  return { valid: true };
};

export const getWallElementScale = (element: Pick<ElementNode, 'type' | 'widthMm'>): number => {
  const base = 80;
  const width = getElementWidthMm(element);
  return Math.max(0.85, Math.min(3.2, width / base));
};
