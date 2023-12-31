import React, { useEffect, useRef, useCallback } from 'react';
import { getSegmentation } from "@/lib/cables/getSegmentation";
import { IOConnection, ObjectNode, Coordinate, MessageType, MessageNode } from '@/lib/nodes/types';
import MessageNodeImpl from '@/lib/nodes/MessageNode';
import { usePosition } from '@/contexts/PositionContext';
import { usePatch } from '@/contexts/PatchContext';
import { usePatches } from '@/contexts/PatchesContext';
import { useSelection } from '@/contexts/SelectionContext';

export const useKeyBindings = (scrollRef: React.MutableRefObject<HTMLDivElement | null>) => {

    let { setLockedMode, lockedMode, setSelectedConnection, selectedNodes, selectedConnection } = useSelection();
    let { updatePosition, setPreparePresentationMode, deletePositions, sizeIndexRef, presentationMode, setPresentationMode } = usePosition();
    let { newMessageNode, segmentCable, patch, deleteConnection, deleteNodes } = usePatch();
    let { switchTileDirection, expandPatch, liftPatchTile, setPatches, selectedPatch } = usePatches();
    const counter1 = useRef(0);

    const segmentSelectedCable = useCallback((cable: IOConnection) => {
        if (sizeIndexRef.current[cable.source.id]) {
            segmentCable(cable, getSegmentation(cable, sizeIndexRef.current));
        }
    }, []);

    const currentMousePosition = useRef<Coordinate | null>(null);
    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        return () => window.removeEventListener("mousemove", onMouseMove);
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        currentMousePosition.current = { x: e.clientX, y: e.clientY };
    }, []);

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedConnection, selectedPatch, setPatches, lockedMode, setLockedMode, setSelectedConnection, selectedNodes, deleteNodes]);

    const getXY = (): Coordinate | null => {
        if (!scrollRef.current || !currentMousePosition.current) return null;

        let pos = currentMousePosition.current;
        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: pos.x - rect.left, y: pos.y - rect.top };

        let x = scrollRef.current.scrollLeft + client.x;
        let y = scrollRef.current.scrollTop + client.y
        return { x, y };
    };
    const createMessageNode = useCallback((isNumberBox: boolean, isParameter?: boolean) => {
        let messageNode = new MessageNodeImpl(patch, isNumberBox ? MessageType.Number : MessageType.Message);
        let position = getXY();
        if (isParameter) {
            messageNode.attributes["is parameter"] = true;
        }
        if (position) {
            newMessageNode(messageNode, position);
            updatePosition(messageNode.id, position);
        }
    }, []);

    const onKeyDown = useCallback((e: any) => {
        if (e.target && ((e.target as HTMLElement).tagName.toLowerCase() === "input" ||
            (e.target as HTMLElement).tagName.toLowerCase() === "textarea")
        ) {
            return;
        }

        if (selectedPatch !== patch && (e.key !== "e")) {
            return;
        }

        if (e.key === "M") {
            // create a mesage object
            createMessageNode(false);
        }

        if (e.key === "Enter" && selectedNodes[0]) {
            let node = selectedNodes[0];
            if ((node as ObjectNode).name === "zen") {
                expandPatch(node as ObjectNode, e.metaKey);
            }
            // create a mesage object
        }

        if (e.key === "N") {
            createMessageNode(true);
            // create a number box object
        }

        if (e.key === "P") {
            createMessageNode(true, true);
            // create a number box object
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
        if (e.key === "u" && e.metaKey) {
            e.preventDefault();
            if (selectedPatch) {
                liftPatchTile(selectedPatch);
            }
        }
        if (e.key === "i" && e.metaKey) {
            e.preventDefault();
            switchTileDirection();
        }
        if (e.key === "y" && e.metaKey && selectedConnection) {
            e.preventDefault();
            segmentSelectedCable(selectedConnection);
        }
        if (e.key === "Backspace") {
            if (selectedConnection) {
                // need to delete this connection
                selectedConnection.source.disconnect(selectedConnection, true);
                deleteConnection((selectedConnection.source as any).id, selectedConnection);
            } else if (selectedNodes.length > 0) {
                deleteNodes(selectedNodes);
                deletePositions(selectedNodes as ObjectNode[]);
            }
        }
    }, [selectedConnection, selectedNodes, setPatches, selectedPatch, selectedPatch, patch, setLockedMode, lockedMode, deletePositions, setSelectedConnection, deleteNodes, deleteConnection]);
};
