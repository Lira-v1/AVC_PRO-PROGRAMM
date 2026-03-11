import { ElementNode } from './types';

export const getElementsByWall = (elements: ElementNode[], roomId: string, wallId: string): ElementNode[] => {
  return elements.filter((element) => element.roomId === roomId && element.wallId === wallId);
};
