import { clampToRange, clonePoint } from './canvasV4Geometry';
import type { Point } from './canvasV4Geometry';
import type { SurfaceDirection } from './canvasV4Directions';
import type { CanvasV4SurfaceGraph, OpeningSurfaceRef, WallSurface } from './canvasV4Surface';

export type ProjectedOpening = {
  openingId: string;
  type: 'door' | 'window';
  localX: number;
  width: number;
  height: number;
  sillHeight: number;
  topOffset: number;
};

export type WallPlane = {
  wallPlaneId: string;
  roomId: string;
  wallSurfaceId: string;
  topologyEdgeIds: string[];
  legacyWallPlaneIds: string[];
  direction: SurfaceDirection;
  directionLabel: string;
  width: number;
  height: number;
  localOrigin: Point;
  openings: OpeningSurfaceRef[];
  projectedOpenings: ProjectedOpening[];
  wallOrderIndex: number;
};

export type RoomWallSequence = {
  roomId: string;
  wallPlaneIds: string[];
  wallSurfaceIds: string[];
  directions: SurfaceDirection[];
};

export type CanvasV4WallUnwrapGraph = {
  roomWallSequences: RoomWallSequence[];
  wallPlanes: WallPlane[];
  projectedOpeningCount: number;
  wallPlaneCount: number;
  wallSequenceCount: number;
};

type WallUnwrapPlanarEdgeLike = {
  edgeId: string;
  sourceOffsetsBySegmentId: Record<string, { startOffset: number; endOffset: number }>;
  startPoint: Point;
  endPoint: Point;
  startOffset: number;
  length: number;
};

type WallUnwrapPlanarGraphLike = {
  edges: WallUnwrapPlanarEdgeLike[];
};

export const getOpeningLocalXOnTopologyEdge = (opening: OpeningSurfaceRef, edge: WallUnwrapPlanarEdgeLike) => {
  const edgeOffsets = edge.sourceOffsetsBySegmentId[opening.segmentId];
  const topologyStartOffset = edgeOffsets?.startOffset ?? edge.startOffset ?? 0;
  const rawLocalX = opening.positionOnSegment - topologyStartOffset;
  const minimumLocalX = Math.min(opening.width / 2, edge.length / 2);
  const maximumLocalX = Math.max(minimumLocalX, edge.length - minimumLocalX);

  if (!Number.isFinite(rawLocalX)) {
    return edge.length / 2;
  }

  return clampToRange(rawLocalX, minimumLocalX, maximumLocalX);
};

const getWallUnit = (startPoint: Point, endPoint: Point): Point => {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const length = Math.max(Math.hypot(dx, dy), 1);

  return {
    x: dx / length,
    y: dy / length,
  };
};

const getOpeningLocalXOnWall = (
  opening: OpeningSurfaceRef,
  edge: WallUnwrapPlanarEdgeLike,
  wallStartPoint: Point,
  wallEndPoint: Point,
  wallLength: number,
) => {
  const rawLocalX = getOpeningLocalXOnTopologyEdge(opening, edge);
  const edgeUnit = getWallUnit(edge.startPoint, edge.endPoint);
  const openingPoint = {
    x: edge.startPoint.x + edgeUnit.x * rawLocalX,
    y: edge.startPoint.y + edgeUnit.y * rawLocalX,
  };
  const wallUnit = getWallUnit(wallStartPoint, wallEndPoint);
  const projectedLocalX = (openingPoint.x - wallStartPoint.x) * wallUnit.x + (openingPoint.y - wallStartPoint.y) * wallUnit.y;
  const minimumLocalX = Math.min(opening.width / 2, wallLength / 2);
  const maximumLocalX = Math.max(minimumLocalX, wallLength - minimumLocalX);

  return clampToRange(projectedLocalX, minimumLocalX, maximumLocalX);
};

export const createProjectedOpening = (
  opening: OpeningSurfaceRef,
  edge: WallUnwrapPlanarEdgeLike,
  wallHeight: number,
  wallStartPoint = edge.startPoint,
  wallEndPoint = edge.endPoint,
  wallLength = edge.length,
): ProjectedOpening => {
  const sillHeight = opening.type === 'window' ? opening.sillHeight : 0;
  const localX = getOpeningLocalXOnWall(opening, edge, wallStartPoint, wallEndPoint, wallLength);
  const topOffset = Math.max(0, wallHeight - sillHeight - opening.height);

  return {
    openingId: opening.openingId,
    type: opening.type,
    localX,
    width: Math.min(opening.width, wallLength),
    height: opening.height,
    sillHeight,
    topOffset,
  };
};

export const createCanvasV4WallUnwrapGraph = (
  surfaceGraph: CanvasV4SurfaceGraph,
  planarGraph: WallUnwrapPlanarGraphLike,
): CanvasV4WallUnwrapGraph => {
  const topologyEdgeById = new Map(planarGraph.edges.map((edge) => [edge.edgeId, edge]));
  const wallPlanes: WallPlane[] = [];
  const roomWallSequences: RoomWallSequence[] = surfaceGraph.roomSurfaceSummaries.map((summary) => {
    const sequenceWallPlanes = summary.wallSurfaces
      .map((surface: WallSurface, wallOrderIndex) => {
        const edges = surface.topologyEdgeIds
          .map((topologyEdgeId) => topologyEdgeById.get(topologyEdgeId))
          .filter((edge): edge is WallUnwrapPlanarEdgeLike => Boolean(edge));

        if (edges.length === 0) {
          return null;
        }

        const projectedOpenings = surface.openings
          .map((opening) => {
            const openingEdge = topologyEdgeById.get(opening.topologyEdgeId);

            return openingEdge
              ? createProjectedOpening(opening, openingEdge, surface.height, surface.startPoint, surface.endPoint, surface.length)
              : null;
          })
          .filter((opening): opening is ProjectedOpening => Boolean(opening));
        const wallPlane: WallPlane = {
          wallPlaneId: `wall-plane-${summary.roomId}-${surface.topologyEdgeId}`,
          roomId: summary.roomId,
          wallSurfaceId: surface.surfaceId,
          topologyEdgeIds: [...surface.topologyEdgeIds],
          legacyWallPlaneIds: surface.topologyEdgeIds.map((topologyEdgeId) => `wall-plane-${summary.roomId}-${topologyEdgeId}`),
          direction: surface.direction,
          directionLabel: surface.directionLabel,
          width: surface.length,
          height: surface.height,
          localOrigin: clonePoint(surface.startPoint),
          openings: surface.openings.map((opening) => ({ ...opening })),
          projectedOpenings,
          wallOrderIndex,
        };

        wallPlanes.push(wallPlane);
        return wallPlane;
      })
      .filter((wallPlane): wallPlane is WallPlane => Boolean(wallPlane));

    return {
      roomId: summary.roomId,
      wallPlaneIds: sequenceWallPlanes.map((wallPlane) => wallPlane.wallPlaneId),
      wallSurfaceIds: sequenceWallPlanes.map((wallPlane) => wallPlane.wallSurfaceId),
      directions: sequenceWallPlanes.map((wallPlane) => wallPlane.direction),
    };
  });

  return {
    roomWallSequences,
    wallPlanes,
    projectedOpeningCount: wallPlanes.reduce((sum, wallPlane) => sum + wallPlane.projectedOpenings.length, 0),
    wallPlaneCount: wallPlanes.length,
    wallSequenceCount: roomWallSequences.length,
  };
};
