import { RoomModel, RoomResizeHandleId, WorldPoint } from './CanvasTypes';

type ResizeSession = {
  handleId: RoomResizeHandleId;
};

const MIN_WIDTH_MM = 400;
const MIN_HEIGHT_MM = 400;
const FULL_ROTATION_DEG = 360;
const QUADRANT_STEP_DEG = 90;

const normalizeRotation = (rotationDeg: number) => {
  const normalized = rotationDeg % FULL_ROTATION_DEG;

  return normalized >= 0 ? normalized : normalized + FULL_ROTATION_DEG;
};

const getOrthogonalQuadrant = (rotationDeg: number): 0 | 1 | 2 | 3 => {
  const normalized = normalizeRotation(rotationDeg);
  const quadrant = Math.round(normalized / QUADRANT_STEP_DEG) % 4;

  return quadrant as 0 | 1 | 2 | 3;
};

export class RoomResizeSystem {
  private rooms: RoomModel[] = [];
  private activeRoomId: string | null = null;
  private session: ResizeSession | null = null;

  setRooms(rooms: RoomModel[]) {
    this.rooms = rooms;

    if (this.activeRoomId && !this.rooms.some((room) => room.roomId === this.activeRoomId)) {
      this.activeRoomId = null;
      this.session = null;
    }
  }

  setActiveRoomId(roomId: string | null) {
    this.activeRoomId = roomId;

    if (!roomId) {
      this.session = null;
    }
  }

  startResize(handleId: RoomResizeHandleId): boolean {
    const room = this.getActiveRoom();

    if (!room) {
      this.session = null;
      return false;
    }

    this.session = { handleId };
    return true;
  }

  resizeByWorldDelta(delta: WorldPoint): RoomModel | null {
    if (!this.session) {
      return null;
    }

    const room = this.getActiveRoom();

    if (!room) {
      this.session = null;
      return null;
    }

    // Resize must remain invariant in screen/world axes.
    // For orthogonal room rotations the visible horizontal/vertical bounds map to
    // different underlying room dimensions, so we remap drag deltas back to the
    // stable base model instead of accumulating errors from the rotated state.
    const handleSigns = this.getHandleSigns(this.session.handleId);
    const quadrant = getOrthogonalQuadrant(room.rotationDeg);
    const usesSwappedAxes = quadrant === 1 || quadrant === 3;
    const horizontalField = usesSwappedAxes ? 'heightMm' : 'widthMm';
    const verticalField = usesSwappedAxes ? 'widthMm' : 'heightMm';

    const currentHorizontalSize = room[horizontalField];
    const currentVerticalSize = room[verticalField];
    const nextHorizontalSize = Math.max(MIN_WIDTH_MM, currentHorizontalSize + delta.x * handleSigns.x);
    const nextVerticalSize = Math.max(MIN_HEIGHT_MM, currentVerticalSize + delta.y * handleSigns.y);
    const horizontalDelta = nextHorizontalSize - currentHorizontalSize;
    const verticalDelta = nextVerticalSize - currentVerticalSize;

    room.centerX += (horizontalDelta / 2) * handleSigns.x;
    room.centerY += (verticalDelta / 2) * handleSigns.y;
    room[horizontalField] = nextHorizontalSize;
    room[verticalField] = nextVerticalSize;

    return { ...room };
  }

  endResize() {
    this.session = null;
  }

  isResizeActive(): boolean {
    return this.session !== null;
  }

  getActiveHandleId(): RoomResizeHandleId | null {
    return this.session?.handleId ?? null;
  }

  private getActiveRoom(): RoomModel | null {
    return this.rooms.find((room) => room.roomId === this.activeRoomId) ?? null;
  }

  private getHandleSigns(handleId: RoomResizeHandleId): { x: -1 | 1; y: -1 | 1 } {
    switch (handleId) {
      case 'top-left':
        return { x: -1, y: -1 };
      case 'top-right':
        return { x: 1, y: -1 };
      case 'bottom-left':
        return { x: -1, y: 1 };
      case 'bottom-right':
      default:
        return { x: 1, y: 1 };
    }
  }
}
