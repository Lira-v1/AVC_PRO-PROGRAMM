import { SURFACE_DIRECTION_LABELS, getSurfaceDirectionFromRoomVector } from './canvasV4Directions';
import type { SurfaceDirection } from './canvasV4Directions';
import type { Point } from './canvasV4Geometry';

type SurfaceWarningSeverity = 'warning' | 'error';

type SurfaceWarningCode =
  | 'wall-surface-without-room'
  | 'opening-without-wall-surface'
  | 'negative-net-area-corrected'
  | 'missing-opening-height-default-used';

export type CanvasV4SurfaceWarning = {
  id: string;
  code: SurfaceWarningCode;
  severity: SurfaceWarningSeverity;
  message: string;
  roomId?: string;
  segmentId?: string;
  openingId?: string;
};

export type OpeningSurfaceRef = {
  openingId: string;
  type: 'door' | 'window';
  segmentId: string;
  topologyEdgeId: string;
  positionOnSegment: number;
  width: number;
  height: number;
  sillHeight: number;
  area: number;
};

export type WallSurface = {
  surfaceId: string;
  roomId: string;
  topologyEdgeId: string;
  wallSegmentIds: string[];
  direction: SurfaceDirection;
  directionLabel: string;
  length: number;
  height: number;
  grossArea: number;
  doorArea: number;
  windowArea: number;
  openingsArea: number;
  netArea: number;
  openings: OpeningSurfaceRef[];
};

export type RoomSurfaceSummary<RoomType extends string = string> = {
  roomId: string;
  roomName: string;
  roomType?: RoomType;
  floorArea: number;
  ceilingArea: number;
  perimeterGross: number;
  perimeterNet: number;
  wallSurfaces: WallSurface[];
};

export type CanvasV4SurfaceGraph<RoomType extends string = string> = {
  roomSurfaceSummaries: Array<RoomSurfaceSummary<RoomType>>;
  warnings: CanvasV4SurfaceWarning[];
  defaultRoomHeightMm: number;
  totalFloorArea: number;
  totalCeilingArea: number;
  totalGrossWallArea: number;
  totalNetWallArea: number;
  wallSurfaceCount: number;
};

type SurfaceRoomLike<RoomType extends string = string> = {
  roomId: string;
  displayName: string;
  roomType?: RoomType;
  area: number;
  perimeter: number;
  topologyEdgeIds: string[];
  center: Point;
};

type SurfaceDoorLike = {
  doorId: string;
  segmentId: string;
  positionOnSegment: number;
  width: number;
};

type SurfaceWindowLike = {
  windowId: string;
  segmentId: string;
  positionOnSegment: number;
  width: number;
  height: number;
  bottomOffset: number;
};

type SurfacePlanarEdgeLike = {
  edgeId: string;
  segmentId: string;
  sourceSegmentIds: string[];
  startPoint: Point;
  endPoint: Point;
  length: number;
};

type SurfacePlanarGraphLike = {
  edges: SurfacePlanarEdgeLike[];
};

type SurfaceDoorConnectionLike = {
  doorId: string;
  segmentId: string;
  topologyEdgeId: string | null;
  roomIds: string[];
};

type SurfaceWindowConnectionLike = {
  windowId: string;
  segmentId: string;
  topologyEdgeId: string | null;
  roomIds: string[];
};

type SurfaceConnectionGraphLike = {
  doorConnections: SurfaceDoorConnectionLike[];
  windowConnections: SurfaceWindowConnectionLike[];
};

const createSurfaceWarning = (
  code: SurfaceWarningCode,
  message: string,
  details: Partial<CanvasV4SurfaceWarning> = {},
): CanvasV4SurfaceWarning => ({
  id: `${code}-${details.roomId ?? details.segmentId ?? details.openingId ?? 'project'}-${message}`,
  code,
  severity: details.severity ?? 'warning',
  message,
  roomId: details.roomId,
  segmentId: details.segmentId,
  openingId: details.openingId,
});

const createOpeningSurfaceRef = (
  opening: SurfaceDoorLike | SurfaceWindowLike,
  type: 'door' | 'window',
  topologyEdgeId: string,
  defaultDoorHeightMm: number,
  defaultWindowHeightMm: number,
): OpeningSurfaceRef => {
  const height = type === 'door' ? defaultDoorHeightMm : ('height' in opening ? opening.height : defaultWindowHeightMm);
  const sillHeight = type === 'window' && 'bottomOffset' in opening ? opening.bottomOffset : 0;

  return {
    openingId: type === 'door' ? (opening as SurfaceDoorLike).doorId : (opening as SurfaceWindowLike).windowId,
    type,
    segmentId: opening.segmentId,
    topologyEdgeId,
    positionOnSegment: opening.positionOnSegment,
    width: opening.width,
    height,
    sillHeight,
    area: opening.width * height,
  };
};

export const createCanvasV4SurfaceGraph = <RoomType extends string = string>(
  rooms: Array<SurfaceRoomLike<RoomType>>,
  doors: SurfaceDoorLike[],
  windows: SurfaceWindowLike[],
  planarGraph: SurfacePlanarGraphLike,
  connectionGraph: SurfaceConnectionGraphLike,
  defaultRoomHeightMm: number,
  defaultDoorHeightMm: number,
  defaultWindowHeightMm: number,
): CanvasV4SurfaceGraph<RoomType> => {
  const topologyEdgeById = new Map(planarGraph.edges.map((edge) => [edge.edgeId, edge]));
  const doorById = new Map(doors.map((door) => [door.doorId, door]));
  const windowById = new Map(windows.map((window) => [window.windowId, window]));
  const doorConnectionsByTopologyEdgeId = new Map<string, SurfaceDoorConnectionLike[]>();
  const windowConnectionsByTopologyEdgeId = new Map<string, SurfaceWindowConnectionLike[]>();
  const warnings: CanvasV4SurfaceWarning[] = [];

  connectionGraph.doorConnections.forEach((connection) => {
    if (!connection.topologyEdgeId) {
      warnings.push(createSurfaceWarning('opening-without-wall-surface', 'Дверь не привязана к поверхности стены', { openingId: connection.doorId, segmentId: connection.segmentId }));
      return;
    }

    doorConnectionsByTopologyEdgeId.set(connection.topologyEdgeId, [...(doorConnectionsByTopologyEdgeId.get(connection.topologyEdgeId) ?? []), connection]);
  });

  connectionGraph.windowConnections.forEach((connection) => {
    if (!connection.topologyEdgeId) {
      warnings.push(createSurfaceWarning('opening-without-wall-surface', 'Окно не привязано к поверхности стены', { openingId: connection.windowId, segmentId: connection.segmentId }));
      return;
    }

    windowConnectionsByTopologyEdgeId.set(connection.topologyEdgeId, [...(windowConnectionsByTopologyEdgeId.get(connection.topologyEdgeId) ?? []), connection]);
  });

  if (doors.length > 0) {
    warnings.push(createSurfaceWarning('missing-opening-height-default-used', 'Для дверей используется высота по умолчанию: 2.10 м'));
  }

  const roomSurfaceSummaries = rooms.map<RoomSurfaceSummary<RoomType>>((room) => {
    const wallSurfaces = room.topologyEdgeIds
      .map((topologyEdgeId) => {
        const edge = topologyEdgeById.get(topologyEdgeId);

        if (!edge) {
          warnings.push(createSurfaceWarning('wall-surface-without-room', 'Поверхность стены не найдена для помещения', { roomId: room.roomId }));
          return null;
        }

        const midpoint = {
          x: (edge.startPoint.x + edge.endPoint.x) / 2,
          y: (edge.startPoint.y + edge.endPoint.y) / 2,
        };
        const direction = getSurfaceDirectionFromRoomVector({
          x: midpoint.x - room.center.x,
          y: midpoint.y - room.center.y,
        });
        const doorOpenings = (doorConnectionsByTopologyEdgeId.get(edge.edgeId) ?? [])
          .filter((connection) => connection.roomIds.includes(room.roomId))
          .map((connection) => doorById.get(connection.doorId))
          .filter((door): door is SurfaceDoorLike => Boolean(door))
          .map((door) => createOpeningSurfaceRef(door, 'door', edge.edgeId, defaultDoorHeightMm, defaultWindowHeightMm));
        const windowOpenings = (windowConnectionsByTopologyEdgeId.get(edge.edgeId) ?? [])
          .filter((connection) => connection.roomIds.includes(room.roomId))
          .map((connection) => windowById.get(connection.windowId))
          .filter((window): window is SurfaceWindowLike => Boolean(window))
          .map((window) => createOpeningSurfaceRef(window, 'window', edge.edgeId, defaultDoorHeightMm, defaultWindowHeightMm));
        const openings = [...doorOpenings, ...windowOpenings];
        const doorArea = doorOpenings.reduce((sum, opening) => sum + opening.area, 0);
        const windowArea = windowOpenings.reduce((sum, opening) => sum + opening.area, 0);
        const openingsArea = doorArea + windowArea;
        const grossArea = edge.length * defaultRoomHeightMm;
        const rawNetArea = grossArea - openingsArea;
        const netArea = Math.max(0, rawNetArea);

        if (rawNetArea < 0) {
          warnings.push(createSurfaceWarning('negative-net-area-corrected', 'Чистая площадь стены скорректирована до 0', { roomId: room.roomId, segmentId: edge.segmentId }));
        }

        return {
          surfaceId: `surface-${room.roomId}-${edge.edgeId}`,
          roomId: room.roomId,
          topologyEdgeId: edge.edgeId,
          wallSegmentIds: [...edge.sourceSegmentIds],
          direction,
          directionLabel: SURFACE_DIRECTION_LABELS[direction],
          length: edge.length,
          height: defaultRoomHeightMm,
          grossArea,
          doorArea,
          windowArea,
          openingsArea,
          netArea,
          openings,
        };
      })
      .filter((surface): surface is WallSurface => Boolean(surface));
    const perimeterNet = Math.max(0, room.perimeter - wallSurfaces.reduce((sum, surface) => (
      sum + surface.openings.reduce((openingSum, opening) => openingSum + opening.width, 0)
    ), 0));

    return {
      roomId: room.roomId,
      roomName: room.displayName,
      roomType: room.roomType,
      floorArea: room.area,
      ceilingArea: room.area,
      perimeterGross: room.perimeter,
      perimeterNet,
      wallSurfaces,
    };
  });

  const uniqueWarnings = Array.from(new Map(warnings.map((warning) => [warning.id, warning])).values());

  return {
    roomSurfaceSummaries,
    warnings: uniqueWarnings,
    defaultRoomHeightMm,
    totalFloorArea: roomSurfaceSummaries.reduce((sum, summary) => sum + summary.floorArea, 0),
    totalCeilingArea: roomSurfaceSummaries.reduce((sum, summary) => sum + summary.ceilingArea, 0),
    totalGrossWallArea: roomSurfaceSummaries.reduce((sum, summary) => sum + summary.wallSurfaces.reduce((wallSum, surface) => wallSum + surface.grossArea, 0), 0),
    totalNetWallArea: roomSurfaceSummaries.reduce((sum, summary) => sum + summary.wallSurfaces.reduce((wallSum, surface) => wallSum + surface.netArea, 0), 0),
    wallSurfaceCount: roomSurfaceSummaries.reduce((sum, summary) => sum + summary.wallSurfaces.length, 0),
  };
};
