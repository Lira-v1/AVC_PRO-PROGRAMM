import { useMemo, useState } from 'react';
import { exportToEstimateDraft } from '../model/export';
import { CARDINAL_DIRECTIONS } from '../model/orientation';
import { applyElementOffsetToWall, placeInteriorElement, placeWallBoundElement, recalculateElementBinding } from '../model/placement';
import { createDefaultRoom, createInitialProject } from '../model/projectBuilderDefaults';
import { getPresetById } from '../model/presets';
import { buildProjectSummary } from '../model/summary';
import { getDefaultElementWidthMm, validateWallPlacement } from '../model/wallGeometry';
import { getRoomWalls } from '../model/walls';
import { createId } from '../utils/ids';
import { RoomViewMode } from '../model/roomViewMode';
import { ElementNode, ElementType, EstimateDraftPayload, Project, Room, RoomType, ToolType, Wall, ROOM_TYPE_LABELS } from '../types';

const MIN_ROOM_SIZE = 40;
const DUPLICATE_OFFSET = 12;

type RoomDimensions = {
  width: number;
  height: number;
};

type ElementParametersPatch = Pick<ElementNode, 'preset' | 'heightMode' | 'heightValueMm' | 'note' | 'offsetMm' | 'widthMm'>;

const applyProjectUpdate = (project: Project, patch: Partial<Project>): Project => {
  const nextProject = {
    ...project,
    ...patch,
  };

  const summary = buildProjectSummary(nextProject.elements, nextProject.rooms);
  const hasStructure = nextProject.rooms.length > 0;
  const hasElements = nextProject.elements.length > 0;

  const derivedStatus = hasStructure && hasElements ? 'formed' : 'draft';

  return {
    ...nextProject,
    summary,
    status: derivedStatus,
    updatedAt: new Date().toISOString(),
  };
};

export const useProjectBuilder = () => {
  const [project, setProject] = useState<Project>(() => createInitialProject());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>('select');
  const [isQuickCardOpen, setQuickCardOpen] = useState(false);
  const [isParametersSheetOpen, setParametersSheetOpen] = useState(false);
  const [isRoomFocusMode, setRoomFocusMode] = useState(false);
  const [roomViewMode, setRoomViewMode] = useState<RoomViewMode>('plan');
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [isSummaryOpen, setSummaryOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [estimateDraftPayload, setEstimateDraftPayload] = useState<EstimateDraftPayload | null>(null);

  const updateProject = (updater: (prevProject: Project) => Project) => {
    setProject((prevProject) => {
      const nextProject = updater(prevProject);
      if (nextProject === prevProject) return prevProject;
      return applyProjectUpdate(nextProject, {});
    });
  };

  const addRoom = () => {
    const nextRoom = createDefaultRoom(project.rooms.length);

    updateProject((prevProject) => ({
      ...prevProject,
      rooms: [...prevProject.rooms, nextRoom],
    }));

    setSelectedRoomId(nextRoom.id);
    setSelectedElementId(null);
    setQuickCardOpen(false);
    setParametersSheetOpen(false);
  };

  const selectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setSelectedWallId(null);
    setSelectedElementId(null);
    setQuickCardOpen(false);
    setParametersSheetOpen(false);
  };

  const enterRoomFocus = (roomId: string) => {
    selectRoom(roomId);
    setRoomFocusMode(true);
    setRoomViewMode('plan');
    setSelectedWallId(null);
  };

  const exitRoomFocus = () => {
    setRoomFocusMode(false);
    setRoomViewMode('plan');
    setSelectedWallId(null);
  };

  const switchRoomViewMode = (mode: RoomViewMode) => {
    setRoomViewMode(mode);

    if (mode !== 'walls') {
      setSelectedWallId(null);
      return;
    }

    if (!selectedRoom) return;
    const firstWall = CARDINAL_DIRECTIONS
      .map((cardinal) => getRoomWalls(selectedRoom).find((wall) => wall.cardinal === cardinal) ?? null)
      .find(Boolean);

    setSelectedWallId((current) => current ?? firstWall?.id ?? null);
  };

  const selectWall = (wallId: string) => {
    setSelectedWallId(wallId);
  };

  const selectElement = (elementId: string) => {
    setSelectedElementId(elementId);
    setSelectedRoomId(null);
    setQuickCardOpen(true);
    setParametersSheetOpen(false);
  };

  const closeElementPanels = () => {
    setQuickCardOpen(false);
    setParametersSheetOpen(false);
  };

  const openParametersSheet = () => {
    if (!selectedElementId) return;
    setParametersSheetOpen(true);
    setQuickCardOpen(false);
  };

  const closeParametersSheet = () => {
    setParametersSheetOpen(false);
    if (selectedElementId) {
      setQuickCardOpen(true);
    }
  };

  const updateRoom = (roomId: string, updater: (room: Room) => Room) => {
    updateProject((prevProject) => {
      const nextRooms = prevProject.rooms.map((room) => (room.id === roomId ? updater(room) : room));
      const nextElements = prevProject.elements
        .map((element) => recalculateElementBinding(nextRooms, element, { x: element.x, y: element.y }))
        .filter(Boolean) as ElementNode[];

      return {
        ...prevProject,
        rooms: nextRooms,
        elements: nextElements,
      };
    });
  };

  const moveRoom = (roomId: string, x: number, y: number) => {
    updateRoom(roomId, (room) => ({ ...room, x: Math.max(0, x), y: Math.max(0, y) }));
  };

  const resizeRoom = (roomId: string, width: number, height: number) => {
    updateRoom(roomId, (room) => ({ ...room, width: Math.max(MIN_ROOM_SIZE, width), height: Math.max(MIN_ROOM_SIZE, height) }));
  };

  const setRoomType = (roomId: string, type: RoomType) => {
    updateRoom(roomId, (room) => ({ ...room, type, name: ROOM_TYPE_LABELS[type] }));
  };

  const setRoomDimensions = (roomId: string, dimensions: RoomDimensions) => {
    resizeRoom(roomId, dimensions.width, dimensions.height);
  };

  const removeRoom = (roomId: string) => {
    updateProject((prevProject) => ({
      ...prevProject,
      rooms: prevProject.rooms.filter((room) => room.id !== roomId),
      elements: prevProject.elements.filter((el) => el.roomId !== roomId),
    }));

    setSelectedRoomId((currentSelected) => (currentSelected === roomId ? null : currentSelected));
  };

  const addElementAtPoint = (type: ElementType, point: { x: number; y: number }) => {
    updateProject((prevProject) => {
      const node =
        type === 'light_point' ? placeInteriorElement(prevProject.rooms, point, type) : placeWallBoundElement(prevProject.rooms, prevProject.elements, point, type);
      if (!node) return prevProject;

      return {
        ...prevProject,
        elements: [...prevProject.elements, node],
      };
    });
  };

  const moveElement = (elementId: string, x: number, y: number) => {
    updateProject((prevProject) => {
      const nextElements = prevProject.elements
        .map((element) => {
          if (element.id !== elementId) return element;
          const rebound = recalculateElementBinding(prevProject.rooms, element, { x, y });
          if (!rebound || rebound.type === 'light_point' || !rebound.wallId) return rebound;

          const wall = prevProject.rooms
            .flatMap((room) => getRoomWalls(room))
            .find((roomWall) => roomWall.id === rebound.wallId && roomWall.roomId === rebound.roomId);

          if (!wall) return element;

          const wallElements = prevProject.elements.filter((item) => item.id !== element.id && item.roomId === rebound.roomId && item.wallId === rebound.wallId);
          return validateWallPlacement(rebound, wall, wallElements).valid ? rebound : element;
        })
        .filter(Boolean) as ElementNode[];

      return {
        ...prevProject,
        elements: nextElements,
      };
    });
  };

  const updateElementParameters = (elementId: string, patch: ElementParametersPatch) => {
    updateProject((prevProject) => ({
      ...prevProject,
      elements: prevProject.elements.map((element) => {
        if (element.id !== elementId) return element;

        const preset = patch.preset ?? element.preset;
        const presetSuggestion = getPresetById(element.type, preset);

        const nextElement: ElementNode = {
          ...element,
          ...patch,
          widthMm: patch.widthMm ?? element.widthMm ?? getDefaultElementWidthMm(element.type),
          heightMode: patch.heightMode ?? presetSuggestion?.suggestedHeightMode ?? element.heightMode,
          heightValueMm: patch.heightValueMm ?? presetSuggestion?.suggestedHeightValueMm ?? element.heightValueMm,
        };

        if (typeof patch.offsetMm === 'number' && element.wallId && element.roomId) {
          const wall = prevProject.rooms
            .flatMap((room) => getRoomWalls(room))
            .find((roomWall) => roomWall.id === element.wallId && roomWall.roomId === element.roomId);

          if (wall) {
            const positioned = applyElementOffsetToWall(nextElement, wall, patch.offsetMm);
            const wallElements = prevProject.elements.filter((item) => item.id !== element.id && item.roomId === element.roomId && item.wallId === element.wallId);
            return validateWallPlacement(positioned, wall, wallElements).valid ? positioned : element;
          }
        }

        if (nextElement.wallId && nextElement.roomId) {
          const wall = prevProject.rooms
            .flatMap((room) => getRoomWalls(room))
            .find((roomWall) => roomWall.id === nextElement.wallId && roomWall.roomId === nextElement.roomId);
          if (wall) {
            const wallElements = prevProject.elements.filter((item) => item.id !== element.id && item.roomId === nextElement.roomId && item.wallId === nextElement.wallId);
            return validateWallPlacement(nextElement, wall, wallElements).valid ? nextElement : element;
          }
        }

        return nextElement;
      }),
    }));
  };

  const duplicateElement = (elementId: string) => {
    let duplicatedId: string | null = null;

    updateProject((prevProject) => {
      const source = prevProject.elements.find((element) => element.id === elementId);
      if (!source) {
        return prevProject;
      }

      duplicatedId = createId('el');
      const copy: ElementNode = {
        ...source,
        id: duplicatedId,
        x: source.x + DUPLICATE_OFFSET,
        y: source.y + DUPLICATE_OFFSET,
      };

      const boundCopy = recalculateElementBinding(prevProject.rooms, copy, { x: copy.x, y: copy.y });
      if (!boundCopy) {
        return prevProject;
      }

      return {
        ...prevProject,
        elements: [...prevProject.elements, boundCopy],
      };
    });

    if (duplicatedId) {
      setSelectedElementId(duplicatedId);
      setSelectedRoomId(null);
      setQuickCardOpen(true);
      setParametersSheetOpen(false);
    }
  };

  const deleteElement = (elementId: string) => {
    updateProject((prevProject) => ({
      ...prevProject,
      elements: prevProject.elements.filter((element) => element.id !== elementId),
    }));

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
      setQuickCardOpen(false);
      setParametersSheetOpen(false);
    }
  };

  const handleCanvasTap = (point: { x: number; y: number }) => {
    if (tool === 'select') {
      setSelectedRoomId(null);
      setSelectedElementId(null);
      closeElementPanels();
      return;
    }
    if (tool === 'delete') {
      return;
    }

    addElementAtPoint(tool, point);
  };

  const saveProject = () => {
    setLastSavedAt(new Date().toISOString());
  };

  const prepareEstimateDraft = () => {
    setProject((prevProject) => {
      const payload = exportToEstimateDraft(prevProject);
      setEstimateDraftPayload(payload);
      return {
        ...prevProject,
        status: 'ready_for_estimate',
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const rooms = useMemo<Room[]>(() => project.rooms, [project.rooms]);
  const elements = useMemo<ElementNode[]>(() => project.elements, [project.elements]);
  const selectedRoom = useMemo<Room | null>(() => rooms.find((room) => room.id === selectedRoomId) ?? null, [rooms, selectedRoomId]);
  const selectedRoomWalls = useMemo<Wall[]>(() => (selectedRoom ? getRoomWalls(selectedRoom) : []), [selectedRoom]);
  const selectedWall = useMemo<Wall | null>(() => selectedRoomWalls.find((wall) => wall.id === selectedWallId) ?? null, [selectedRoomWalls, selectedWallId]);
  const selectedElement = useMemo<ElementNode | null>(() => elements.find((item) => item.id === selectedElementId) ?? null, [elements, selectedElementId]);

  const displayedRooms = useMemo(() => (isRoomFocusMode && selectedRoom ? [selectedRoom] : rooms), [isRoomFocusMode, rooms, selectedRoom]);
  const displayedElements = useMemo(
    () => (isRoomFocusMode && selectedRoom ? elements.filter((element) => element.roomId === selectedRoom.id) : elements),
    [elements, isRoomFocusMode, selectedRoom],
  );

  return {
    project,
    rooms,
    elements,
    displayedRooms,
    displayedElements,
    selectedRoom,
    selectedElement,
    selectedRoomId,
    selectedElementId,
    isRoomFocusMode,
    roomViewMode,
    selectedWallId,
    selectedRoomWalls,
    selectedWall,
    isSummaryOpen,
    lastSavedAt,
    estimateDraftPayload,
    isQuickCardOpen,
    isParametersSheetOpen,
    tool,
    setTool,
    addRoom,
    selectRoom,
    enterRoomFocus,
    exitRoomFocus,
    switchRoomViewMode,
    selectWall,
    openSummary: () => setSummaryOpen(true),
    closeSummary: () => setSummaryOpen(false),
    moveRoom,
    resizeRoom,
    setRoomType,
    setRoomDimensions,
    removeRoom,
    selectElement,
    moveElement,
    deleteElement,
    duplicateElement,
    updateElementParameters,
    openParametersSheet,
    closeParametersSheet,
    closeElementPanels,
    handleCanvasTap,
    saveProject,
    prepareEstimateDraft,
  };
};
