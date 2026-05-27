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

export const createProjectedOpening = (opening: OpeningSurfaceRef, edge: WallUnwrapPlanarEdgeLike, wallHeight: number): ProjectedOpening => {
  const sillHeight = opening.type === 'window' ? opening.sillHeight : 0;
  const localX = getOpeningLocalXOnTopologyEdge(opening, edge);
  const topOffset = Math.max(0, wallHeight - sillHeight - opening.height);

  return {
    openingId: opening.openingId,
    type: opening.type,
    localX,
    width: Math.min(opening.width, edge.length),
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
        const edge = topologyEdgeById.get(surface.topologyEdgeId);

        if (!edge) {
          return null;
        }

        const projectedOpenings = surface.openings.map((opening) => createProjectedOpening(opening, edge, surface.height));
        const wallPlane: WallPlane = {
          wallPlaneId: `wall-plane-${summary.roomId}-${surface.topologyEdgeId}`,
          roomId: summary.roomId,
          wallSurfaceId: surface.surfaceId,
          direction: surface.direction,
          directionLabel: surface.directionLabel,
          width: surface.length,
          height: surface.height,
          localOrigin: clonePoint(edge.startPoint),
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
