import React, { createContext, useContext } from 'react';
import { useDrop } from '~hooks/use-drop';
import { DropContextValues } from '~types/drop';

const DropContext = createContext<DropContextValues>({} as any);

export const useDropContext = () => useContext(DropContext);

export const DropProvider = ({ children }: { children: React.ReactNode }) => {
    const dropTools = useDrop();

    return <DropContext.Provider value={dropTools}>{children}</DropContext.Provider>;
};
