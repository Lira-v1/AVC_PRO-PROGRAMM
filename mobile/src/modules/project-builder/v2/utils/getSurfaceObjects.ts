import { SceneObject } from '../model/sceneObjects';

export const getSurfaceObjects = (
  sceneObjects: SceneObject[],
  roomId: string,
  surfaceId: string,
) => {
  return sceneObjects.filter(
    (item) => item.roomId === roomId && item.surfaceId === surfaceId,
  );
};
