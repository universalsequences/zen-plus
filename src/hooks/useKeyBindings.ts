import React, { useEffect, useRef, useCallback, useState } from "react";
import { getSegmentation } from "@/lib/cables/getSegmentation";
import { IOConnection, ObjectNode, Coordinate, MessageType, MessageNode } from "@/lib/nodes/types";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import { usePosition } from "@/contexts/PositionContext";
import { useLocked } from "@/contexts/LockedContext";
import { usePatch } from "@/contexts/PatchContext";
import { usePatches } from "@/contexts/PatchesContext";
import { useSelection } from "@/contexts/SelectionContext";
import { useWindows } from "@/contexts/WindowsContext";
import { useStepsContext } from "@/contexts/StepsContext";
import { BufferType, type Buffer } from "@/lib/tiling/types";

export const useKeyBindings = (
  scrollRef: React.MutableRefObject<HTMLDivElement | null>,
  targetPatch?: any,
) => {
  let { setSelectedConnection, selectedNodes, selectedConnection } = useSelection();
  const { lockedMode, setLockedMode } = useLocked();
  let {
    updatePosition,
    setPreparePresentationMode,
    deletePositions,
    sizeIndexRef,
    presentationMode,
    setPresentationMode,
  } = usePosition();
  const { newMessageNode, segmentCable, patch, deleteConnection, deleteNodes } = usePatch();
  const { patchWindows, setPatchWindows } = useWindows();
  const {
    closePatch,
    goToParentTile,
    splitTile,
    patches,
    goToPreviousPatch,
    resizeTile,
    switchTileDirection,
    expandPatch,
    liftPatchTile,
    setPatches,
    selectedPatch,
    setSelectedPatch,
    switchToBuffer,
  } = usePatches();

  const { selectedSteps } = useStepsContext();
  const counter1 = useRef(0);

  const [command, setCommand] = useState(false);

  const currentMousePosition = useRef<Coordinate | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    currentMousePosition.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  const getXY = useCallback((): Coordinate | null => {
    if (!scrollRef.current || !currentMousePosition.current) return null;

    let pos = currentMousePosition.current;
    let rect = scrollRef.current.getBoundingClientRect();
    let client = { x: pos.x - rect.left, y: pos.y - rect.top };

    let x = scrollRef.current.scrollLeft + client.x;
    let y = scrollRef.current.scrollTop + client.y;
    return { x, y };
  }, [scrollRef]);

  const segmentSelectedCable = useCallback(
    (cable: IOConnection) => {
      if (sizeIndexRef.current[cable.source.id]) {
        segmentCable(cable, getSegmentation(cable, sizeIndexRef.current));
      }
    },
    [segmentCable, sizeIndexRef],
  );

  const createMessageNode = useCallback(
    (isNumberBox: boolean, isParameter?: boolean) => {
      // Use targetPatch if provided, otherwise fall back to context patch
      const currentPatch = targetPatch || patch;

      let messageNode = new MessageNodeImpl(
        currentPatch,
        isNumberBox ? MessageType.Number : MessageType.Message,
      );
      let position = getXY();
      if (isParameter) {
        messageNode.attributes["is parameter"] = true;
      }
      if (position) {
        newMessageNode(messageNode, position);
        updatePosition(messageNode.id, position);
      }
    },
    [targetPatch, patch, newMessageNode, updatePosition, getXY],
  );

  // Define onKeyDown first, then we'll use it in the effect
  const onKeyDown = useCallback(
    (e: any) => {
      // Don't handle keyboard input if user is typing in an input or textarea
      if (
        e.target &&
        ((e.target as HTMLElement).tagName.toLowerCase() === "input" ||
          (e.target as HTMLElement).tagName.toLowerCase() === "textarea")
      ) {
        return;
      }

      // If a targetPatch was provided, use it instead of the context patch
      const currentPatch = targetPatch || patch;

      if (selectedPatch !== currentPatch) {
        return;
      }

      if (e.key === "x" && e.ctrlKey) {
        setCommand(true);
        return;
      }
      if (selectedNodes.length > 0 && lockedMode) {
        if (
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight"
        ) {
          e.preventDefault();
        }
      }
      // Buffer commands are now handled by useGlobalKeyBindings

      // Move selected nodes with arrow keys (new feature)
      if (selectedNodes.length > 0 && !lockedMode && !e.metaKey) {
        if (
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight"
        ) {
          const moveDistance = e.shiftKey ? 10 : 1; // Move faster with shift key
          let updates: { [x: string]: Coordinate } = {};

          // Create a batch of position updates
          selectedNodes.forEach((node) => {
            if (!node.position) return;

            let newX = node.position.x;
            let newY = node.position.y;

            if (e.key === "ArrowUp") newY -= moveDistance;
            if (e.key === "ArrowDown") newY += moveDistance;
            if (e.key === "ArrowLeft") newX -= moveDistance;
            if (e.key === "ArrowRight") newX += moveDistance;

            // Also update the node's internal position to keep things in sync
            node.position = { x: newX, y: newY };

            // Add to the batch update
            updates[node.id] = { x: newX, y: newY };
          });

          e.preventDefault();

          // Apply all position updates (some nodes might share coordinates)
          for (const [id, position] of Object.entries(updates)) {
            updatePosition(id, position as Coordinate);
          }

          return;
        }
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

      if (e.key === "e" && e.metaKey && selectedPatch) {
        if (!patchWindows.includes(selectedPatch)) {
          selectedPatch.lockedMode = !lockedMode;
          setLockedMode(!lockedMode);
        }
      }
      if (e.key === "p" && e.metaKey) {
        e.preventDefault();
        setPreparePresentationMode(true);
        let id = ++counter1.current;
        setTimeout(() => {
          if (counter1.current !== id) {
            return;
          }
          setPresentationMode(!presentationMode);
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

      /*
      if (e.key === "1" && command) {
        e.preventDefault();
        if (selectedPatch) {
          liftPatchTile(selectedPatch);
          setPatchWindows([]);
        }
      }
      */

      if (e.key === "k" && command) {
        e.preventDefault();
        if (selectedPatch) {
          closePatch(selectedPatch);
        }
      }

      if (e.key === "ArrowUp" && e.metaKey) {
        e.preventDefault();
        goToParentTile();
      }

      if (e.key === "ArrowDown" && e.metaKey) {
        e.preventDefault();
        goToPreviousPatch();
      }

      if (e.key === "ArrowLeft" && e.metaKey) {
        e.preventDefault();
        resizeTile(1);
      }

      if (e.key === "ArrowRight" && e.metaKey) {
        e.preventDefault();
        resizeTile(-1);
      }

      if (e.key === "y" && e.metaKey && selectedConnection) {
        e.preventDefault();
        segmentSelectedCable(selectedConnection);
      }
      if (e.key === "Backspace" && !lockedMode) {
        if (selectedSteps && selectedSteps.length > 0) {
          return;
        }
        if (selectedConnection) {
          // need to delete this connection
          selectedConnection.source.disconnect(selectedConnection, true);
          deleteConnection((selectedConnection.source as any).id, selectedConnection);
        } else if (selectedNodes.length > 0) {
          deleteNodes(selectedNodes);
          deletePositions(selectedNodes as ObjectNode[]);
        }
      }

      if (selectedNodes?.length === 1 && e.key === "o" && e.metaKey) {
        e.preventDefault();
        const objectNode = selectedNodes[0] as ObjectNode;
        // For regular objects, create an Object buffer
        const objectBuffer: Buffer = {
          id: objectNode.id,
          type: BufferType.Object,
          objectNode: objectNode,
          name: objectNode.text || "Object View",
          patch: objectNode.patch, // Reference the object's patch for context
        };

        switchToBuffer(objectBuffer, false);
      }

      setCommand(false);
    },
    [
      patches,
      setSelectedPatch,
      command,
      selectedConnection,
      setCommand,
      selectedNodes,
      selectedSteps,
      setPatches,
      selectedPatch,
      patch,
      targetPatch,
      setLockedMode,
      lockedMode,
      deletePositions,
      setSelectedConnection,
      deleteNodes,
      deleteConnection,
      updatePosition,
      presentationMode,
      setPresentationMode,
      setPreparePresentationMode,
      segmentSelectedCable,
      createMessageNode,
      expandPatch,
      liftPatchTile,
      setPatchWindows,
      patchWindows,
      splitTile,
      switchTileDirection,
      goToParentTile,
      goToPreviousPatch,
      resizeTile,
    ],
  );

  // Now add the event listener
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return { createMessageNode, segmentSelectedCable };
};
