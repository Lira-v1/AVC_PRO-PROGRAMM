export const ROOM_VIEW_MODES = ['plan', 'walls', 'ceiling', 'floor'] as const;

export type RoomViewMode = (typeof ROOM_VIEW_MODES)[number];

export const ROOM_VIEW_MODE_LABELS: Record<RoomViewMode, string> = {
  plan: 'План',
  walls: 'Стены',
  ceiling: 'Потолок',
  floor: 'Пол',
};
