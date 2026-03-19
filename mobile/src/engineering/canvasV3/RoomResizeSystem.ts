import { RoomModel, RoomResizeHandleId, WorldPoint } from './CanvasTypes';

type ResizeSession = {
  handleId: RoomResizeHandleId;
};

const MIN_WIDTH_MM = 400;
const MIN_HEIGHT_MM = 400;
const ZERO_ROTATION_EPSILON = 0.001;

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

    if (!room || Math.abs(room.rotationDeg) > ZERO_ROTATION_EPSILON) {
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

    const halfWidth = room.widthMm / 2;
    const halfHeight = room.heightMm / 2;
    let left = room.centerX - halfWidth;
    let right = room.centerX + halfWidth;
    let top = room.centerY - halfHeight;
    let bottom = room.centerY + halfHeight;

    switch (this.session.handleId) {
      case 'top-left':
        left += delta.x;
        top += delta.y;
        break;
      case 'top-right':
        right += delta.x;
        top += delta.y;
        break;
      case 'bottom-right':
        right += delta.x;
        bottom += delta.y;
        break;
      case 'bottom-left':
        left += delta.x;
        bottom += delta.y;
        break;
    }

    if (right - left < MIN_WIDTH_MM) {
      if (this.session.handleId === 'top-left' || this.session.handleId === 'bottom-left') {
        left = right - MIN_WIDTH_MM;
      } else {
        right = left + MIN_WIDTH_MM;
      }
    }

    if (bottom - top < MIN_HEIGHT_MM) {
      if (this.session.handleId === 'top-left' || this.session.handleId === 'top-right') {
        top = bottom - MIN_HEIGHT_MM;
      } else {
        bottom = top + MIN_HEIGHT_MM;
      }
    }

    room.centerX = (left + right) / 2;
    room.centerY = (top + bottom) / 2;
    room.widthMm = right - left;
    room.heightMm = bottom - top;

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
}
