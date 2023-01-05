import React, { createContext, useContext } from 'react';
import { useGrab } from '~hooks/use-grab';
import { GrabContextValues } from '~types/grab';

const GrabContext = createContext<GrabContextValues>({} as any);

export const useGrabContext = () => useContext(GrabContext);

export const GrabProvider = ({ children }: { children: React.ReactNode }) => {
    const grabTools = useGrab();

    return <GrabContext.Provider value={grabTools}>{children}</GrabContext.Provider>;
};
