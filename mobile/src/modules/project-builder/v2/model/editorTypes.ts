export type EditorViewMode =
  | 'project'
  | 'room'
  | 'surface';


export type RoomSurface =
  | 'north-wall'
  | 'east-wall'
  | 'south-wall'
  | 'west-wall'
  | 'floor'
  | 'ceiling';


export type EditorState = {
  viewMode: EditorViewMode;

  activeRoomId: string | null;

  activeSurface: RoomSurface | null;
};
