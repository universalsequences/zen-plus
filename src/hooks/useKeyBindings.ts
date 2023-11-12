import React, { useEffect, useCallback } from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { usePatch } from '@/contexts/PatchContext';

export const useKeyBindings = () => {
    let { setSelectedConnection, selectedNodes, selectedConnection } = usePosition();
    let { patch, deleteConnection, deleteNodes } = usePatch();

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedConnection, setSelectedConnection, selectedNodes, deleteNodes]);

    const onKeyDown = useCallback((e: any) => {
        if (e.target && (e.target as HTMLElement).tagName.toLowerCase() === "input") {
            return;
        }
        if (e.key === "Backspace") {
            if (selectedConnection) {
                // need to delete this connection
                console.log('delete =', selectedConnection);
                selectedConnection.source.disconnect(selectedConnection);
                deleteConnection((selectedConnection.source as any).id, selectedConnection);
            } else if (selectedNodes.length > 0) {
                deleteNodes(selectedNodes);
            }
        }
    }, [selectedConnection, selectedNodes, setSelectedConnection,deleteNodes, deleteConnection]);
};
