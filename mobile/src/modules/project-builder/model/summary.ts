import { ELEMENT_TYPES, ElementNode, ProjectSummary, Room } from '../types';

const increment = (bucket: Record<string, number>, key: string) => {
  bucket[key] = (bucket[key] ?? 0) + 1;
};

export const buildProjectSummary = (elements: ElementNode[], rooms: Room[]): ProjectSummary => {
  const byType: Record<string, number> = {};
  const byRoom: Record<string, Record<string, number>> = {};

  rooms.forEach((room) => {
    byRoom[room.id] = {};
  });

  elements.forEach((element) => {
    if (!ELEMENT_TYPES.includes(element.type)) return;

    increment(byType, element.type);

    if (element.roomId) {
      if (!byRoom[element.roomId]) {
        byRoom[element.roomId] = {};
      }
      increment(byRoom[element.roomId], element.type);
    }
  });

  return {
    byType,
    byRoom,
  };
};
