import React, { memo, useEffect, useCallback, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import AlignmentHelper from "./AlignmentHelper";
import { useConnections } from "@/hooks/useConnections";
import { useEdgePatch, generatePath } from "@/hooks/useEdgePath";
import { useSelectedConnection } from "@/hooks/useSelectedConnection";
import {
  ConnectionType,
  ObjectNode,
  IOlet,
  MessageNode,
  IOConnection,
  Coordinate,
} from "@/lib/nodes/types";
import { Coordinates, usePatch } from "@/contexts/PatchContext";
import { DraggingCable, usePosition } from "@/contexts/PositionContext";
import { OperatorContextType } from "@/lib/nodes/context";

const strokeColor = "#2ad4bf";
const Cables = () => {
  let { objectNodes, messageNodes, deleteConnection } = usePatch();
  let { selectedNodes } = useSelection();

  let { size } = usePosition();
  let {
    presentationMode,
    draggingNode,
    scrollRef,
    setDraggingCable,
    draggingCable,
    setDraggingSegmentation,
  } = usePosition();
  let { lockedMode } = useLocked();

  const { selectedConnection } = useSelection();
  let memoed = React.useMemo(() => {
    let _selectedNodes = [...selectedNodes];
    if (draggingNode) {
      _selectedNodes.push(draggingNode.node);
    }
    let zIndex = lockedMode ? 1 : 1000000;
    let full = !presentationMode ? [...objectNodes, ...messageNodes] : [];
    let selected = full.filter((x) => selectedConnection && selectedConnection.source === x);
    let notSelected = full.filter((x) => !selectedConnection || selectedConnection.source !== x);
    return (
      <>
        <svg
          style={
            size
              ? {
                  zIndex,
                  width: size.width + "px",
                  height: size.height + "px",
                  minWidth: size.width + "px",
                  minHeight: size.height + "px",
                }
              : { zIndex }
          }
          className="absolute w-full h-full pointer-events-none"
        >
          {notSelected.map((node, i) => (
            <ObjectCables
              setDraggingSegmentation={setDraggingSegmentation}
              deleteConnection={deleteConnection}
              setDraggingCable={setDraggingCable}
              key={node.id}
              node={node}
            />
          ))}
          {selected.map((node, i) => (
            <ObjectCables
              setDraggingSegmentation={setDraggingSegmentation}
              deleteConnection={deleteConnection}
              setDraggingCable={setDraggingCable}
              key={node.id}
              node={node}
            />
          ))}
          <AlignmentHelper />
          {!presentationMode && <Dragging />}
        </svg>
      </>
    );
  }, [
    size,
    selectedConnection,
    objectNodes,
    lockedMode,
    draggingNode,
    presentationMode,
    messageNodes,
    setDraggingSegmentation,
    setDraggingCable,
    deleteConnection,
  ]);
  return memoed;
};

const Dragging = () => {
  let { scrollRef, setDraggingCable, draggingCable } = usePosition();
  let { zoomRef } = useSelection();

  let [current, setCurrent] = useState<Coordinate | null>(null);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    //window.addEventListener("mouseup", onMouseUp);
    return () => {
      //window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [draggingCable, setCurrent, setDraggingCable]);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!scrollRef.current) {
        return;
      }

      let rect = scrollRef.current.getBoundingClientRect();
      let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
      let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;

      // let x = e.clientX;
      //let y = e.clientY;
      if (draggingCable) {
        setCurrent({ x, y });
      }
    },
    [draggingCable, setCurrent],
  );

  if (!draggingCable || !current) {
    return <></>;
  }
  if (draggingCable.sourceCoordinate) {
    return (
      <path
        fill="transparent"
        d={
          generatePath(
            { x: draggingCable.sourceCoordinate.x - 4, y: draggingCable.sourceCoordinate.y - 4 },
            { x: current.x - 4, y: current.y - 4 },
          )[0]
        }
        strokeWidth={2}
        stroke={strokeColor}
      />
    );
  } else if (draggingCable.destCoordinate) {
    return (
      <path
        fill="transparent"
        d={
          generatePath(
            { x: draggingCable.destCoordinate.x - 4, y: draggingCable.destCoordinate.y - 4 },
            { x: current.x - 4, y: current.y - 4 },
          )[0]
        }
        strokeWidth={2}
        stroke={strokeColor}
      />
    );
  }
  return <></>;
};

const ObjectCables: React.FC<{
  setDraggingSegmentation: (x: IOConnection | null) => void;
  deleteConnection: (x: string, y: IOConnection) => void;
  setDraggingCable: (x: DraggingCable | null) => void;
  node: ObjectNode | MessageNode;
}> = memo(({ setDraggingSegmentation, deleteConnection, node, setDraggingCable }) => {
  let connections = useConnections(node.id);
  const { selectedConnection } = useSelection();
  let list = React.useMemo(() => {
    let list = [];
    let outletNumber = 0;
    let i = 0;
    let notSelected: any = [];
    let selected: any = [];
    for (let outlet of node.outlets) {
      for (let connection of outlet.connections) {
        let dest = connection.destination;
        let edge = (
          <Edge
            setDraggingSegmentation={setDraggingSegmentation}
            deleteConnection={deleteConnection}
            setDraggingCable={setDraggingCable}
            key={
              outletNumber +
              connection.source.id +
              "_" +
              connection.destination.id +
              "_" +
              i +
              "_" +
              "_" +
              dest.inlets.indexOf(connection.destinationInlet)
            }
            outletNumber={outletNumber}
            node={node}
            connection={connection}
          />
        );
        if (selectedConnection === connection) {
          selected.push(edge);
        } else {
          notSelected.push(edge);
        }
      }
      outletNumber++;
    }
    return [...notSelected, ...selected];
  }, [
    selectedConnection,
    deleteConnection,
    setDraggingCable,
    connections,
    setDraggingSegmentation,
  ]);
  return <>{list}</>;
});

const Edge: React.FC<{
  deleteConnection: (x: string, y: IOConnection) => void;
  setDraggingCable: (x: DraggingCable | null) => void;
  setDraggingSegmentation: (x: IOConnection | null) => void;
  node: ObjectNode | MessageNode;
  connection: IOConnection;
  outletNumber: number;
}> = ({
  deleteConnection,
  setDraggingCable,
  setDraggingSegmentation,
  connection,
  node,
  outletNumber,
}) => {
  let { sourceCoordinate, destCoordinate, d, destinationCircle, sourceCircle } = useEdgePatch(
    node as ObjectNode,
    outletNumber,
    connection,
  );

  let { isSelected, select } = useSelectedConnection(connection);

  const moveSourceEdge = useCallback(
    (e: any) => {
      e.stopPropagation();
      connection.source.disconnect(connection, true);
      deleteConnection((connection.source as any).id, connection);
      setDraggingCable({
        destCoordinate,
        destNode: connection.destination as ObjectNode,
        destInlet: connection.destinationInlet,
      });
    },
    [destCoordinate, connection, deleteConnection],
  );

  const moveDestEdge = useCallback(
    (e: any) => {
      e.stopPropagation();
      connection.source.disconnect(connection, true);
      deleteConnection((connection.source as any).id, connection);
      setDraggingCable({
        sourceCoordinate,
        sourceNode: connection.source as ObjectNode,
        sourceOutlet: connection.sourceOutlet,
      });
    },
    [sourceCoordinate, connection, deleteConnection],
  );

  const createKeyframes = (d: string, id: string) => {
    return `
@keyframes jiggle-${id} {
        0%, 100% { d: path("${d}"); }
        20% { d: path("${modifyPath(d, 0.1)}"); }
        40% { d: path("${modifyPath(d, 0.1)}"); }
        60% { d: path("${modifyPath(d, 0.85)}"); }
        80% { d: path("${modifyPath(d, 0.35)}"); }
      }
    `;
  };

  const modifyPath = (path: string, factor: number) => {
    // Split the path into segments
    if (!path) {
      return "";
    }
    const segments = path.split(" ");

    // Modify segments based on factor
    // Assuming a cubic Bezier curve format like "M 373 286 C 393 326 392 430 412 470"
    if (segments.length === 11 && segments[0] === "M" && segments[3] === "C") {
      // Adjust control points for the jiggle effect
      const controlPoint1Y = parseFloat(segments[5]);
      const controlPoint2Y = parseFloat(segments[9]);

      // Apply a simple jiggle effect by modifying the Y coordinates of the control points
      segments[5] = (controlPoint1Y + 8 * Math.sin(factor * Math.PI * 2)).toString();
      segments[9] = (controlPoint2Y - 8 * Math.sin(factor * Math.PI * 2)).toString();
    }

    return segments.join(" ");
  };

  let [hover, setHover] = useState(false);

  const p = React.useMemo(() => {
    // use 2 paths: one that you see, and another that is invisible but used to capture
    // mouse events
    let isAudio = connection.sourceOutlet.connectionType === ConnectionType.AUDIO;
    let isCore = connection.sourceOutlet.connectionType === ConnectionType.CORE;
    let isGL = connection.sourceOutlet.connectionType === ConnectionType.GL;
    let isMC = connection.sourceOutlet.mc;
    if (
      isAudio &&
      (connection.destination as ObjectNode).operatorContextType === OperatorContextType.CORE
    ) {
      isAudio = false;
      isCore = true;
    }
    let id = connection.source.id + connection.destination.id;
    let keyframes = connection.created ? createKeyframes(d[0], id) : "";
    let created = connection.created;
    connection.created = undefined;

    return (
      <>
        <g
          style={isSelected ? { zIndex: 10000000 } : { zIndex: 1 }}
          className={(hover ? " hover " : "") + "edge-group"}
        >
          {created && <style dangerouslySetInnerHTML={{ __html: keyframes }} />}

          {d.map((_d, i) => (
            <g key={i}>
              {(isCore || isAudio) && (
                <path
                  className="visible-edge pointer-events-auto"
                  fill="none"
                  d={_d}
                  stroke={isSelected ? "red" : "black"}
                  strokeWidth={2}
                />
              )}
              <path
                style={{ animation: `jiggle-${id} .4s ease-in-out` }}
                fill="none"
                strokeDasharray={isAudio ? "4 4" : undefined}
                d={_d}
                className={
                  (isSelected ? " selected-edge " : "") +
                  "visible-edge pointer-events-auto " +
                  (isGL ? "gl" : isCore ? "core" : isMC ? "mc" : isAudio ? "audio" : "zen")
                }
                stroke={
                  isSelected
                    ? "red"
                    : isCore
                      ? "#ffffff"
                      : isMC
                        ? "#00e6ff"
                        : isAudio
                          ? "yellow"
                          : strokeColor
                }
                strokeWidth={2}
              />
              <path
                fill="none"
                className={
                  ((d.length === 5 && i === 1) || (d.length === 3 && i === 1)
                    ? "cursor-ns-resize"
                    : "") + " pointer-events-auto "
                }
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  if ((d.length === 5 && i === 1) || (d.length === 3 && i === 1)) {
                    setDraggingSegmentation(connection);
                  }
                }}
                onClick={(e: any) => {
                  e.stopPropagation();
                  select();
                }}
                onMouseOver={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                d={_d}
                stroke="transparent"
                strokeWidth={(d.length === 5 && i === 1) || (d.length === 3 && i === 1) ? 5 : 5}
              />
            </g>
          ))}
          {isSelected && sourceCircle && (
            <circle
              style={{ zIndex: 10000000 }}
              onMouseDown={moveSourceEdge}
              cx={sourceCircle.x}
              cy={sourceCircle.y}
              r={4}
              fill="white"
              className="edge-mover pointer-events-auto"
            />
          )}
          {isSelected && destinationCircle && (
            <circle
              style={{ zIndex: 10000000 }}
              onMouseDown={moveDestEdge}
              cx={destinationCircle.x}
              cy={destinationCircle.y}
              r={4}
              fill="white"
              className="edge-mover pointer-events-auto"
            />
          )}
        </g>
      </>
    );
  }, [
    d,
    destinationCircle,
    sourceCircle,
    sourceCoordinate,
    hover,
    setHover,
    destCoordinate,
    isSelected,
    setDraggingCable,
    deleteConnection,
  ]);
  return p;
};

ObjectCables.displayName = "ObjectCables";
export default Cables;
