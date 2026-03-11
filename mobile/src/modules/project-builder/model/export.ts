import { EstimateDraftPayload, Project } from '../types';

export const exportToEstimateDraft = (project: Project): EstimateDraftPayload => ({
  projectId: project.id,
  title: project.title,
  objectType: project.objectType,
  rooms: project.rooms.map((room) => ({
    id: room.id,
    type: room.type,
    name: room.name,
  })),
  totalsByType: Object.fromEntries(Object.entries(project.summary.byType).map(([key, value]) => [key, value ?? 0])),
  totalsByRoom: Object.fromEntries(
    Object.entries(project.summary.byRoom).map(([roomId, totals]) => [
      roomId,
      Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value ?? 0])),
    ]),
  ),
  elements: project.elements.map((element) => ({
    id: element.id,
    type: element.type,
    roomId: element.roomId,
    wallId: element.wallId,
    wallCardinal: element.wallCardinal,
    preset: element.preset,
    heightMode: element.heightMode,
    heightValueMm: element.heightValueMm,
    offsetMm: element.offsetMm,
    note: element.note,
  })),
});
