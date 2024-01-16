import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTilesContext } from '@/contexts/TilesContext';
import PatchInner from './PatchInner';
import { useNodeOperations } from '@/hooks/useEncapsulation';
import { useZoom } from '@/hooks/useZoom';
import LockButton from './LockButton';
import { useMessage } from '@/contexts/MessageContext';
import { traverseBackwards } from '@/lib/nodes/traverse';
import { useSelection } from '@/contexts/SelectionContext';
import Toolbar from './Toolbar'
import Cables from './Cables';
import { ContextMenu, useThemeContext } from '@radix-ui/themes';
import { ResizingPatch, PatchResizeType, useTiles } from '@/hooks/useTiles';
import { useKeyBindings } from '@/hooks/useKeyBindings';
import ObjectNodeComponent from './ObjectNodeComponent';
import { MessageNode, ObjectNode, Node, MessageType, SubPatch, Orientation, Coordinate, IOConnection } from '@/lib/nodes/types';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import MessageNodeImpl from '@/lib/nodes/MessageNode';
import MessageNodeComponent from './MessageNodeComponent';
import { Connections, usePatch } from '@/contexts/PatchContext';
import { usePatches } from '@/contexts/PatchesContext';
import { usePosition, ResizingNode, DraggingNode, Coordinates } from '@/contexts/PositionContext';
import PresentationMode from './PresentationMode';


interface Selection {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

const PatchComponent: React.FC<{ maxWidth: number, maxHeight: number, visibleObjectNodes?: ObjectNode[], messageNodes?: MessageNode[], index: number, isCustomView?: boolean }> = ({ visibleObjectNodes, index, isCustomView, maxWidth, maxHeight }) => {
    useThemeContext();
    const { rootTile, selectedPatch, setSelectedPatch, setGridTemplate } = usePatches();
    const { gridTemplate } = useTilesContext();
    const {
        lastResizingTime,
        setSelection,
        selection,
        lockedMode,
        selectedNodes, setSelectedNodes, setSelectedConnection } = useSelection();
    const { onNewMessage } = useMessage();


    useEffect(() => {
        if (!isCustomView) {
            setSelectedPatch(patch);
            patch.onNewMessage = onNewMessage;
        }
    }, [onNewMessage]);

    let {
        updateSize,
        scrollRef,
        setResizingNode,
        resizingNode,
        setDraggingNode,
        draggingNode,
        sizeIndexRef,
        updatePosition,
        presentationMode,
        updatePositions,
        setDraggingSegmentation,
        draggingCable,
        setDraggingCable,
        draggingSegmentation,
    } = usePosition();

    let { zoom, zoomableRef, zoomRef } = useZoom(scrollRef, isCustomView);

    if (isCustomView) {
        presentationMode = true;
    }

    const {
        deleteNodes,
        segmentCable,
        segmentCables,
        updateConnections,
        registerConnection,
        patch, objectNodes, messageNodes, newObjectNode, newMessageNode } = usePatch();

    useEffect(() => {
        patch.onNewMessage = onNewMessage;
        console.log("patch =", patch);
    }, [patch, onNewMessage]);

    useKeyBindings(scrollRef);

    const { onResizePatch, resizingPatch, setResizingPatch } = useTiles(patch);

    const lastClick = useRef(0);

    let draggingCableRef = useRef<any | null>(null);
    useEffect(() => {
        draggingCableRef.current = draggingCable;
    }, [draggingCable]);

    const onMouseUpNode = useCallback((e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
        setDraggingNode(null);
        setResizingNode(null);
    }, [setDraggingNode, setResizingNode]);

    const onMouseUp = useCallback((e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
        console.log('on mouse up=', draggingCable);

        if (draggingCableRef.current) {
            e.stopPropagation();
            setDraggingCable(null);
            return;
        }

        if (resizingPatch) {
            e.stopPropagation();
            setResizingPatch(null);
        }

        if (isCustomView) {
            return;
        }
        if (lockedMode) {
            return;
        }

        setDraggingSegmentation(null);

        if (selection && selection.patch === patch) {
            let all = [...patch.objectNodes, ...patch.messageNodes];
            let filtered = all.filter(
                node => {
                    let size = sizeIndexRef.current[node.id];
                    let w = size ? size.width || 100 : 100;
                    let h = size ? size.height || 7 : 7;
                    let position = presentationMode ? node.presentationPosition || node.position : node.position;
                    return position.x + w >= selection.x1 && position.x <= selection.x2 &&
                        position.y + h >= selection.y1 && position.y <= selection.y2;
                });
            setSelectedNodes(filtered);
        }
    }, [patch, setDraggingCable, presentationMode, resizingPatch, setResizingPatch, setDraggingSegmentation, setDraggingNode, setResizingNode, selection, setSelection, setSelectedNodes, messageNodes, objectNodes, lockedMode]);

    const draggingNodeRef = useRef<DraggingNode | null>(null);
    const resizingNodeRef = useRef<ResizingNode | null>(null);

    useEffect(() => {
        draggingNodeRef.current = draggingNode;
        resizingNodeRef.current = resizingNode;
    }, [resizingNode, draggingNode]);

    const selectedNodesRef = useRef(selectedNodes);

    useEffect(() => {
        selectedNodesRef.current = selectedNodes;
        let node = selectedNodes[0];
        //if (node) {
        //    let backwards = traverseBackwards(node);
        //}
    }, [selectedNodes])

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!scrollRef.current) {
            return;
        }
        if (isCustomView) {
            return;
        }
        if (resizingPatch) {
            onResizePatch(e);
            return;
        }
        if (lockedMode) {
            return;
        }

        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        if (draggingSegmentation) {
            let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current; //- offset.y;
            let id = draggingSegmentation.source.id;
            let node = draggingSegmentation.source as ObjectNode;
            let height = node.size ? node.size.height : sizeIndexRef.current[id].height;
            if (height) {
                segmentCable(draggingSegmentation, y - height);
            }
        }
        if (resizingNodeRef.current) {
            lastResizingTime.current = new Date().getTime();
            if (resizingNodeRef.current.orientation === Orientation.X) {
                let { node, offset } = resizingNodeRef.current;
                let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;// - offset.x;
                let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current; //- offset.y;
                if (!node.size) {
                    node.size = sizeIndexRef.current[node.id];
                    // position`
                }
                let width = x - node.position.x;
                node.size.width = width;
                updateSize(node.id, { ...node.size });
            } else if (resizingNodeRef.current.orientation === Orientation.Y) {
                let { node, offset } = resizingNodeRef.current;
                let x = scrollRef.current.scrollLeft + client.x;// - offset.x;
                let y = scrollRef.current.scrollTop + client.y; //- offset.y;
                if (!node.size) {
                    node.size = sizeIndexRef.current[node.id];
                    // position`
                }
                let height = y - node.position.y;
                node.size.height = height;
                updateSize(node.id, { ...node.size });
            } else {
                let { node, offset } = resizingNodeRef.current;
                let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;// - offset.x;
                let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current; //- offset.y;
                if (!node.size) {
                    node.size = sizeIndexRef.current[node.id];
                    // position`
                }
                let height = y - node.position.y;
                let width = x - node.position.x;
                node.size.height = height;
                node.size.width = width;
                updateSize(node.id, { ...node.size });
                for (let __node of selectedNodes) {
                    if ((__node as ObjectNode).size) {
                        let _node: ObjectNode = __node as ObjectNode;
                        if (_node.size) {
                            _node.size.height = height;
                            _node.size.width = width;
                            updateSize(_node.id, { ..._node.size });
                        }
                    }
                }
            }
        }

        if (draggingNodeRef.current) {
            let { node, offset } = draggingNodeRef.current;
            let x = scrollRef.current.scrollLeft + client.x - offset.x;
            let y = scrollRef.current.scrollTop + client.y - offset.y;
            x /= zoomRef.current;
            y /= zoomRef.current;

            let position = presentationMode ? node.presentationPosition || node.position : node.position;
            let diffX = x - position.x;
            let diffY = y - position.y;

            position.x = Math.max(0, x);
            position.y = Math.max(0, y);

            let updates: any = {};
            let nodeMap: any = {};

            for (let _node of selectedNodesRef.current) {
                if (selectedNodesRef.current.length > 1) {
                    for (let outlet of _node.outlets) {
                        for (let connection of outlet.connections) {
                            if (connection.segmentation) {
                                connection.segmentation += diffY;
                            }
                        }
                    }
                }
                if (node !== _node) {
                    let _position = presentationMode ? _node.presentationPosition || _node.position : _node.position;
                    _position.x = Math.max(0, _position.x + diffX);
                    _position.y = Math.max(0, _position.y + diffY);
                    updates[_node.id] = { ..._position };
                }
                nodeMap[_node.id] = _node;
            }
            updates[node.id] = { ...position };

            let _updates = updatePositions(updates);
            for (let id in updates) {
                let node = nodeMap[id];
                if (node) {
                    if (presentationMode) {
                        node.presentationPosition = updates[id];
                    } else {
                        node.position = updates[id];
                    }
                }
            }
        }
    }, [
        presentationMode,
        draggingSegmentation,
        resizingPatch,
        setGridTemplate,
        updatePositions, scrollRef, selection, setSelection, selectedNodes, updateSize, lockedMode]);

    useEffect(() => {
        if (patch.objectNodes.length < 1) {
            let node = new ObjectNodeImpl(patch);
            node.parse("out 1");
            let position = { x: window.innerWidth / 2, y: window.innerHeight - 300 };
            newObjectNode(node, position);
            updatePosition(node.id, position);
        }
    }, [objectNodes]);

    useEffect(() => {
        if (lockedMode) {
            setDraggingNode(null);
            setSelectedNodes([]);
        }
    }, [lockedMode, setSelectedNodes, setDraggingNode]);

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUpNode);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUpNode);
        }
    }, [
        presentationMode,
        draggingSegmentation,
        patch,
        setDraggingSegmentation,
        draggingCable,
        setDraggingCable,
        resizingPatch,
        setResizingPatch,
        setGridTemplate,
        lockedMode,
        objectNodes,
        messageNodes,
        updatePositions, scrollRef, selection, setSelection, updateSize, selectedNodes, resizingNode, setResizingNode]);


    const onSelectionMove = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!scrollRef.current) {
            return;
        }
        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        if (selection) {
            let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
            let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current
            setSelection({
                ...selection,
                patch: patch,
                x2: x,
                y2: y
            })
        }
    }, [setSelection, selection, patch]);

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (isCustomView) {
            return;
        }
        setSelectedPatch(patch);
        patch.onNewMessage = onNewMessage;
        if (e.button === 2) {
            return;
        }
        if (scrollRef.current && !lockedMode) {

            let rect = scrollRef.current.getBoundingClientRect();
            let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
            let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;
            setSelection({
                patch: patch,
                x1: x,
                y1: y,
                x2: x,
                y2: y
            })
        }
    }, [setSelection, onNewMessage, lockedMode, patch]);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (isCustomView) {
            return;
        }
        setSelectedPatch(patch);
        if (e.button == 2) {
            return;
        }
        let now = new Date().getTime();
        if (now - lastResizingTime.current < 200) {
            return;
        }
        if (now - lastClick.current < 350 && scrollRef.current) {
            // create a new object

            let rect = scrollRef.current.getBoundingClientRect();
            let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

            let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
            let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;

            let objectNode = new ObjectNodeImpl(patch);
            let position = {
                x, y
            };

            newObjectNode(objectNode, position);
            updatePosition(objectNode.id, position);
            setSelection(null);
        } else {
        }
        lastClick.current = now;
    }, [setSelectedNodes, selection, setSelectedConnection, setSelection, patch]);

    useEffect(() => {
        let positions: Coordinates = {};
        let connections: Connections = {};
        for (let node of [...patch.objectNodes, ...patch.messageNodes]) {
            if (presentationMode && !node.attributes["Include in Presentation"]) {
                continue;
            }
            positions[node.id] = presentationMode ? node.presentationPosition || node.position : node.position;
            let _connections: IOConnection[] = [];
            for (let outlet of node.outlets) {
                _connections = [..._connections, ...outlet.connections];
            }
            connections[node.id] = _connections;
        }
        updatePositions(positions);
        updateConnections(connections);
    }, [patch, presentationMode]);


    let { encapsulate, handleContextMenu, createMessageNode, createObjectNode, createNumberBox, presentation } = useNodeOperations({
        isCustomView,
        zoomRef,
        scrollRef
    });

    /*
    useEffect(() => {
        if (patch && !patch.name) {
            let local = localStorage.getItem("backup-patches")
            if (local) {
                let parsed = JSON.parse(local);
                for (let p of parsed) {
                    console.log('trying to parse=', p);
                    let o = createObjectNode();
                    o.parse("zen");
                    if (o.subpatch) {
                        o.subpatch.fromJSON(p.patch);
                        o.subpatch.name = p.name;
                    }
                }
            }
        }
    }, [patch]);
    */


    const mem = React.useMemo(() => {
        let tile = rootTile ? rootTile.findPatch(patch) : null;
        let direction = tile && tile.parent ? (tile.parent.splitDirection === "vertical" ? "vertical" : "horizontal") : "";
        let _direction = direction;
        if (patch.viewed) {
            direction = "";
        } else {
        }
        let cl = "w-full h-full " + direction;

        let _maxWidth = null;
        let _maxHeight = null;
        if (tile && !isCustomView) {
            let vparent: any = tile.parent;
            let vprev = tile;
            while (vparent && vparent.splitDirection !== "vertical") {
                vprev = vparent;
                vparent = vparent.parent;
            }

            let hparent: any = tile.parent;
            let hprev = tile;
            while (hparent && hparent.splitDirection !== "horizontal") {
                hprev = hparent;
                hparent = hparent.parent;
            }

            if (hparent) {
                _maxWidth = hparent && hparent.children[0] === hprev ?
                    hparent.size : 100 - hparent.size;
            }

            if (vparent) {
                _maxHeight = vparent && vparent.children[0] === vprev ?
                    vparent.size : 100 - vparent.size;
            }

            if (tile.parent && tile.parent.splitDirection === "vertical") {
                _maxWidth = null;
            }
            if (tile.parent && tile.parent.splitDirection === "horizontal") {
                _maxHeight = null;
            }
        } else {
        }


        let keyframe = ``;
        if (_maxWidth) {
            keyframe = `@keyframes horizontal-slide-${patch.id} {
0% { max-width: ${patch.viewed ? 100 : 0}%};
    100% { max-width: ${_maxWidth}% }
}
`;
        } else {
            _maxWidth = 100
        }
        if (_maxHeight) {
            keyframe = `@keyframes vertical-slide-${patch.id} {
0% { max-height: ${patch.viewed ? 100 : 0}%};
        100% { max-height: ${_maxHeight}% }
}
`;
        } else {
            _maxHeight = 100;
        }

        let animation = `${_direction}-slide-${patch.id} 0.5s ease`;

        let style: any = isCustomView ? {} : { animation, maxWidth: _maxWidth + '%', maxHeight: _maxHeight + '%' };
        let isFloatingCustom = false;
        if (!isCustomView && (patch as SubPatch).parentNode && lockedMode) {
            let node = (patch as SubPatch).parentNode;
            if (node.attributes["Custom Presentation"] && node.size && presentationMode) {
                let parent = (patch as SubPatch).parentPatch;
                let parentNode = (parent as SubPatch).parentNode;
                if (!parentNode || (!parentNode.attributes["Custom Presentation"])) {
                    isFloatingCustom = lockedMode;
                    style = {
                        width: node.size.width + 'px',
                        height: node.size.height + 'px',
                        maxWidth: node.size.width + 'px',
                        maxHeight: node.size.height + 'px',
                        margin: "auto",
                    };
                }
            }
        }
        return (<>
            <style dangerouslySetInnerHTML={{ __html: keyframe }} />
            <div
                style={style}
                onClick={onClick}
                onMouseUp={isCustomView ? undefined : onMouseUp}
                onMouseMove={onSelectionMove}
                onMouseDown={onMouseDown}
                className={cl + " " + (!isCustomView && patch === selectedPatch ? "selected-patch " : "") + (isCustomView ? "" : " border border-zinc-900 ") + (" flex flex-col relative w-full ") + (presentationMode ? " presentation " : "") + (lockedMode ? "locked" : "") + (isCustomView ? "" : " tile") + (isCustomView ? " custom-view" : "")

                }>
                {!isCustomView && <>
                    <div
                        onMouseDown={(e: any) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResizingPatch({
                                startPosition: { x: e.pageX, y: e.pageY },
                                gridTemplate, resizeType: PatchResizeType.South
                            });
                        }}
                        className="w-full h-1 absolute bottom-0 cursor-ns-resize z-30" />
                    <div
                        onMouseDown={(e: any) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResizingPatch({
                                startPosition: { x: e.pageX, y: e.pageY },
                                gridTemplate, resizeType: PatchResizeType.North
                            });
                        }}
                        className="w-full h-1 absolute top-0 cursor-ns-resize z-30" />
                    <div
                        onMouseDown={(e: any) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResizingPatch({
                                startPosition: { x: e.pageX, y: e.pageY },
                                gridTemplate, resizeType: PatchResizeType.East
                            });
                        }}
                        className="h-full w-1 absolute right-0 cursor-ew-resize z-30" />
                    {!isCustomView && <div
                        onMouseDown={(e: any) => {

                            e.preventDefault();
                            e.stopPropagation();
                            setResizingPatch({
                                startPosition: { x: e.pageX, y: e.pageY },
                                gridTemplate, resizeType: PatchResizeType.West
                            })
                        }}
                        className="h-full w-1 absolute left-0 cursor-ew-resize z-30" />}
                </>}


                <PatchInner visibleObjectNodes={visibleObjectNodes} index={index} isCustomView={isCustomView} zoomRef={zoomRef} zoomableRef={zoomableRef} />
                {
                    !isCustomView && <>
                        {selectedPatch === patch ? <Toolbar patch={patch} /> : ''}
                    </>
                }
            </div>
        </>);
    }, [maxWidth, setDraggingCable, gridTemplate, maxHeight, selectedPatch, visibleObjectNodes, index, isCustomView, selection, rootTile, lockedMode, presentationMode, lockedMode]);

    return mem;
};

export default PatchComponent;
