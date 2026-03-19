import { RoomModel, WorldPoint } from './CanvasTypes';

export class RoomTransformSystem {
  private rooms: RoomModel[] = [];
  private activeRoomId: string | null = null;
  private isDragging = false;

  setRooms(rooms: RoomModel[]) {
    this.rooms = rooms;

    if (this.activeRoomId && !this.rooms.some((room) => room.roomId === this.activeRoomId)) {
      this.activeRoomId = null;
      this.isDragging = false;
    }
  }

  setActiveRoomId(roomId: string | null) {
    this.activeRoomId = roomId;

    if (!roomId) {
      this.isDragging = false;
    }
  }

  startDrag(): boolean {
    const canDrag = Boolean(this.activeRoomId && this.rooms.some((room) => room.roomId === this.activeRoomId));
    this.isDragging = canDrag;
    return canDrag;
  }

  dragByWorldDelta(delta: WorldPoint): RoomModel | null {
    if (!this.isDragging || !this.activeRoomId) {
      return null;
    }

    const room = this.rooms.find((item) => item.roomId === this.activeRoomId);

    if (!room) {
      this.isDragging = false;
      return null;
    }

    room.centerX += delta.x;
    room.centerY += delta.y;

    return { ...room };
  }

  endDrag() {
    this.isDragging = false;
  }

  isDragActive(): boolean {
    return this.isDragging;
  }
}
