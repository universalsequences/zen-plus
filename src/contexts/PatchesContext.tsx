import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';
import { Tile } from '@/lib/tiling/types';
import { TileNode } from '@/lib/tiling/TileNode';

export type Connections = {
    [x: string]: IOConnection[];
}

interface IPatchesContext {
    zenCode: string | null;
    visualsCode: string | null;
    audioWorklet: AudioWorkletNode | null;
    setAudioWorklet: (x: AudioWorkletNode | null) => void;
    liftPatchTile: (x: Patch) => void;
    selectedPatch: Patch | null;
    closePatch: (x: Patch) => void;
    setSelectedPatch: (x: Patch | null) => void;
    basePatch: Patch;
    patches: Patch[];
    expandPatch: (node: ObjectNode, replace?: boolean) => void;
    setPatches: (x: Patch[]) => void;
    gridTemplate: string;
    gridLayout: GridLayout[];
    setGridTemplate: (x: string) => void;
    rootTile: TileNode | null;
    changeTileForPatch: (a: Patch, b: Patch) => void;
    switchTileDirection: () => void;
}

interface Props {
    children: React.ReactNode;
    basePatch: Patch;
}

const PatchesContext = createContext<IPatchesContext | undefined>(undefined);

export const usePatches = (): IPatchesContext => {
    const context = useContext(PatchesContext);
    if (!context) throw new Error('useMessageHandler must be used within MessageProvider');
    return context;
};

type GridLayout = { gridArea: string };

export const PatchesProvider: React.FC<Props> = ({ children, ...props }) => {
    const [basePatch, setBasePatch] = useState<Patch>(props.basePatch);
    const [patches, setPatches] = useState<Patch[]>([basePatch]);
    const [audioWorklet, setAudioWorklet] = useState<AudioWorkletNode | null>(null);
    const [gridTemplate, setGridTemplate] = useState("1fr 1fr");
    const [selectedPatch, setSelectedPatch] = useState<Patch | null>(null);
    const [zenCode, setZenCode] = useState<string | null>(null);
    const [visualsCode, setVisualsCode] = useState<string | null>(null);
    const [gridLayout, setGridLayout] = useState<GridLayout[]>([{ gridArea: "1/1/1/1" }]);

    const [rootTile, setRootTile] = useState<Tile | null>(null);

    useEffect(() => {
        if (patches.length === 1) {
            let patch = patches[0];
            let _rootTile = new TileNode(patch, null);
            rootTileRef.current = _rootTile;
            setRootTile(_rootTile);
        } else {
            resetRoot();
        }
    }, [patches, setRootTile]);

    const resetRoot = useCallback(() => {
        if (rootTileRef.current) {
            let _rootTile = new TileNode(rootTileRef.current.patch, null);
            _rootTile.children = rootTileRef.current.children;
            _rootTile.splitDirection = rootTileRef.current.splitDirection;
            _rootTile.id = rootTileRef.current.id;
            setRootTile(_rootTile);
            console.log('setting root tile', _rootTile);
            rootTileRef.current = _rootTile;
        }

    }, [setRootTile]);

    let rootTileRef = useRef<Tile | null>(rootTile);

    let flag = useRef(true);

    const switchTileDirection = useCallback(() => {
        if (selectedPatch) {
            if (rootTile) {
                let existingTile = rootTile.findPatch(selectedPatch);
                if (existingTile && existingTile.parent) {
                    let splitDirection = existingTile.parent.splitDirection;
                    existingTile.parent.splitDirection = splitDirection === "vertical" ? "horizontal" : "vertical";
                    if (!existingTile.parent.parent) {
                        rootTileRef.current = existingTile.parent;
                    }
                    resetRoot();
                    setPatches([...patches]);
                    return;
                }
            }

        }
    }, [selectedPatch, rootTile, setRootTile, setPatches, patches]);

    const expandPatch = useCallback((objectNode: ObjectNode, replace?: boolean) => {
        if (!rootTileRef.current) {
            return;
        }
        let includes = rootTileRef.current.findPatch(objectNode.subpatch as Patch);
        console.log('expand patch=', objectNode);
        console.log('includes=', includes);
        if (objectNode.subpatch && !includes) {
            console.log('had a subpatch...');
            //if (patches.length === 2) {
            //    setPatches([patches[0], objectNode.subpatch]);
            //} else {
            //updateGridLayout([...patches, objectNode.subpatch]);
            patches.forEach(p => p.viewed = true);
            if (rootTile) {
                let existingTile = rootTile.findPatch(objectNode.subpatch);
                if (existingTile) {
                    console.log('exisitng patch so we gonna select...');
                    setSelectedPatch(objectNode.subpatch);
                    return;
                }

                if (replace) {
                    let tile = rootTile.findPatch(objectNode.patch);
                    if (tile) {
                        tile.patch = objectNode.subpatch;
                    }
                    console.log('replace');
                } else {
                    let tile = rootTile.findPatch(objectNode.patch);
                    if (!tile) {
                        let leaves = rootTile.getLeaves();
                        console.log(leaves);
                        leaves.sort((a, b) => a.getDepth() - b.getDepth());
                        tile = leaves[0];
                    }
                    if (tile) {
                        let dir: "vertical" | "horizontal" = tile.parent ? (tile.parent.splitDirection === "vertical" ? "horizontal" : "vertical") : "horizontal";
                        //let dir: "vertical" | "horizontal" = !flag.current ? "vertical" : "horizontal";
                        console.log("splitting direction=", dir);
                        tile.split(dir, objectNode.subpatch);
                    }
                }
            }
            flag.current = !flag.current;
            patches.forEach(p => p.viewed = true);
            objectNode.subpatch.viewed = false;
            setPatches([...patches, objectNode.subpatch]);
            // }
        }
    }, [setPatches, patches, setGridLayout, rootTile]);

    const closePatch = useCallback((patch: Patch) => {
        let rootTile = rootTileRef.current;
        if (rootTile) {
            let tile = rootTile.findPatch(patch);
            if (tile && tile.parent) {
                let child = tile.parent.children.find(x => x.patch !== patch);
                if (child) {
                    tile.parent.patch = child.patch;
                    tile.parent.children = child.children;
                }
            } else {
            }
        }
        let _p = patches.filter(x => x !== patch);
        if (_p.length === 0) {
            _p = [(patch as any).parentPatch];
        }
        setPatches(_p);
        resetRoot();
    }, [setPatches, patches, setGridLayout, rootTile, setRootTile]);

    const changeTileForPatch = useCallback((a: Patch, b: Patch) => {
        if (patches.includes(b)) {
            closePatch(a);
            return;
        }

        if (rootTileRef.current) {
            let tile = rootTileRef.current.findPatch(a);
            if (tile) {
                tile.patch = b;
                resetRoot();
                setSelectedPatch(b);
                let index = patches.indexOf(a);
                let _patches = [...patches];
                _patches[index] = b;
                setPatches(_patches);
            }
        }
    }, [setRootTile, setPatches, patches]);


    useEffect(() => {
        basePatch.setZenCode = setZenCode;
        basePatch.setVisualsCode = setVisualsCode;
    }, [setZenCode, setVisualsCode]);

    basePatch.setAudioWorklet = setAudioWorklet;

    useEffect(() => {
        if (patches.length > 2) {
            let split = gridTemplate.split(" ");
            let len = split.length;
        }
    }, [patches, setGridTemplate, gridTemplate]);

    const liftPatchTile = useCallback((patch: Patch) => {
        if (rootTileRef.current) {
            let tile = rootTileRef.current.findPatch(patch);
            if (tile && tile.parent) {
                tile.parent.patch = patch;
                let childToKill = tile.parent.children.find(x => x.patch !== patch);
                tile.parent.children = [];
                if (childToKill) {
                    setPatches(patches.filter(x => childToKill && x !== childToKill.patch));
                }
                resetRoot();
            }
        }

    }, [setRootTile, patches, setPatches]);

    return <PatchesContext.Provider
        value={{
            liftPatchTile,
            zenCode,
            selectedPatch,
            setSelectedPatch,
            gridTemplate,
            setGridTemplate,
            audioWorklet,
            setAudioWorklet,
            patches,
            expandPatch,
            basePatch,
            setPatches,
            gridLayout,
            rootTile,
            changeTileForPatch,
            closePatch,
            switchTileDirection,
            visualsCode
        }}>
        {children}
    </PatchesContext.Provider>;
};

