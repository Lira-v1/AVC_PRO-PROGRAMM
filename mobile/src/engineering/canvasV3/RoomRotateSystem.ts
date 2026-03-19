import { RoomModel } from './CanvasTypes';

const ROTATION_STEP_DEG = 90;
const FULL_ROTATION_DEG = 360;

const normalizeRotation = (rotationDeg: number) => {
  const normalized = rotationDeg % FULL_ROTATION_DEG;

  return normalized >= 0 ? normalized : normalized + FULL_ROTATION_DEG;
};

export class RoomRotateSystem {
  private rooms: RoomModel[] = [];
  private activeRoomId: string | null = null;

  setRooms(rooms: RoomModel[]) {
    this.rooms = rooms;

    if (this.activeRoomId && !this.rooms.some((room) => room.roomId === this.activeRoomId)) {
      this.activeRoomId = null;
    }
  }

  setActiveRoomId(roomId: string | null) {
    this.activeRoomId = roomId;
  }

  rotateActiveRoom(stepDeg = ROTATION_STEP_DEG): RoomModel | null {
    if (!this.activeRoomId) {
      return null;
    }

    const room = this.rooms.find((item) => item.roomId === this.activeRoomId);

    if (!room) {
      return null;
    }

    room.rotationDeg = normalizeRotation(room.rotationDeg + stepDeg);

    return { ...room };
  }
}
