import React, { useEffect, useCallback } from 'react';
import { ObjectNode } from '@/lib/nodes/types';
import { usePosition } from '@/contexts/PositionContext';
import { usePatch } from '@/contexts/PatchContext';
import { useSelection } from '@/contexts/SelectionContext';

export const useKeyBindings = () => {
    let { setLockedMode, lockedMode, setSelectedConnection, selectedNodes, selectedConnection } = useSelection();
    let { deletePositions } = usePosition();
    let { patch, deleteConnection, deleteNodes } = usePatch();

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedConnection, lockedMode, setLockedMode, setSelectedConnection, selectedNodes, deleteNodes]);

    const onKeyDown = useCallback((e: any) => {
        if (e.target && ((e.target as HTMLElement).tagName.toLowerCase() === "input" ||
            (e.target as HTMLElement).tagName.toLowerCase() === "textarea")
        ) {
            return;
        }
        if (e.key === "e" && e.metaKey) {
            setLockedMode(!lockedMode);
        }
        if (e.key === "Backspace") {
            if (selectedConnection) {
                // need to delete this connection
                selectedConnection.source.disconnect(selectedConnection);
                deleteConnection((selectedConnection.source as any).id, selectedConnection);
            } else if (selectedNodes.length > 0) {
                deleteNodes(selectedNodes);
                deletePositions(selectedNodes as ObjectNode[]);
            }
        }
    }, [selectedConnection, selectedNodes, setLockedMode, lockedMode, deletePositions, setSelectedConnection, deleteNodes, deleteConnection]);
};
