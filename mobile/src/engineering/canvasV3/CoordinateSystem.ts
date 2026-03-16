import { CameraSystem } from './CameraSystem';
import { ScreenPoint, Viewport, WorldPoint } from './CanvasTypes';

export class CoordinateSystem {
  static worldToScreen(camera: CameraSystem, point: WorldPoint, viewport: Viewport): ScreenPoint {
    return camera.worldToScreen(point, viewport);
  }

  static screenToWorld(camera: CameraSystem, point: ScreenPoint, viewport: Viewport): WorldPoint {
    return camera.screenToWorld(point, viewport);
  }
}
