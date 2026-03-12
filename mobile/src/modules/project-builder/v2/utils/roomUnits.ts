export type RoomSizeUnit = 'mm' | 'cm' | 'm';

export const formatRoomSize = (valueMm: number, unit: RoomSizeUnit) => {
  if (unit === 'mm') return `${Math.round(valueMm)}`;
  if (unit === 'cm') return `${(valueMm / 10).toFixed(1)}`;
  return `${(valueMm / 1000).toFixed(2)}`;
};

export const parseRoomSizeToMm = (raw: string, unit: RoomSizeUnit) => {
  const parsed = Number(raw.replace(',', '.'));
  if (Number.isNaN(parsed) || parsed <= 0) return null;

  if (unit === 'mm') return Math.round(parsed);
  if (unit === 'cm') return Math.round(parsed * 10);
  return Math.round(parsed * 1000);
};

export const formatDimensionByUnit = (valueMm: number, unit: RoomSizeUnit) => {
  if (unit === 'mm') return `${Math.round(valueMm)} мм`;
  if (unit === 'cm') return `${(valueMm / 10).toFixed(1)} см`;
  return `${(valueMm / 1000).toFixed(2)} м`;
};
