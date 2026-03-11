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

export type Wall = {
  id: string;
  roomId: string;
  side: WallSide;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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

export type ElementNode = {
  id: string;
  type: ElementType;
  roomId: string;
  wallId: string | null;
  x: number;
  y: number;
  rotation?: number;
  // reserved for future stages
  // heightMode?: 'preset' | 'custom';
  // heightValueMm?: number;
  // preset?: string;
  // note?: string;
};

export type Project = {
  id: string;
  name: string;
  rooms: Room[];
  elements: ElementNode[];
  createdAt: string;
  updatedAt: string;
};

export const TOOL_TYPES = ['select', ...ELEMENT_TYPES, 'delete'] as const;
export type ToolType = (typeof TOOL_TYPES)[number];
