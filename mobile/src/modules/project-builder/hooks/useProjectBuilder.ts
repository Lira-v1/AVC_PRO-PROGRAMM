import { useMemo, useState } from 'react';
import { createDefaultRoom, createInitialProject } from '../model/projectBuilderDefaults';
import { placeInteriorElement, placeWallBoundElement, recalculateElementBinding } from '../model/placement';
import { ElementNode, ElementType, Project, Room, RoomType, ToolType, ROOM_TYPE_LABELS } from '../types';

const MIN_ROOM_SIZE = 40;

type RoomDimensions = {
  width: number;
  height: number;
};

export const useProjectBuilder = () => {
  const [project, setProject] = useState<Project>(() => createInitialProject());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>('select');

  const addRoom = () => {
    const nextRoom = createDefaultRoom(project.rooms.length);

    setProject((prevProject) => ({
      ...prevProject,
      rooms: [...prevProject.rooms, nextRoom],
      updatedAt: new Date().toISOString(),
    }));

    setSelectedRoomId(nextRoom.id);
    setSelectedElementId(null);
  };

  const selectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setSelectedElementId(null);
  };

  const selectElement = (elementId: string) => {
    setSelectedElementId(elementId);
    setSelectedRoomId(null);
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

  const deleteElement = (elementId: string) => {
    setProject((prevProject) => ({
      ...prevProject,
      elements: prevProject.elements.filter((element) => element.id !== elementId),
      updatedAt: new Date().toISOString(),
    }));
    setSelectedElementId((current) => (current === elementId ? null : current));
  };

  const handleCanvasTap = (point: { x: number; y: number }) => {
    if (tool === 'select') {
      setSelectedRoomId(null);
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

  return {
    project,
    rooms,
    elements,
    selectedRoom,
    selectedRoomId,
    selectedElementId,
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
    handleCanvasTap,
  };
};
