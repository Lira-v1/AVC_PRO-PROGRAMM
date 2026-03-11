export const ROOM_TYPES = ['kitchen', 'bathroom', 'bedroom', 'corridor', 'balcony', 'other'] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  kitchen: 'Кухня',
  bathroom: 'Санузел',
  bedroom: 'Спальня',
  corridor: 'Коридор',
  balcony: 'Балкон',
  other: 'Другое',
};

export type Room = {
  id: string;
  type: RoomType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ceilingHeightMm?: number;
};

export type WallSide = 'top' | 'right' | 'bottom' | 'left';
export type CardinalDirection = 'north' | 'east' | 'south' | 'west';

export type ProjectOrientation = {
  northLabel?: string;
  eastLabel?: string;
  southLabel?: string;
  westLabel?: string;
};

export type Wall = {
  id: string;
  roomId: string;
  side: WallSide;
  cardinal: CardinalDirection;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length?: number;
};

export const ELEMENT_TYPES = [
  'socket',
  'double_socket',
  'switch',
  'double_switch',
  'light_point',
  'junction_box',
  'panel',
  'door',
  'window',
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];
export type ProjectStatus = 'draft' | 'formed' | 'ready_for_estimate';

export const HEIGHT_MODES = ['from_floor', 'from_ceiling', 'custom'] as const;
export type HeightMode = (typeof HEIGHT_MODES)[number];

export type ElementNode = {
  id: string;
  type: ElementType;
  roomId?: string;
  wallId?: string | null;
  wallCardinal?: CardinalDirection;
  x: number;
  y: number;
  rotation?: number;
  widthMm?: number;
  preset?: string;
  heightMode?: HeightMode;
  heightValueMm?: number;
  offsetMm?: number;
  note?: string;
};

export type ProjectSummary = {
  byType: Partial<Record<ElementType, number>>;
  byRoom: Record<string, Partial<Record<ElementType, number>>>;
};

export type Project = {
  id: string;
  name: string;
  title: string;
  objectType: 'apartment' | 'house' | 'warehouse' | 'other';
  orientation?: ProjectOrientation;
  rooms: Room[];
  elements: ElementNode[];
  summary: ProjectSummary;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type EstimateDraftPayload = {
  projectId: string;
  title: string;
  objectType: string;
  rooms: Array<{
    id: string;
    type: string;
    name: string;
  }>;
  totalsByType: Record<string, number>;
  totalsByRoom: Record<string, Record<string, number>>;
  elements: Array<{
    id: string;
    type: string;
    roomId?: string;
    wallId?: string | null;
    wallCardinal?: CardinalDirection;
    preset?: string;
    widthMm?: number;
    heightMode?: string;
    heightValueMm?: number;
    offsetMm?: number;
    note?: string;
  }>;
};

export const TOOL_TYPES = ['select', ...ELEMENT_TYPES, 'delete'] as const;
export type ToolType = (typeof TOOL_TYPES)[number];
