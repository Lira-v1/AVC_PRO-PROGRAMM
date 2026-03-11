import { useMemo, useState } from 'react';
import { createDefaultRoom, createInitialProject } from '../model/projectBuilderDefaults';
import { getPresetById } from '../model/presets';
import { placeInteriorElement, placeWallBoundElement, recalculateElementBinding } from '../model/placement';
import { createId } from '../utils/ids';
import { ElementNode, ElementType, Project, Room, RoomType, ToolType, ROOM_TYPE_LABELS } from '../types';

const MIN_ROOM_SIZE = 40;
const DUPLICATE_OFFSET = 12;

type RoomDimensions = {
  width: number;
  height: number;
};

type ElementParametersPatch = Pick<ElementNode, 'preset' | 'heightMode' | 'heightValueMm' | 'note'>;

export const useProjectBuilder = () => {
  const [project, setProject] = useState<Project>(() => createInitialProject());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>('select');
  const [isQuickCardOpen, setQuickCardOpen] = useState(false);
  const [isParametersSheetOpen, setParametersSheetOpen] = useState(false);

  const addRoom = () => {
    const nextRoom = createDefaultRoom(project.rooms.length);

    setProject((prevProject) => ({
      ...prevProject,
      rooms: [...prevProject.rooms, nextRoom],
      updatedAt: new Date().toISOString(),
    }));

    setSelectedRoomId(nextRoom.id);
    setSelectedElementId(null);
    setQuickCardOpen(false);
    setParametersSheetOpen(false);
  };

  const selectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setSelectedElementId(null);
    setQuickCardOpen(false);
    setParametersSheetOpen(false);
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
    setProject((prevProject) => {
      const nextRooms = prevProject.rooms.map((room) => (room.id === roomId ? updater(room) : room));
      const nextElements = prevProject.elements
        .map((element) => recalculateElementBinding(nextRooms, element, { x: element.x, y: element.y }))
        .filter(Boolean) as ElementNode[];

      return {
        ...prevProject,
        rooms: nextRooms,
        elements: nextElements,
        updatedAt: new Date().toISOString(),
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
    setProject((prevProject) => ({
      ...prevProject,
      rooms: prevProject.rooms.filter((room) => room.id !== roomId),
      elements: prevProject.elements.filter((el) => el.roomId !== roomId),
      updatedAt: new Date().toISOString(),
    }));

    setSelectedRoomId((currentSelected) => (currentSelected === roomId ? null : currentSelected));
  };

  const addElementAtPoint = (type: ElementType, point: { x: number; y: number }) => {
    setProject((prevProject) => {
      const node = type === 'light_point' ? placeInteriorElement(prevProject.rooms, point, type) : placeWallBoundElement(prevProject.rooms, point, type);
      if (!node) return prevProject;

      return {
        ...prevProject,
        elements: [...prevProject.elements, node],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const moveElement = (elementId: string, x: number, y: number) => {
    setProject((prevProject) => ({
      ...prevProject,
      elements: prevProject.elements
        .map((element) => {
          if (element.id !== elementId) return element;
          return recalculateElementBinding(prevProject.rooms, element, { x, y });
        })
        .filter(Boolean) as ElementNode[],
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateElementParameters = (elementId: string, patch: ElementParametersPatch) => {
    setProject((prevProject) => ({
      ...prevProject,
      elements: prevProject.elements.map((element) => {
        if (element.id !== elementId) return element;

        const preset = patch.preset ?? element.preset;
        const presetSuggestion = getPresetById(element.type, preset);

        return {
          ...element,
          ...patch,
          heightMode: patch.heightMode ?? presetSuggestion?.suggestedHeightMode ?? element.heightMode,
          heightValueMm: patch.heightValueMm ?? presetSuggestion?.suggestedHeightValueMm ?? element.heightValueMm,
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  };

  const duplicateElement = (elementId: string) => {
    let duplicatedId: string | null = null;

    setProject((prevProject) => {
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
        updatedAt: new Date().toISOString(),
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
    setProject((prevProject) => ({
      ...prevProject,
      elements: prevProject.elements.filter((element) => element.id !== elementId),
      updatedAt: new Date().toISOString(),
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
      closeElementPanels();
      return;
    }
    if (tool === 'delete') {
      return;
    }

    addElementAtPoint(tool, point);
  };

  const rooms = useMemo<Room[]>(() => project.rooms, [project.rooms]);
  const elements = useMemo<ElementNode[]>(() => project.elements, [project.elements]);
  const selectedRoom = useMemo<Room | null>(() => rooms.find((room) => room.id === selectedRoomId) ?? null, [rooms, selectedRoomId]);
  const selectedElement = useMemo<ElementNode | null>(() => elements.find((item) => item.id === selectedElementId) ?? null, [elements, selectedElementId]);

  return {
    project,
    rooms,
    elements,
    selectedRoom,
    selectedElement,
    selectedRoomId,
    selectedElementId,
    isQuickCardOpen,
    isParametersSheetOpen,
    tool,
    setTool,
    addRoom,
    selectRoom,
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
  };
};
