import { RoomModel, WorldPoint } from './CanvasTypes';
import { RoomGeometry } from './RoomGeometry';

export class RoomSelectionSystem {
  private rooms: RoomModel[] = [];
  private activeRoomId: string | null = null;

  setRooms(rooms: RoomModel[]) {
    this.rooms = [...rooms];

    if (this.activeRoomId && !this.rooms.some((room) => room.roomId === this.activeRoomId)) {
      this.activeRoomId = null;
    }
  }

  getRooms(): RoomModel[] {
    return [...this.rooms];
  }

  getActiveRoomId(): string | null {
    return this.activeRoomId;
  }

  getActiveRoom(): RoomModel | null {
    return this.rooms.find((room) => room.roomId === this.activeRoomId) ?? null;
  }

  selectRoom(roomId: string): string | null {
    const room = this.rooms.find((item) => item.roomId === roomId);
    this.activeRoomId = room?.roomId ?? null;

    return this.activeRoomId;
  }

  clearSelection(): string | null {
    this.activeRoomId = null;
    return this.activeRoomId;
  }

  selectRoomAt(worldPoint: WorldPoint): string | null {
    const room = [...this.rooms].reverse().find((item) => RoomGeometry.containsPoint(item, worldPoint));

    if (!room) {
      return this.clearSelection();
    }

    return this.selectRoom(room.roomId);
  }
}
