import { RoomModel, WorldBounds, WorldPoint } from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';

const DEFAULT_GRID_STEP_MM = 100;
const DEFAULT_ROOM_SNAP_ENTER_THRESHOLD_MM = 80;
const DEFAULT_ROOM_SNAP_RELEASE_THRESHOLD_MM = 110;
const DEFAULT_GRID_SNAP_ENTER_THRESHOLD_MM = 35;
const DEFAULT_GRID_SNAP_RELEASE_THRESHOLD_MM = 55;
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
  private readonly roomSnapEnterThresholdMm: number;
  private readonly roomSnapReleaseThresholdMm: number;
  private readonly gridSnapEnterThresholdMm: number;
  private readonly gridSnapReleaseThresholdMm: number;
  private snappedRoomId: string | null = null;
  private snapTargetRoomId: string | null = null;
  private isGridSnappedX = false;
  private isGridSnappedY = false;

  constructor(
    gridStepMm = DEFAULT_GRID_STEP_MM,
    roomSnapEnterThresholdMm = DEFAULT_ROOM_SNAP_ENTER_THRESHOLD_MM,
    roomSnapReleaseThresholdMm = DEFAULT_ROOM_SNAP_RELEASE_THRESHOLD_MM,
    gridSnapEnterThresholdMm = DEFAULT_GRID_SNAP_ENTER_THRESHOLD_MM,
    gridSnapReleaseThresholdMm = DEFAULT_GRID_SNAP_RELEASE_THRESHOLD_MM,
  ) {
    this.gridStepMm = gridStepMm;
    this.roomSnapEnterThresholdMm = roomSnapEnterThresholdMm;
    this.roomSnapReleaseThresholdMm = Math.max(roomSnapEnterThresholdMm, roomSnapReleaseThresholdMm);
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
    }

    if (this.snapTargetRoomId && !this.rooms.some((room) => room.roomId === this.snapTargetRoomId)) {
      this.snapTargetRoomId = null;
      this.snappedRoomId = null;
      this.isGridSnappedX = false;
      this.isGridSnappedY = false;
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

  private getSnapCandidate(
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

        if (Math.abs(rightToLeftDistance) <= thresholdMm) {
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

        if (Math.abs(topToBottomDistance) <= thresholdMm) {
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

        if (Math.abs(bottomToTopDistance) <= thresholdMm) {
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

  private resolveGridAxis(value: number, isSnapped: boolean): { value: number; isSnapped: boolean } {
    const snappedValue = snapToStep(value, this.gridStepMm);
    const distanceToGrid = Math.abs(value - snappedValue);
    const threshold = isSnapped ? this.gridSnapReleaseThresholdMm : this.gridSnapEnterThresholdMm;

    if (distanceToGrid <= threshold) {
      return { value: snappedValue, isSnapped: true };
    }

    return { value, isSnapped: false };
  }

  private resolveDragPosition(room: RoomModel, centerX: number, centerY: number): SnapResult {
    const snapCandidate =
      (this.snapTargetRoomId
        ? this.getSnapCandidate(room, centerX, centerY, this.roomSnapReleaseThresholdMm, this.snapTargetRoomId)
        : null) ?? this.getSnapCandidate(room, centerX, centerY, this.roomSnapEnterThresholdMm);

    if (snapCandidate) {
      this.isGridSnappedX = false;
      this.isGridSnappedY = false;
      return {
        centerX: snapCandidate.centerX,
        centerY: snapCandidate.centerY,
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
