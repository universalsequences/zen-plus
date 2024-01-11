import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';

interface ITilesContext {
    gridTemplate: string;
    setGridTemplate: (x: string) => void;
}

interface Props {
    children: React.ReactNode;
}

const TilesContext = createContext<ITilesContext | undefined>(undefined);

export const useTilesContext = (): ITilesContext => {
    const context = useContext(TilesContext);
    if (!context) throw new Error('useMessageHandler must be used within MessageProvider');
    return context;
};


export const TilesProvider: React.FC<Props> = ({ children }) => {

    const [gridTemplate, setGridTemplate] = useState("1fr 1fr");

    return <TilesContext.Provider
        value={{
            gridTemplate,
            setGridTemplate
        }}>
        {children}
    </TilesContext.Provider>;
};

