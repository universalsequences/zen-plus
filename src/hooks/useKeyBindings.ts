import React, { useEffect, useRef, useCallback } from 'react';
import { getSegmentation } from "@/lib/cables/getSegmentation";
import { IOConnection, ObjectNode } from '@/lib/nodes/types';
import { usePosition } from '@/contexts/PositionContext';
import { usePatch } from '@/contexts/PatchContext';
import { usePatches } from '@/contexts/PatchesContext';
import { useSelection } from '@/contexts/SelectionContext';

export const useKeyBindings = () => {
    let { setLockedMode, lockedMode, setSelectedConnection, selectedNodes, selectedConnection } = useSelection();
    let { setPreparePresentationMode, deletePositions, sizeIndexRef, presentationMode, setPresentationMode } = usePosition();
    let { segmentCable, patch, deleteConnection, deleteNodes } = usePatch();
    let { setPatches, selectedPatch } = usePatches();
    const counter1 = useRef(0);

    const segmentSelectedCable = useCallback((cable: IOConnection) => {
        if (sizeIndexRef.current[cable.source.id]) {
            segmentCable(cable, getSegmentation(cable, sizeIndexRef.current));
        }
    }, []);

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedConnection, selectedPatch, setPatches, lockedMode, setLockedMode, setSelectedConnection, selectedNodes, deleteNodes]);

    const onKeyDown = useCallback((e: any) => {
        if (e.target && ((e.target as HTMLElement).tagName.toLowerCase() === "input" ||
            (e.target as HTMLElement).tagName.toLowerCase() === "textarea")
        ) {
            return;
        }
        if (e.key === "e" && e.metaKey) {
            setLockedMode(!lockedMode);
        }
        if (e.key === "p" && e.metaKey) {
            e.preventDefault();
            setPreparePresentationMode(true);
            let id = ++counter1.current;
            setTimeout(() => {
                if (counter1.current !== id) {
                    return;
                }
                setPresentationMode(!presentationMode)
                patch.presentationMode = !presentationMode;
                id = ++counter1.current;
                setTimeout(() => {
                    if (id !== counter1.current) {
                        return;
                    }
                    setPreparePresentationMode(false);
                }, 1000);
            }, 50);
        }
        if (e.key === "r" && e.metaKey && selectedConnection) {
            e.preventDefault();
        }
        if (e.key === "l" && e.metaKey) {
            e.preventDefault();
            if (selectedPatch) {
                setPatches([selectedPatch]);
            }
        }
        if (e.key === "y" && e.metaKey && selectedConnection) {
            e.preventDefault();
            segmentSelectedCable(selectedConnection);
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
    }, [selectedConnection, selectedNodes, setPatches, selectedPatch, setLockedMode, lockedMode, deletePositions, setSelectedConnection, deleteNodes, deleteConnection]);
};
