import { useMemo, useState } from 'react';
import { createDefaultRoom, createInitialProject } from '../model/projectBuilderDefaults';
import { Project, Room } from '../types';

export const useProjectBuilder = () => {
  const [project, setProject] = useState<Project>(() => createInitialProject());

  const addRoom = () => {
    setProject((prevProject) => {
      const nextRoom = createDefaultRoom(prevProject.rooms.length);

      return {
        ...prevProject,
        rooms: [...prevProject.rooms, nextRoom],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const rooms = useMemo<Room[]>(() => project.rooms, [project.rooms]);

  return {
    project,
    rooms,
    addRoom,
  };
};
