import { RoomModel, WorldBounds, WorldPoint } from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';

const DEFAULT_GRID_STEP_MM = 100;
const DEFAULT_ROOM_SNAP_ENTER_THRESHOLD_MM = 14;
const DEFAULT_ROOM_SNAP_RELEASE_THRESHOLD_MM = 20;
const DEFAULT_GRID_SNAP_ENTER_THRESHOLD_MM = 6;
const DEFAULT_GRID_SNAP_RELEASE_THRESHOLD_MM = 10;
const DEFAULT_CORNER_SNAP_ENTER_THRESHOLD_MM = 16;
const DEFAULT_CORNER_SNAP_RELEASE_THRESHOLD_MM = 22;
const DEFAULT_CORNER_SNAP_PRIORITY_BONUS_MM = 2;
const SNAP_SOFT_INFLUENCE_MIN = 0.2;
const SNAP_SOFT_INFLUENCE_MAX = 0.62;
const SNAP_HARD_LOCK_DISTANCE_MM = 1.4;
const SNAP_PREVIEW_MULTIPLIER = 1.6;
const OVERLAP_EPSILON_MM = 0.001;

type SnapResult = {
  centerX: number;
  centerY: number;
  snappedRoomId: string | null;
  snapTargetRoomId: string | null;
};

type SnapKind = 'side' | 'corner-room' | 'corner-grid';

type SnapCandidate = {
  centerX: number;
  centerY: number;
  sourceRoomId: string;
  targetRoomId: string | null;
  distance: number;
  kind: SnapKind;
  fromPoint: WorldPoint;
  toPoint: WorldPoint;
};

export type RoomSnapPreview = {
  kind: SnapKind;
  centerX: number;
  centerY: number;
  fromPoint: WorldPoint;
  toPoint: WorldPoint;
  targetRoomId: string | null;
} | null;

const snapToStep = (value: number, stepMm: number) => Math.round(value / stepMm) * stepMm;
const rangesOverlap = (minA: number, maxA: number, minB: number, maxB: number) => Math.min(maxA, maxB) - Math.max(minA, minB) > OVERLAP_EPSILON_MM;

const intersectsBounds = (a: WorldBounds, b: WorldBounds) => {
  const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);

  return overlapX > OVERLAP_EPSILON_MM && overlapY > OVERLAP_EPSILON_MM;
};

export class RoomTransformSystem {
  private rooms: RoomModel[] = [];
  private activeRoomId: string | null = null;
  private isDragging = false;
  private readonly gridStepMm: number;
  private readonly roomSnapEnterThresholdMm: number;
  private readonly roomSnapReleaseThresholdMm: number;
  private readonly cornerSnapEnterThresholdMm: number;
  private readonly cornerSnapReleaseThresholdMm: number;
  private readonly gridSnapEnterThresholdMm: number;
  private readonly gridSnapReleaseThresholdMm: number;
  private snappedRoomId: string | null = null;
  private snapTargetRoomId: string | null = null;
  private isGridSnappedX = false;
  private isGridSnappedY = false;
  private snapPreview: RoomSnapPreview = null;

  constructor(
    gridStepMm = DEFAULT_GRID_STEP_MM,
    roomSnapEnterThresholdMm = DEFAULT_ROOM_SNAP_ENTER_THRESHOLD_MM,
    roomSnapReleaseThresholdMm = DEFAULT_ROOM_SNAP_RELEASE_THRESHOLD_MM,
    cornerSnapEnterThresholdMm = DEFAULT_CORNER_SNAP_ENTER_THRESHOLD_MM,
    cornerSnapReleaseThresholdMm = DEFAULT_CORNER_SNAP_RELEASE_THRESHOLD_MM,
    gridSnapEnterThresholdMm = DEFAULT_GRID_SNAP_ENTER_THRESHOLD_MM,
    gridSnapReleaseThresholdMm = DEFAULT_GRID_SNAP_RELEASE_THRESHOLD_MM,
  ) {
    this.gridStepMm = gridStepMm;
    this.roomSnapEnterThresholdMm = roomSnapEnterThresholdMm;
    this.roomSnapReleaseThresholdMm = Math.max(roomSnapEnterThresholdMm, roomSnapReleaseThresholdMm);
    this.cornerSnapEnterThresholdMm = cornerSnapEnterThresholdMm;
    this.cornerSnapReleaseThresholdMm = Math.max(cornerSnapEnterThresholdMm, cornerSnapReleaseThresholdMm);
    this.gridSnapEnterThresholdMm = gridSnapEnterThresholdMm;
    this.gridSnapReleaseThresholdMm = Math.max(gridSnapEnterThresholdMm, gridSnapReleaseThresholdMm);
  }

  setRooms(rooms: RoomModel[]) {
    this.rooms = rooms;

    if (this.activeRoomId && !this.rooms.some((room) => room.roomId === this.activeRoomId)) {
      this.activeRoomId = null;
      this.isDragging = false;
      this.isGridSnappedX = false;
      this.isGridSnappedY = false;
      this.snapPreview = null;
    }

    if (this.snapTargetRoomId && !this.rooms.some((room) => room.roomId === this.snapTargetRoomId)) {
      this.snapTargetRoomId = null;
      this.snappedRoomId = null;
      this.isGridSnappedX = false;
      this.isGridSnappedY = false;
      this.snapPreview = null;
    }
  }

  setActiveRoomId(roomId: string | null) {
    this.activeRoomId = roomId;

    if (!roomId) {
      this.isDragging = false;
      this.snappedRoomId = null;
      this.snapTargetRoomId = null;
      this.isGridSnappedX = false;
      this.isGridSnappedY = false;
      this.snapPreview = null;
    }
  }

  startDrag(): boolean {
    const canDrag = Boolean(this.activeRoomId && this.rooms.some((room) => room.roomId === this.activeRoomId));
    this.isDragging = canDrag;

    if (!canDrag) {
      this.snappedRoomId = null;
      this.snapTargetRoomId = null;
      this.isGridSnappedX = false;
      this.isGridSnappedY = false;
      this.snapPreview = null;
    }

    return canDrag;
  }

  private getBoundsWithCenter(room: RoomModel, centerX: number, centerY: number): WorldBounds {
    const geometry = RoomGeometry.fromModel({ ...room, centerX, centerY });

    return geometry.bounds;
  }

  private canPlaceWithoutOverlap(movedRoom: RoomModel, centerX: number, centerY: number): boolean {
    const movedBounds = this.getBoundsWithCenter(movedRoom, centerX, centerY);

    for (const room of this.rooms) {
      if (room.roomId === movedRoom.roomId) {
        continue;
      }

      const targetBounds = RoomGeometry.fromModel(room).bounds;

      if (intersectsBounds(movedBounds, targetBounds)) {
        return false;
      }
    }

    return true;
  }

  private getSideSnapCandidate(
    movedRoom: RoomModel,
    centerX: number,
    centerY: number,
    thresholdMm: number,
    onlyTargetRoomId?: string,
  ): SnapCandidate | null {
    const movedBounds = this.getBoundsWithCenter(movedRoom, centerX, centerY);
    let bestCandidate: SnapCandidate | null = null;

    for (const targetRoom of this.rooms) {
      if (targetRoom.roomId === movedRoom.roomId) {
        continue;
      }
      if (onlyTargetRoomId && targetRoom.roomId !== onlyTargetRoomId) {
        continue;
      }

      const targetBounds = RoomGeometry.fromModel(targetRoom).bounds;

      const verticalOverlap = rangesOverlap(movedBounds.minY, movedBounds.maxY, targetBounds.minY, targetBounds.maxY);
      const horizontalOverlap = rangesOverlap(movedBounds.minX, movedBounds.maxX, targetBounds.minX, targetBounds.maxX);

      if (verticalOverlap) {
        const leftToRightDistance = targetBounds.maxX - movedBounds.minX;

        if (Math.abs(leftToRightDistance) <= thresholdMm) {
          const candidateCenterX = centerX + leftToRightDistance;

          if (this.canPlaceWithoutOverlap(movedRoom, candidateCenterX, centerY)) {
            const overlapYFrom = Math.max(movedBounds.minY, targetBounds.minY);
            const overlapYTo = Math.min(movedBounds.maxY, targetBounds.maxY);
            const candidate: SnapCandidate = {
              centerX: candidateCenterX,
              centerY,
              sourceRoomId: movedRoom.roomId,
              targetRoomId: targetRoom.roomId,
              distance: Math.abs(leftToRightDistance),
              kind: 'side',
              fromPoint: { x: movedBounds.minX, y: (overlapYFrom + overlapYTo) / 2 },
              toPoint: { x: targetBounds.maxX, y: (overlapYFrom + overlapYTo) / 2 },
            };

            if (!bestCandidate || candidate.distance < bestCandidate.distance) {
              bestCandidate = candidate;
            }
          }
        }

        const rightToLeftDistance = targetBounds.minX - movedBounds.maxX;

        if (Math.abs(rightToLeftDistance) <= thresholdMm) {
          const candidateCenterX = centerX + rightToLeftDistance;

          if (this.canPlaceWithoutOverlap(movedRoom, candidateCenterX, centerY)) {
            const overlapYFrom = Math.max(movedBounds.minY, targetBounds.minY);
            const overlapYTo = Math.min(movedBounds.maxY, targetBounds.maxY);
            const candidate: SnapCandidate = {
              centerX: candidateCenterX,
              centerY,
              sourceRoomId: movedRoom.roomId,
              targetRoomId: targetRoom.roomId,
              distance: Math.abs(rightToLeftDistance),
              kind: 'side',
              fromPoint: { x: movedBounds.maxX, y: (overlapYFrom + overlapYTo) / 2 },
              toPoint: { x: targetBounds.minX, y: (overlapYFrom + overlapYTo) / 2 },
            };

            if (!bestCandidate || candidate.distance < bestCandidate.distance) {
              bestCandidate = candidate;
            }
          }
        }
      }

      if (horizontalOverlap) {
        const topToBottomDistance = targetBounds.maxY - movedBounds.minY;

        if (Math.abs(topToBottomDistance) <= thresholdMm) {
          const candidateCenterY = centerY + topToBottomDistance;

          if (this.canPlaceWithoutOverlap(movedRoom, centerX, candidateCenterY)) {
            const overlapXFrom = Math.max(movedBounds.minX, targetBounds.minX);
            const overlapXTo = Math.min(movedBounds.maxX, targetBounds.maxX);
            const candidate: SnapCandidate = {
              centerX,
              centerY: candidateCenterY,
              sourceRoomId: movedRoom.roomId,
              targetRoomId: targetRoom.roomId,
              distance: Math.abs(topToBottomDistance),
              kind: 'side',
              fromPoint: { x: (overlapXFrom + overlapXTo) / 2, y: movedBounds.minY },
              toPoint: { x: (overlapXFrom + overlapXTo) / 2, y: targetBounds.maxY },
            };

            if (!bestCandidate || candidate.distance < bestCandidate.distance) {
              bestCandidate = candidate;
            }
          }
        }

        const bottomToTopDistance = targetBounds.minY - movedBounds.maxY;

        if (Math.abs(bottomToTopDistance) <= thresholdMm) {
          const candidateCenterY = centerY + bottomToTopDistance;

          if (this.canPlaceWithoutOverlap(movedRoom, centerX, candidateCenterY)) {
            const overlapXFrom = Math.max(movedBounds.minX, targetBounds.minX);
            const overlapXTo = Math.min(movedBounds.maxX, targetBounds.maxX);
            const candidate: SnapCandidate = {
              centerX,
              centerY: candidateCenterY,
              sourceRoomId: movedRoom.roomId,
              targetRoomId: targetRoom.roomId,
              distance: Math.abs(bottomToTopDistance),
              kind: 'side',
              fromPoint: { x: (overlapXFrom + overlapXTo) / 2, y: movedBounds.maxY },
              toPoint: { x: (overlapXFrom + overlapXTo) / 2, y: targetBounds.minY },
            };

            if (!bestCandidate || candidate.distance < bestCandidate.distance) {
              bestCandidate = candidate;
            }
          }
        }
      }
    }

    return bestCandidate;
  }

  private getRoomCornerSnapCandidate(
    movedRoom: RoomModel,
    centerX: number,
    centerY: number,
    thresholdMm: number,
    onlyTargetRoomId?: string,
  ): SnapCandidate | null {
    const movedGeometry = RoomGeometry.fromModel({ ...movedRoom, centerX, centerY });
    let bestCandidate: SnapCandidate | null = null;

    for (const targetRoom of this.rooms) {
      if (targetRoom.roomId === movedRoom.roomId) {
        continue;
      }
      if (onlyTargetRoomId && targetRoom.roomId !== onlyTargetRoomId) {
        continue;
      }

      const targetGeometry = RoomGeometry.fromModel(targetRoom);

      for (const movedCorner of movedGeometry.corners) {
        for (const targetCorner of targetGeometry.corners) {
          const dx = targetCorner.x - movedCorner.x;
          const dy = targetCorner.y - movedCorner.y;
          const distance = Math.hypot(dx, dy);

          if (distance > thresholdMm) {
            continue;
          }

          const candidateCenterX = centerX + dx;
          const candidateCenterY = centerY + dy;

          if (!this.canPlaceWithoutOverlap(movedRoom, candidateCenterX, candidateCenterY)) {
            continue;
          }

          const candidate: SnapCandidate = {
            centerX: candidateCenterX,
            centerY: candidateCenterY,
            sourceRoomId: movedRoom.roomId,
            targetRoomId: targetRoom.roomId,
            distance,
            kind: 'corner-room',
            fromPoint: movedCorner,
            toPoint: targetCorner,
          };

          if (!bestCandidate || candidate.distance < bestCandidate.distance) {
            bestCandidate = candidate;
          }
        }
      }
    }

    return bestCandidate;
  }

  private getGridCornerSnapCandidate(movedRoom: RoomModel, centerX: number, centerY: number, thresholdMm: number): SnapCandidate | null {
    const movedGeometry = RoomGeometry.fromModel({ ...movedRoom, centerX, centerY });
    let bestCandidate: SnapCandidate | null = null;

    for (const movedCorner of movedGeometry.corners) {
      const snappedX = snapToStep(movedCorner.x, this.gridStepMm);
      const snappedY = snapToStep(movedCorner.y, this.gridStepMm);
      const dx = snappedX - movedCorner.x;
      const dy = snappedY - movedCorner.y;
      const distance = Math.hypot(dx, dy);

      if (distance > thresholdMm) {
        continue;
      }

      const candidateCenterX = centerX + dx;
      const candidateCenterY = centerY + dy;

      if (!this.canPlaceWithoutOverlap(movedRoom, candidateCenterX, candidateCenterY)) {
        continue;
      }

      const candidate: SnapCandidate = {
        centerX: candidateCenterX,
        centerY: candidateCenterY,
        sourceRoomId: movedRoom.roomId,
        targetRoomId: null,
        distance,
        kind: 'corner-grid',
        fromPoint: movedCorner,
        toPoint: { x: snappedX, y: snappedY },
      };

      if (!bestCandidate || candidate.distance < bestCandidate.distance) {
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  private resolveGridAxis(value: number, isSnapped: boolean): { value: number; isSnapped: boolean } {
    const snappedValue = snapToStep(value, this.gridStepMm);
    const distanceToGrid = Math.abs(value - snappedValue);
    const threshold = isSnapped ? this.gridSnapReleaseThresholdMm : this.gridSnapEnterThresholdMm;

    if (distanceToGrid <= threshold) {
      return { value: snappedValue, isSnapped: true };
    }

    return { value, isSnapped: false };
  }

  private applySoftSnap(rawValue: number, snappedValue: number, distance: number, threshold: number): number {
    if (distance <= SNAP_HARD_LOCK_DISTANCE_MM) {
      return snappedValue;
    }

    const normalized = Math.max(0, Math.min(1, 1 - distance / Math.max(threshold, OVERLAP_EPSILON_MM)));
    const influence = SNAP_SOFT_INFLUENCE_MIN + (SNAP_SOFT_INFLUENCE_MAX - SNAP_SOFT_INFLUENCE_MIN) * normalized;

    return rawValue + (snappedValue - rawValue) * influence;
  }

  private resolveDragPosition(room: RoomModel, centerX: number, centerY: number): SnapResult {
    const isHoldingRoomSnap = Boolean(this.snapTargetRoomId);
    const cornerThreshold = isHoldingRoomSnap ? this.cornerSnapReleaseThresholdMm : this.cornerSnapEnterThresholdMm;
    const sideThreshold = isHoldingRoomSnap ? this.roomSnapReleaseThresholdMm : this.roomSnapEnterThresholdMm;
    const roomTargetScope = this.snapTargetRoomId ?? undefined;

    const roomCornerCandidate = this.getRoomCornerSnapCandidate(room, centerX, centerY, cornerThreshold, roomTargetScope);
    const gridCornerCandidate = this.getGridCornerSnapCandidate(room, centerX, centerY, cornerThreshold);
    const sideCandidate = this.getSideSnapCandidate(room, centerX, centerY, sideThreshold, roomTargetScope);

    const bestCornerCandidate =
      roomCornerCandidate && gridCornerCandidate
        ? roomCornerCandidate.distance <= gridCornerCandidate.distance
          ? roomCornerCandidate
          : gridCornerCandidate
        : roomCornerCandidate ?? gridCornerCandidate;

    const shouldPreferCorner =
      Boolean(bestCornerCandidate) &&
      (!sideCandidate || bestCornerCandidate!.distance <= sideCandidate.distance + DEFAULT_CORNER_SNAP_PRIORITY_BONUS_MM);

    const snapCandidate = shouldPreferCorner ? bestCornerCandidate : sideCandidate;

    const previewSideThreshold = sideThreshold * SNAP_PREVIEW_MULTIPLIER;
    const previewCornerThreshold = cornerThreshold * SNAP_PREVIEW_MULTIPLIER;
    const previewCandidate =
      snapCandidate ??
      this.getRoomCornerSnapCandidate(room, centerX, centerY, previewCornerThreshold) ??
      this.getGridCornerSnapCandidate(room, centerX, centerY, previewCornerThreshold) ??
      this.getSideSnapCandidate(room, centerX, centerY, previewSideThreshold);

    this.snapPreview = previewCandidate
      ? {
          kind: previewCandidate.kind,
          centerX: previewCandidate.centerX,
          centerY: previewCandidate.centerY,
          fromPoint: previewCandidate.fromPoint,
          toPoint: previewCandidate.toPoint,
          targetRoomId: previewCandidate.targetRoomId,
        }
      : null;

    if (snapCandidate) {
      const threshold = snapCandidate.kind === 'side' ? sideThreshold : cornerThreshold;
      const softenedCenterX = this.applySoftSnap(centerX, snapCandidate.centerX, snapCandidate.distance, threshold);
      const softenedCenterY = this.applySoftSnap(centerY, snapCandidate.centerY, snapCandidate.distance, threshold);

      this.isGridSnappedX = false;
      this.isGridSnappedY = false;
      return {
        centerX: softenedCenterX,
        centerY: softenedCenterY,
        snappedRoomId: snapCandidate.sourceRoomId,
        snapTargetRoomId: snapCandidate.targetRoomId,
      };
    }

    const nextGridX = this.resolveGridAxis(centerX, this.isGridSnappedX);
    const nextGridY = this.resolveGridAxis(centerY, this.isGridSnappedY);
    this.isGridSnappedX = nextGridX.isSnapped;
    this.isGridSnappedY = nextGridY.isSnapped;

    return {
      centerX: nextGridX.value,
      centerY: nextGridY.value,
      snappedRoomId: null,
      snapTargetRoomId: null,
    };
  }

  dragByWorldDelta(delta: WorldPoint): RoomModel | null {
    if (!this.isDragging || !this.activeRoomId) {
      return null;
    }

    const room = this.rooms.find((item) => item.roomId === this.activeRoomId);

    if (!room) {
      this.isDragging = false;
      this.snappedRoomId = null;
      this.snapTargetRoomId = null;
      this.isGridSnappedX = false;
      this.isGridSnappedY = false;
      this.snapPreview = null;
      return null;
    }

    const nextCenterX = room.centerX + delta.x;
    const nextCenterY = room.centerY + delta.y;
    const nextPosition = this.resolveDragPosition(room, nextCenterX, nextCenterY);

    room.centerX = nextPosition.centerX;
    room.centerY = nextPosition.centerY;
    this.snappedRoomId = nextPosition.snappedRoomId;
    this.snapTargetRoomId = nextPosition.snapTargetRoomId;

    return { ...room };
  }

  endDrag() {
    this.isDragging = false;
    this.snappedRoomId = null;
    this.snapTargetRoomId = null;
    this.isGridSnappedX = false;
    this.isGridSnappedY = false;
    this.snapPreview = null;
  }

  isDragActive(): boolean {
    return this.isDragging;
  }

  getSnappedRoomId(): string | null {
    return this.snappedRoomId;
  }

  getSnapTargetRoomId(): string | null {
    return this.snapTargetRoomId;
  }

  getSnapPreview(): RoomSnapPreview {
    return this.snapPreview;
  }
}
