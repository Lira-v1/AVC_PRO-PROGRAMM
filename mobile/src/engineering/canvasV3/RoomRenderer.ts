import { CanvasEngine } from './CanvasEngine';
import { DimensionLineScreenGeometry, DimensionLineWorldGeometry, RoomResizeHandleId, RoomResizeHandleScreenGeometry, RoomScreenGeometry, RoomWorldGeometry, ScreenEdge, ScreenPoint } from './CanvasTypes';

const createScreenEdge = (id: string, from: ScreenPoint, to: ScreenPoint): ScreenEdge => {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  return {
    id,
    from,
    to,
    length: Math.hypot(deltaX, deltaY),
    angleDeg: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
    center: {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
    },
  };
};

export class RoomRenderer {
  static toScreenGeometry(engine: CanvasEngine, roomGeometry: RoomWorldGeometry): RoomScreenGeometry {
    const isActive = engine.getActiveRoomId() === roomGeometry.roomId;
    const corners = roomGeometry.corners.map((corner) => engine.worldToScreen(corner));
    const edges = roomGeometry.edges.map((edge) => createScreenEdge(edge.id, engine.worldToScreen(edge.from), engine.worldToScreen(edge.to)));
    const topLeft = engine.worldToScreen({ x: roomGeometry.bounds.minX, y: roomGeometry.bounds.minY });
    const bottomRight = engine.worldToScreen({ x: roomGeometry.bounds.maxX, y: roomGeometry.bounds.maxY });

    return {
      roomId: roomGeometry.roomId,
      isActive,
      rotationDeg: engine.getRoomRotation(roomGeometry.roomId),
      center: engine.worldToScreen(roomGeometry.center),
      corners,
      edges,
      bounds: {
        left: Math.min(topLeft.x, bottomRight.x),
        top: Math.min(topLeft.y, bottomRight.y),
        right: Math.max(topLeft.x, bottomRight.x),
        bottom: Math.max(topLeft.y, bottomRight.y),
        width: Math.abs(bottomRight.x - topLeft.x),
        height: Math.abs(bottomRight.y - topLeft.y),
      },
    };
  }


  static getDimensionLabels(engine: CanvasEngine, labels: DimensionLineWorldGeometry[]): DimensionLineScreenGeometry[] {
    return labels.map((label) => ({
      id: label.id,
      roomId: label.roomId,
      kind: label.kind,
      axis: label.axis,
      formattedValue: label.formattedValue,
      lineFrom: engine.worldToScreen(label.lineFrom),
      lineTo: engine.worldToScreen(label.lineTo),
      textAnchor: engine.worldToScreen(label.textAnchor),
      ticks: [
        {
          from: engine.worldToScreen(label.ticks[0].from),
          to: engine.worldToScreen(label.ticks[0].to),
        },
        {
          from: engine.worldToScreen(label.ticks[1].from),
          to: engine.worldToScreen(label.ticks[1].to),
        },
      ],
    }));
  }

  static getResizeHandles(
    engine: CanvasEngine,
    roomGeometry: RoomWorldGeometry,
    activeHandleId: RoomResizeHandleId | null,
  ): RoomResizeHandleScreenGeometry[] {
    if (engine.getActiveRoomId() !== roomGeometry.roomId) {
      return [];
    }

    const screenGeometry = RoomRenderer.toScreenGeometry(engine, roomGeometry);

    return [{
      roomId: roomGeometry.roomId,
      handleId: 'bottom-right' as RoomResizeHandleId,
      point: {
        x: screenGeometry.bounds.right,
        y: screenGeometry.bounds.bottom,
      },
      isActive: activeHandleId === 'bottom-right',
    }];
  }
}
