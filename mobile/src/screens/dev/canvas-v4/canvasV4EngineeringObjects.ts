import { clampToRange } from './canvasV4Geometry';
import type { ProjectedOpening, WallPlane } from './canvasV4WallUnwrap';

export type EngineeringObjectType = 'socket' | 'switch' | 'light';
export type EngineeringObjectCategory = 'electrical' | 'lighting';
export type EngineeringObjectPlacementMode = EngineeringObjectType | 'none';

export type EngineeringObject = {
  objectId: string;
  objectType: EngineeringObjectType;
  category: EngineeringObjectCategory;
  roomId: string;
  wallPlaneId: string;
  localX: number;
  localY: number;
  width: number;
  height: number;
  rotation: number;
  metadata: Record<string, string | number | boolean | null>;
};

export type EngineeringObjectGraph = {
  objects: EngineeringObject[];
  objectCount: number;
  objectsByRoom: Record<string, EngineeringObject[]>;
  objectsByWallPlane: Record<string, EngineeringObject[]>;
  socketCount: number;
  switchCount: number;
  lightCount: number;
};

export type EngineeringObjectDefaults = Record<EngineeringObjectType, {
  category: EngineeringObjectCategory;
  width: number;
  height: number;
  defaultLocalY: number;
  label: string;
  symbol: string;
}>;

export const DEFAULT_SOCKET_SIZE_MM = 80;
export const DEFAULT_SWITCH_SIZE_MM = 80;
export const DEFAULT_LIGHT_SIZE_MM = 120;
export const DEFAULT_SOCKET_LOCAL_Y_MM = 300;
export const DEFAULT_SWITCH_LOCAL_Y_MM = 900;
export const DEFAULT_LIGHT_CEILING_GAP_MM = 180;
export const ENGINEERING_OBJECT_OPENING_CLEARANCE_MM = 40;

export const ENGINEERING_OBJECT_OPTIONS: EngineeringObjectType[] = ['socket', 'switch', 'light'];

export const createEngineeringObjectDefaults = (defaultRoomHeightMm: number): EngineeringObjectDefaults => ({
  socket: { category: 'electrical', width: DEFAULT_SOCKET_SIZE_MM, height: DEFAULT_SOCKET_SIZE_MM, defaultLocalY: DEFAULT_SOCKET_LOCAL_Y_MM, label: 'Socket', symbol: 'S' },
  switch: { category: 'electrical', width: DEFAULT_SWITCH_SIZE_MM, height: DEFAULT_SWITCH_SIZE_MM, defaultLocalY: DEFAULT_SWITCH_LOCAL_Y_MM, label: 'Switch', symbol: 'I' },
  light: { category: 'lighting', width: DEFAULT_LIGHT_SIZE_MM, height: DEFAULT_LIGHT_SIZE_MM, defaultLocalY: defaultRoomHeightMm - DEFAULT_LIGHT_CEILING_GAP_MM, label: 'Light', symbol: 'L' },
});

export const createEngineeringObjectGraph = (
  objects: EngineeringObject[],
  wallPlaneIdAliases: Record<string, string> = {},
): EngineeringObjectGraph => {
  const objectsByRoom: Record<string, EngineeringObject[]> = {};
  const objectsByWallPlane: Record<string, EngineeringObject[]> = {};
  const canonicalObjects = objects.map((object) => ({
    ...object,
    wallPlaneId: wallPlaneIdAliases[object.wallPlaneId] ?? object.wallPlaneId,
  }));

  canonicalObjects.forEach((object) => {
    objectsByRoom[object.roomId] = [...(objectsByRoom[object.roomId] ?? []), object];
    objectsByWallPlane[object.wallPlaneId] = [...(objectsByWallPlane[object.wallPlaneId] ?? []), object];
  });

  return {
    objects: canonicalObjects.map((object) => ({ ...object, metadata: { ...object.metadata } })),
    objectCount: canonicalObjects.length,
    objectsByRoom,
    objectsByWallPlane,
    socketCount: canonicalObjects.filter((object) => object.objectType === 'socket').length,
    switchCount: canonicalObjects.filter((object) => object.objectType === 'switch').length,
    lightCount: canonicalObjects.filter((object) => object.objectType === 'light').length,
  };
};

export const getEngineeringObjectRect = (object: Pick<EngineeringObject, 'localX' | 'localY' | 'width' | 'height'>) => ({
  left: object.localX - object.width / 2,
  right: object.localX + object.width / 2,
  bottom: object.localY - object.height / 2,
  top: object.localY + object.height / 2,
});

export const getProjectedOpeningRect = (opening: ProjectedOpening, clearance = 0) => ({
  left: opening.localX - opening.width / 2 - clearance,
  right: opening.localX + opening.width / 2 + clearance,
  bottom: opening.sillHeight - clearance,
  top: opening.sillHeight + opening.height + clearance,
});

const wallPlaneRectsOverlap = (
  first: { left: number; right: number; bottom: number; top: number },
  second: { left: number; right: number; bottom: number; top: number },
) => first.left < second.right && first.right > second.left && first.bottom < second.top && first.top > second.bottom;

const isEngineeringObjectInsideWallPlane = (object: EngineeringObject, wallPlane: WallPlane) => {
  const rect = getEngineeringObjectRect(object);

  return rect.left >= 0 && rect.right <= wallPlane.width && rect.bottom >= 0 && rect.top <= wallPlane.height;
};

const hasEngineeringObjectOpeningCollision = (object: EngineeringObject, wallPlane: WallPlane) => {
  const objectRect = getEngineeringObjectRect(object);

  return wallPlane.projectedOpenings.some((opening) => wallPlaneRectsOverlap(
    objectRect,
    getProjectedOpeningRect(opening, ENGINEERING_OBJECT_OPENING_CLEARANCE_MM),
  ));
};

export const constrainEngineeringObjectToWallPlane = (
  object: EngineeringObject,
  wallPlane: WallPlane,
  fallbackObject?: EngineeringObject,
) => {
  const clampCandidate = (candidate: EngineeringObject): EngineeringObject => ({
    ...candidate,
    localX: clampToRange(candidate.localX, candidate.width / 2, Math.max(candidate.width / 2, wallPlane.width - candidate.width / 2)),
    localY: clampToRange(candidate.localY, candidate.height / 2, Math.max(candidate.height / 2, wallPlane.height - candidate.height / 2)),
  });
  const baseCandidate = clampCandidate(object);
  const candidates: EngineeringObject[] = [baseCandidate];

  wallPlane.projectedOpenings.forEach((opening) => {
    const openingRect = getProjectedOpeningRect(opening, ENGINEERING_OBJECT_OPENING_CLEARANCE_MM);

    candidates.push(
      clampCandidate({ ...baseCandidate, localX: openingRect.left - baseCandidate.width / 2 }),
      clampCandidate({ ...baseCandidate, localX: openingRect.right + baseCandidate.width / 2 }),
      clampCandidate({ ...baseCandidate, localY: openingRect.bottom - baseCandidate.height / 2 }),
      clampCandidate({ ...baseCandidate, localY: openingRect.top + baseCandidate.height / 2 }),
    );
  });

  const validCandidates = candidates.filter((candidate) => (
    isEngineeringObjectInsideWallPlane(candidate, wallPlane) &&
    !hasEngineeringObjectOpeningCollision(candidate, wallPlane)
  ));

  if (validCandidates.length === 0) {
    return fallbackObject ?? null;
  }

  return validCandidates.sort((first, second) => (
    Math.hypot(first.localX - object.localX, first.localY - object.localY) -
    Math.hypot(second.localX - object.localX, second.localY - object.localY)
  ))[0];
};
