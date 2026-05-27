import { SURFACE_DIRECTION_LABELS, getLogicalWallOrientation, getSurfaceDirectionFromLogicalWall } from './canvasV4Directions';
import type { SurfaceDirection } from './canvasV4Directions';
import { angularDistance, clonePoint } from './canvasV4Geometry';
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
  topologyEdgeIds: string[];
  wallSegmentIds: string[];
  direction: SurfaceDirection;
  directionLabel: string;
  startPoint: Point;
  endPoint: Point;
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

const LOGICAL_WALL_MERGE_ANGLE_TOLERANCE_DEG = 2;
const LOGICAL_WALL_MERGE_DISTANCE_TOLERANCE_MM = 8;
const LOGICAL_WALL_MERGE_GAP_TOLERANCE_MM = 2;

const getWallVector = (surface: Pick<WallSurface, 'startPoint' | 'endPoint'>): Point => ({
  x: surface.endPoint.x - surface.startPoint.x,
  y: surface.endPoint.y - surface.startPoint.y,
});

const getWallAngleDeg = (surface: Pick<WallSurface, 'startPoint' | 'endPoint'>) => {
  const vector = getWallVector(surface);

  return (Math.atan2(vector.y, vector.x) * 180) / Math.PI;
};

const getWallAxisAngleDistance = (
  first: Pick<WallSurface, 'startPoint' | 'endPoint'>,
  second: Pick<WallSurface, 'startPoint' | 'endPoint'>,
) => Math.min(
  angularDistance(getWallAngleDeg(first), getWallAngleDeg(second)),
  angularDistance(getWallAngleDeg(first), getWallAngleDeg(second) + 180),
);

const getWallUnit = (surface: Pick<WallSurface, 'startPoint' | 'endPoint'>): Point => {
  const vector = getWallVector(surface);
  const length = Math.max(Math.hypot(vector.x, vector.y), 1);

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
};

const getProjectionOnWallAxis = (point: Point, origin: Point, unit: Point) =>
  (point.x - origin.x) * unit.x + (point.y - origin.y) * unit.y;

const getWallProjectionRange = (
  surface: Pick<WallSurface, 'startPoint' | 'endPoint'>,
  origin: Point,
  unit: Point,
) => {
  const startProjection = getProjectionOnWallAxis(surface.startPoint, origin, unit);
  const endProjection = getProjectionOnWallAxis(surface.endPoint, origin, unit);

  return {
    min: Math.min(startProjection, endProjection),
    max: Math.max(startProjection, endProjection),
  };
};

const getProjectionRangeGap = (
  first: { min: number; max: number },
  second: { min: number; max: number },
) => Math.max(0, Math.max(first.min, second.min) - Math.min(first.max, second.max));

const getDistanceToInfiniteWallLine = (
  point: Point,
  wall: Pick<WallSurface, 'startPoint' | 'endPoint'>,
) => {
  const vector = getWallVector(wall);
  const length = Math.max(Math.hypot(vector.x, vector.y), 1);

  return Math.abs(
    vector.x * (wall.startPoint.y - point.y) -
    (wall.startPoint.x - point.x) * vector.y
  ) / length;
};

const getTopologyEdgeSortValue = (topologyEdgeId: string) => {
  const match = topologyEdgeId.match(/(\d+)$/);

  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
};

const getPrimaryTopologyEdgeId = (topologyEdgeIds: string[]) =>
  [...topologyEdgeIds].sort((first, second) => (
    getTopologyEdgeSortValue(first) - getTopologyEdgeSortValue(second) ||
    first.localeCompare(second)
  ))[0] ?? topologyEdgeIds[0];

const canMergeWallSurfaces = (first: WallSurface, second: WallSurface) => {
  const firstOrientation = getLogicalWallOrientation(getWallVector(first));
  const secondOrientation = getLogicalWallOrientation(getWallVector(second));

  if (firstOrientation !== secondOrientation || first.direction !== second.direction) {
    return false;
  }

  if (getWallAxisAngleDistance(first, second) > LOGICAL_WALL_MERGE_ANGLE_TOLERANCE_DEG) {
    return false;
  }

  if (
    getDistanceToInfiniteWallLine(second.startPoint, first) > LOGICAL_WALL_MERGE_DISTANCE_TOLERANCE_MM ||
    getDistanceToInfiniteWallLine(second.endPoint, first) > LOGICAL_WALL_MERGE_DISTANCE_TOLERANCE_MM
  ) {
    return false;
  }

  const origin = first.startPoint;
  const unit = getWallUnit(first);
  const gap = getProjectionRangeGap(
    getWallProjectionRange(first, origin, unit),
    getWallProjectionRange(second, origin, unit),
  );

  return gap <= LOGICAL_WALL_MERGE_GAP_TOLERANCE_MM;
};

const getMergedWallEndpoints = (surfaces: WallSurface[]) => {
  const firstSurface = surfaces[0];

  if (!firstSurface) {
    return {
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      length: 0,
    };
  }

  const origin = firstSurface.startPoint;
  const unit = getWallUnit(firstSurface);
  const range = surfaces.reduce(
    (currentRange, surface) => {
      const surfaceRange = getWallProjectionRange(surface, origin, unit);

      return {
        min: Math.min(currentRange.min, surfaceRange.min),
        max: Math.max(currentRange.max, surfaceRange.max),
      };
    },
    { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  );

  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
    return {
      startPoint: clonePoint(firstSurface.startPoint),
      endPoint: clonePoint(firstSurface.endPoint),
      length: firstSurface.length,
    };
  }

  const startPoint = {
    x: origin.x + unit.x * range.min,
    y: origin.y + unit.y * range.min,
  };
  const endPoint = {
    x: origin.x + unit.x * range.max,
    y: origin.y + unit.y * range.max,
  };

  return {
    startPoint,
    endPoint,
    length: Math.max(0, range.max - range.min),
  };
};

const mergeWallSurfaceGroup = <RoomType extends string>(
  room: SurfaceRoomLike<RoomType>,
  surfaces: WallSurface[],
): WallSurface | null => {
  if (surfaces.length === 0) {
    return null;
  }

  const topologyEdgeIds = surfaces.flatMap((surface) => surface.topologyEdgeIds);
  const primaryTopologyEdgeId = getPrimaryTopologyEdgeId(topologyEdgeIds);
  const wallSegmentIds = Array.from(new Set(surfaces.flatMap((surface) => surface.wallSegmentIds)));
  const openings = surfaces.flatMap((surface) => surface.openings);
  const { startPoint, endPoint, length } = getMergedWallEndpoints(surfaces);
  const direction = getSurfaceDirectionFromLogicalWall(startPoint, endPoint, room.center);
  const doorArea = openings.filter((opening) => opening.type === 'door').reduce((sum, opening) => sum + opening.area, 0);
  const windowArea = openings.filter((opening) => opening.type === 'window').reduce((sum, opening) => sum + opening.area, 0);
  const openingsArea = doorArea + windowArea;
  const height = surfaces[0].height;
  const grossArea = length * height;

  return {
    surfaceId: `surface-${room.roomId}-${primaryTopologyEdgeId}`,
    roomId: room.roomId,
    topologyEdgeId: primaryTopologyEdgeId,
    topologyEdgeIds,
    wallSegmentIds,
    direction,
    directionLabel: SURFACE_DIRECTION_LABELS[direction],
    startPoint,
    endPoint,
    length,
    height,
    grossArea,
    doorArea,
    windowArea,
    openingsArea,
    netArea: Math.max(0, grossArea - openingsArea),
    openings,
  };
};

const mergeRoomLogicalWallSurfaces = <RoomType extends string>(
  room: SurfaceRoomLike<RoomType>,
  rawSurfaces: WallSurface[],
) => {
  if (rawSurfaces.length <= 1) {
    return rawSurfaces;
  }

  const surfaceGroups = rawSurfaces.reduce<WallSurface[][]>((groups, surface) => {
    const lastGroup = groups[groups.length - 1];
    const lastSurface = lastGroup?.[lastGroup.length - 1];

    if (lastGroup && lastSurface && canMergeWallSurfaces(lastSurface, surface)) {
      lastGroup.push(surface);
      return groups;
    }

    groups.push([surface]);
    return groups;
  }, []);

  if (surfaceGroups.length > 1) {
    const firstGroup = surfaceGroups[0];
    const lastGroup = surfaceGroups[surfaceGroups.length - 1];
    const firstSurface = firstGroup[0];
    const lastSurface = lastGroup[lastGroup.length - 1];

    if (firstSurface && lastSurface && canMergeWallSurfaces(lastSurface, firstSurface)) {
      surfaceGroups[0] = [...lastGroup, ...firstGroup];
      surfaceGroups.pop();
    }
  }

  return surfaceGroups
    .map((group) => mergeWallSurfaceGroup(room, group))
    .filter((surface): surface is WallSurface => Boolean(surface));
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
    const rawWallSurfaces = room.topologyEdgeIds
      .map((topologyEdgeId) => {
        const edge = topologyEdgeById.get(topologyEdgeId);

        if (!edge) {
          warnings.push(createSurfaceWarning('wall-surface-without-room', 'Поверхность стены не найдена для помещения', { roomId: room.roomId }));
          return null;
        }

        const direction = getSurfaceDirectionFromLogicalWall(edge.startPoint, edge.endPoint, room.center);
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
          topologyEdgeIds: [edge.edgeId],
          wallSegmentIds: [...edge.sourceSegmentIds],
          direction,
          directionLabel: SURFACE_DIRECTION_LABELS[direction],
          startPoint: clonePoint(edge.startPoint),
          endPoint: clonePoint(edge.endPoint),
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
    const wallSurfaces = mergeRoomLogicalWallSurfaces(room, rawWallSurfaces);
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
