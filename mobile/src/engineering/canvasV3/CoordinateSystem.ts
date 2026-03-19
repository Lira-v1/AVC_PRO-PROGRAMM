import { CameraSystem } from './CameraSystem';
import { ScreenPoint, Viewport, WorldPoint } from './CanvasTypes';

export class CoordinateSystem {
  static screenDeltaToWorldDelta(camera: CameraSystem, delta: ScreenPoint): WorldPoint {
    const zoom = camera.getState().zoom;

    return {
      x: delta.x / zoom,
      y: delta.y / zoom,
    };
  }

  static worldToScreen(camera: CameraSystem, point: WorldPoint, viewport: Viewport): ScreenPoint {
    return camera.worldToScreen(point, viewport);
  }

  static screenToWorld(camera: CameraSystem, point: ScreenPoint, viewport: Viewport): WorldPoint {
    return camera.screenToWorld(point, viewport);
  }
}
