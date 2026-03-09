import React, { createContext, useContext } from 'react';

const DrawerMenuContext = createContext<() => void>(() => undefined);

export const DrawerMenuProvider = DrawerMenuContext.Provider;

export const useDrawerMenu = () => useContext(DrawerMenuContext);
