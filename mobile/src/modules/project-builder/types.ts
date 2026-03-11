export const ROOM_TYPES = ['kitchen', 'bathroom', 'bedroom', 'corridor', 'balcony', 'other'] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export type Room = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: RoomType;
  name: string;
};

export type Project = {
  id: string;
  name: string;
  rooms: Room[];
  createdAt: string;
  updatedAt: string;
};
