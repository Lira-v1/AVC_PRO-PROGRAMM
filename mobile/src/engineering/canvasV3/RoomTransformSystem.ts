import { RoomModel, WorldBounds, WorldPoint } from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';

const DEFAULT_GRID_STEP_MM = 100;
const DEFAULT_SNAP_THRESHOLD_MM = 140;
const OVERLAP_EPSILON_MM = 0.001;

type SnapResult = {
  centerX: number;
  centerY: number;
  snappedRoomId: string | null;
  snapTargetRoomId: string | null;
};

type SnapCandidate = {
  centerX: number;
  centerY: number;
  sourceRoomId: string;
  targetRoomId: string;
  distance: number;
};

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
  private readonly snapThresholdMm: number;
  private snappedRoomId: string | null = null;
  private snapTargetRoomId: string | null = null;

  constructor(gridStepMm = DEFAULT_GRID_STEP_MM, snapThresholdMm = DEFAULT_SNAP_THRESHOLD_MM) {
    this.gridStepMm = gridStepMm;
    this.snapThresholdMm = snapThresholdMm;
  }

  setRooms(rooms: RoomModel[]) {
    this.rooms = rooms;

    if (this.activeRoomId && !this.rooms.some((room) => room.roomId === this.activeRoomId)) {
      this.activeRoomId = null;
      this.isDragging = false;
    }

    if (this.snapTargetRoomId && !this.rooms.some((room) => room.roomId === this.snapTargetRoomId)) {
      this.snapTargetRoomId = null;
      this.snappedRoomId = null;
    }
  }

  setActiveRoomId(roomId: string | null) {
    this.activeRoomId = roomId;

    if (!roomId) {
      this.isDragging = false;
      this.snappedRoomId = null;
      this.snapTargetRoomId = null;
    }
  }

  startDrag(): boolean {
    const canDrag = Boolean(this.activeRoomId && this.rooms.some((room) => room.roomId === this.activeRoomId));
    this.isDragging = canDrag;

    if (!canDrag) {
      this.snappedRoomId = null;
      this.snapTargetRoomId = null;
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

  private getSnapCandidate(movedRoom: RoomModel, centerX: number, centerY: number): SnapCandidate | null {
    const movedBounds = this.getBoundsWithCenter(movedRoom, centerX, centerY);
    let bestCandidate: SnapCandidate | null = null;

    for (const targetRoom of this.rooms) {
      if (targetRoom.roomId === movedRoom.roomId) {
        continue;
      }

      const targetBounds = RoomGeometry.fromModel(targetRoom).bounds;

      const verticalOverlap = rangesOverlap(movedBounds.minY, movedBounds.maxY, targetBounds.minY, targetBounds.maxY);
      const horizontalOverlap = rangesOverlap(movedBounds.minX, movedBounds.maxX, targetBounds.minX, targetBounds.maxX);

      if (verticalOverlap) {
        const leftToRightDistance = targetBounds.maxX - movedBounds.minX;

        if (Math.abs(leftToRightDistance) <= this.snapThresholdMm) {
          const candidateCenterX = centerX + leftToRightDistance;

          if (this.canPlaceWithoutOverlap(movedRoom, candidateCenterX, centerY)) {
            const candidate: SnapCandidate = {
              centerX: candidateCenterX,
              centerY,
              sourceRoomId: movedRoom.roomId,
              targetRoomId: targetRoom.roomId,
              distance: Math.abs(leftToRightDistance),
            };

            if (!bestCandidate || candidate.distance < bestCandidate.distance) {
              bestCandidate = candidate;
            }
          }
        }

        const rightToLeftDistance = targetBounds.minX - movedBounds.maxX;

        if (Math.abs(rightToLeftDistance) <= this.snapThresholdMm) {
          const candidateCenterX = centerX + rightToLeftDistance;

          if (this.canPlaceWithoutOverlap(movedRoom, candidateCenterX, centerY)) {
            const candidate: SnapCandidate = {
              centerX: candidateCenterX,
              centerY,
              sourceRoomId: movedRoom.roomId,
              targetRoomId: targetRoom.roomId,
              distance: Math.abs(rightToLeftDistance),
            };

            if (!bestCandidate || candidate.distance < bestCandidate.distance) {
              bestCandidate = candidate;
            }
          }
        }
      }

      if (horizontalOverlap) {
        const topToBottomDistance = targetBounds.maxY - movedBounds.minY;

        if (Math.abs(topToBottomDistance) <= this.snapThresholdMm) {
          const candidateCenterY = centerY + topToBottomDistance;

          if (this.canPlaceWithoutOverlap(movedRoom, centerX, candidateCenterY)) {
            const candidate: SnapCandidate = {
              centerX,
              centerY: candidateCenterY,
              sourceRoomId: movedRoom.roomId,
              targetRoomId: targetRoom.roomId,
              distance: Math.abs(topToBottomDistance),
            };

            if (!bestCandidate || candidate.distance < bestCandidate.distance) {
              bestCandidate = candidate;
            }
          }
        }

        const bottomToTopDistance = targetBounds.minY - movedBounds.maxY;

        if (Math.abs(bottomToTopDistance) <= this.snapThresholdMm) {
          const candidateCenterY = centerY + bottomToTopDistance;

          if (this.canPlaceWithoutOverlap(movedRoom, centerX, candidateCenterY)) {
            const candidate: SnapCandidate = {
              centerX,
              centerY: candidateCenterY,
              sourceRoomId: movedRoom.roomId,
              targetRoomId: targetRoom.roomId,
              distance: Math.abs(bottomToTopDistance),
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

  private resolveDragPosition(room: RoomModel, centerX: number, centerY: number): SnapResult {
    const gridAlignedCenterX = snapToStep(centerX, this.gridStepMm);
    const gridAlignedCenterY = snapToStep(centerY, this.gridStepMm);
    const snapCandidate = this.getSnapCandidate(room, gridAlignedCenterX, gridAlignedCenterY);

    if (!snapCandidate) {
      return {
        centerX: gridAlignedCenterX,
        centerY: gridAlignedCenterY,
        snappedRoomId: null,
        snapTargetRoomId: null,
      };
    }

    return {
      centerX: snapCandidate.centerX,
      centerY: snapCandidate.centerY,
      snappedRoomId: snapCandidate.sourceRoomId,
      snapTargetRoomId: snapCandidate.targetRoomId,
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
}
