import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react";
import { SubPatch, Patch, IOConnection, ObjectNode } from "@/lib/nodes/types";
import { Tile } from "@/lib/tiling/types";
import { TileNode } from "@/lib/tiling/TileNode";

export type Connections = {
  [x: string]: IOConnection[];
};

interface IPatchesContext {
  zenCode: string | null;
  goToParentTile: () => void;
  splitTile: () => void;
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
  goToPreviousPatch: () => void;
  switchTileDirection: () => void;
  resizeTile: (x: number) => void;
  patchDragging: Patch | undefined;
  setPatchDragging: (x: Patch | undefined) => void;
  counter: number;
  setCounter: React.Dispatch<React.SetStateAction<number>>;
}

interface Props {
  children: React.ReactNode;
  basePatch: Patch;
}

const PatchesContext = createContext<IPatchesContext | undefined>(undefined);

export const usePatches = (): IPatchesContext => {
  const context = useContext(PatchesContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

type GridLayout = { gridArea: string };

export const PatchesProvider: React.FC<Props> = ({ children, ...props }) => {
  const [basePatch, setBasePatch] = useState<Patch>(props.basePatch);
  const [patchDragging, setPatchDragging] = useState<Patch | undefined>();
  const [patches, setPatches] = useState<Patch[]>([basePatch]);
  const [audioWorklet, setAudioWorklet] = useState<AudioWorkletNode | null>(null);
  const [gridTemplate, setGridTemplate] = useState("1fr 1fr");
  const [selectedPatch, setSelectedPatch] = useState<Patch | null>(null);
  const [zenCode, setZenCode] = useState<string | null>(null);
  const [visualsCode, setVisualsCode] = useState<string | null>(null);
  const [gridLayout, setGridLayout] = useState<GridLayout[]>([{ gridArea: "1/1/1/1" }]);

  const [counter, setCounter] = useState(0);
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
      rootTileRef.current = _rootTile;
    }
  }, [setRootTile]);

  let rootTileRef = useRef<Tile | null>(rootTile);

  let flag = useRef(true);

  const goToPreviousPatch = useCallback(() => {
    let popped = patchHistory.current.pop();

    if (popped && selectedPatch && rootTile) {
      let existingTile = rootTile.findPatch(selectedPatch);
      if (existingTile) {
        existingTile.patch = popped;
        let indexOf = patches.indexOf(selectedPatch);
        if (indexOf > -1) {
          patches[indexOf] = popped;
        }

        let _patches = [...patches];
        if (
          existingTile.parent &&
          existingTile.parent.children[0] === existingTile.parent.children[1]
        ) {
          _patches = Array.from(new Set(patches));
          existingTile.parent.children = [existingTile.parent.children[0]];
        }

        setSelectedPatch(popped);
        resetRoot();

        patchesRef.current = Array.from(new Set(_patches));
        setPatches(Array.from(new Set(_patches)));
        liftPatchTile(popped);
      }
    }
  }, [setRootTile, patches, setPatches, rootTile]);

  const goToParentTile = useCallback(() => {
    if (selectedPatch && rootTile && (selectedPatch as SubPatch).parentPatch) {
      let existingTile = rootTile.findPatch(selectedPatch);
      if (existingTile) {
        existingTile.patch = (selectedPatch as SubPatch).parentPatch;
        if (
          existingTile.parent &&
          existingTile.parent.children.length === 2 &&
          existingTile.parent.children[0].patch === existingTile.parent.children[1].patch
        ) {
          existingTile.parent.children = [existingTile.parent.children[0]];
          existingTile.parent.size = 100;
        }
        let indexOf = patches.indexOf(selectedPatch);
        if (indexOf > -1) {
          patches[indexOf] = existingTile.patch;
        }

        setSelectedPatch((selectedPatch as SubPatch).parentPatch);
        resetRoot();
        patchesRef.current = Array.from(new Set(patches));
        setPatches(Array.from(new Set(patches)));
        patchHistory.current.push(selectedPatch);
      }
    }
  }, [setRootTile, patches, setPatches, rootTile]);

  const patchHistory = useRef<Patch[]>([]);

  useEffect(() => {
    if (selectedPatch) {
    }
  }, [selectedPatch]);

  const resizeTile = useCallback(
    (off: number) => {
      if (selectedPatch) {
        if (rootTile) {
          let existingTile = rootTile.findPatch(selectedPatch);
          let parent = null;
          if (existingTile) {
            parent = existingTile.parent;
            if (parent) {
              let _off = parent.children.indexOf(existingTile) === 0 ? -4 : -4;
              parent.size += off * _off;
              resetRoot();
            }
          }
        }
      }
    },
    [rootTile, resetRoot, setPatches, selectedPatch],
  );

  const switchTileDirection = useCallback(() => {
    if (selectedPatch) {
      if (rootTile) {
        let existingTile = rootTile.findPatch(selectedPatch);
        if (existingTile && existingTile.parent) {
          let splitDirection = existingTile.parent.splitDirection;
          existingTile.parent.splitDirection =
            splitDirection === "vertical" ? "horizontal" : "vertical";
          if (!existingTile.parent.parent) {
            rootTileRef.current = existingTile.parent;
          }
          resetRoot();
          patchesRef.current = [...patches];
          setPatches([...patches]);
          return;
        }
      }
    }
  }, [selectedPatch, rootTile, setRootTile, setPatches, patches]);

  const expandPatch = useCallback(
    (objectNode: ObjectNode, replace?: boolean) => {
      if (!rootTileRef.current) {
        console.log("none...");
        return;
      }
      let includes = rootTileRef.current.findPatch(objectNode.subpatch as Patch);
      if (objectNode.subpatch && !includes) {
        objectNode.subpatch.justExpanded = true;
        patches.forEach((p) => (p.viewed = true));
        let rootTile = rootTileRef.current;
        if (rootTile) {
          console.log("adding to root tile");
          let allTiles: Tile[] = patchesRef.current
            .map((x: Patch) => rootTile.findPatch(x))
            .filter((x) => x) as Tile[];
          allTiles.sort((a: Tile, b: Tile) => a.getDepth() - b.getDepth());
          let existingTile = rootTile.findPatch(objectNode.subpatch);
          console.log("existing tile=", existingTile);
          if (existingTile) {
            setSelectedPatch(objectNode.subpatch);
            return;
          }

          if (replace) {
            let tile = rootTile.findPatch(objectNode.patch);
            if (tile) {
              tile.patch = objectNode.subpatch;
            }
          } else {
            let tile = rootTile.findPatch(objectNode.patch);
            if (true) {
              // !tile) {
              let leaves = rootTile.getLeaves();
              let _leaves = leaves.sort((a, b) => {
                return a.getDepth() - b.getDepth();
              });
              if (_leaves[0]) {
                tile = _leaves[0];
              }
            }
            if (!tile) {
              tile = rootTile;
            }
            if (tile) {
              let dir: "vertical" | "horizontal" = tile.parent
                ? tile.parent.splitDirection === "vertical"
                  ? "horizontal"
                  : "vertical"
                : "horizontal";
              //let dir: "vertical" | "horizontal" = !flag.current ? "vertical" : "horizontal";
              tile.split(dir, objectNode.subpatch);
            }
          }
        }
        flag.current = !flag.current;
        patches.forEach((p) => (p.viewed = true));
        objectNode.subpatch.viewed = false;

        if (objectNode.subpatch.objectNodes.some((x) => x.attributes["Include in Presentation"])) {
          //objectNode.subpatch.presentationMode = true;
        }
        if (replace) {
          patchesRef.current = [objectNode.subpatch];
          setPatches([objectNode.subpatch]);
        } else {
          patchesRef.current = [...patches, objectNode.subpatch];
          setPatches([...patches, objectNode.subpatch]);
        }
        if (objectNode.subpatch) {
          setSelectedPatch(objectNode.subpatch);
        }
      }
      console.log("patches ref = ", patchesRef.current);
    },
    [setPatches, patches, setSelectedPatch, setGridLayout, rootTile],
  );

  const closePatch = useCallback(
    (patch: Patch) => {
      let rootTile = rootTileRef.current;
      if (rootTile) {
        let tile = rootTile.findPatch(patch);
        if (tile && tile.parent) {
          if (tile.parent.parent === null) {
            if (patches.length === 1) {
              return;
            }
            rootTile.children = tile.parent.children.filter((x) => x.patch !== patch);
            // tile.parent.children = tile.parent.children.filter(x => x.patch !== patch);
          } else if (tile.children.length === 0) {
            tile.parent.children = tile.parent.children.filter((x) => x.patch !== patch);
            if (tile.parent.parent === null) {
              tile.parent = tile.parent.children[0];
              tile.parent.patch = tile.parent.children[0].patch;
              tile.parent.children = [];
            }
          } else {
            let child = tile.parent.children.find((x) => x.patch !== patch);
            if (child) {
              tile.parent.patch = child.patch;
              tile.parent.children = child.children;
            }
          }
        } else {
        }
      }
      let _p = patchesRef.current.filter((x) => x !== patch);
      if (_p.length === 0) {
        _p = [(patch as any).parentPatch];
      }
      console.log("setting patches ref=", _p);
      patchesRef.current = _p;
      resetRoot();

      setPatches(_p);
      setSelectedPatch(_p[0]);
    },
    [setPatches, patches, setSelectedPatch, setGridLayout, rootTile, setRootTile],
  );

  let patchesRef = useRef<Patch[]>([]);
  useEffect(() => {
    patchesRef.current = [...patches];
  }, [patches]);

  const changeTileForPatch = useCallback(
    (a: Patch, b: Patch) => {
      console.log("changeTileForPatch", a, b);
      if (patchesRef.current.includes(b)) {
        closePatch(a);
        console.log("closing patch", patchesRef.current, b);
        return;
      }

      if (rootTileRef.current) {
        let tile = rootTileRef.current.findPatch(a);
        if (tile) {
          tile.patch = b;
          console.log("choosing tile=", tile);
          resetRoot();
          setSelectedPatch(b);
          let index = patches.indexOf(a);
          let _patches = [...patches];
          _patches[index] = b;

          patchesRef.current = _patches;
          setPatches(_patches);
        }
      }
    },
    [setRootTile, setPatches, patches],
  );

  const splitTile = useCallback(() => {
    if (rootTileRef.current && selectedPatch) {
      let tile = rootTileRef.current.findPatch(selectedPatch);
      if (selectedPatch && tile) {
        let parentPatch = (selectedPatch as SubPatch).parentPatch;
        if (parentPatch) {
          if (patches.includes(parentPatch)) {
            parentPatch = (parentPatch as SubPatch).parentPatch;
          }
          if (parentPatch && !patches.includes(parentPatch)) {
            let parentTile = tile.parent;
            tile.split(
              parentTile && parentTile.splitDirection === "horizontal" ? "vertical" : "horizontal",
              parentPatch,
            );

            patchesRef.current = [...patches, parentPatch];
            setPatches([...patches, parentPatch]);
            resetRoot();
          } else {
          }
        }
      }
      /*
            if (tile && tile.parent) {
                tile.parent.patch = patch;
                let childToKill = tile.parent.children.find(x => x.patch !== patch);
                tile.parent.children = [];
                if (childToKill) {
                    setPatches(patches.filter(x => childToKill && x !== childToKill.patch));
                }
                resetRoot();
            }
            */
    }
  }, [rootTile, selectedPatch]);

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

  const liftPatchTile = useCallback(
    (patch: Patch) => {
      console.log("lifting patch tile");
      if (rootTileRef.current) {
        let tile = rootTileRef.current.findPatch(patch);
        if (tile && tile.parent) {
          tile.parent.patch = patch;
          let childToKill = tile.parent.children.find((x) => x.patch !== patch);
          tile.parent.children = [];
          if (tile.parent.parent === null) {
            patchesRef.current = [patch];
            console.log("patches=", patch);
            setPatches([patch]);
          } else {
            if (childToKill) {
              let newPatches = patches.filter((x) => childToKill && x !== childToKill.patch);
              patchesRef.current = [...newPatches];
              console.log("patches=", newPatches);
              setPatches(newPatches);
            }
          }
          resetRoot();
        } else {
        }
        setTimeout(() => {
          setSelectedPatch(patch);
        }, 200);
      }
    },
    [setRootTile, patches, setPatches, setSelectedPatch],
  );

  return (
    <PatchesContext.Provider
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
        visualsCode,
        goToParentTile,
        resizeTile,
        goToPreviousPatch,
        splitTile,
        patchDragging,
        setPatchDragging,
        counter,
        setCounter,
      }}
    >
      {children}
    </PatchesContext.Provider>
  );
};
