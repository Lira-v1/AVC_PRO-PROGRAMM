import { RoomModel, RoomResizeHandleId, WorldPoint } from './CanvasTypes';

type ResizeSession = {
  handleId: RoomResizeHandleId;
};

const MIN_WIDTH_MM = 400;
const MIN_HEIGHT_MM = 400;

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

    // Resize must stay stable in screen/world axes so rotation only affects room geometry,
    // not the user's drag direction expectations in the overlay.
    const handleSigns = this.getHandleSigns(this.session.handleId);
    const nextWidth = Math.max(MIN_WIDTH_MM, room.widthMm + delta.x * handleSigns.x);
    const nextHeight = Math.max(MIN_HEIGHT_MM, room.heightMm + delta.y * handleSigns.y);
    const widthDelta = nextWidth - room.widthMm;
    const heightDelta = nextHeight - room.heightMm;
    const worldCenterShift = {
      x: (widthDelta / 2) * handleSigns.x,
      y: (heightDelta / 2) * handleSigns.y,
    };

    room.centerX += worldCenterShift.x;
    room.centerY += worldCenterShift.y;
    room.widthMm = nextWidth;
    room.heightMm = nextHeight;

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
