import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react";
import { SubPatch, Patch, IOConnection, ObjectNode } from "@/lib/nodes/types";
import { type Buffer, type Tile, BufferType } from "@/lib/tiling/types";
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
  selectedBuffer: Buffer | null;
  closePatch: (x: Patch) => void;
  setSelectedPatch: (x: Patch | null) => void;
  setSelectedBuffer: (x: Buffer | null) => void;
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
  patchNames: { [x: string]: string };
  setPatchNames: React.Dispatch<React.SetStateAction<{ [x: string]: string }>>;
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
  const [selectedBuffer, setSelectedBuffer] = useState<Buffer | null>(null);
  const [zenCode, setZenCode] = useState<string | null>(null);
  const [visualsCode, setVisualsCode] = useState<string | null>(null);
  const [gridLayout, setGridLayout] = useState<GridLayout[]>([{ gridArea: "1/1/1/1" }]);
  const [patchNames, setPatchNames] = useState<{ [x: string]: string }>({});

  const [counter, setCounter] = useState(0);
  const [rootTile, setRootTile] = useState<Tile | null>(null);

  useEffect(() => {
    if (patches.length === 1) {
      let patch = patches[0];

      // Create a buffer for the patch
      const buffer = {
        id: patch.id,
        type: BufferType.Patch,
        patch: patch,
        name: patch.name || "Untitled Patch",
      };

      // Create a new TileNode with the Buffer
      let _rootTile = new TileNode(buffer, null);
      rootTileRef.current = _rootTile;
      setRootTile(_rootTile);

      // Set both selectedPatch and selectedBuffer for the initial patch
      setSelectedPatch(patch);
      setSelectedBuffer(buffer);
    } else {
      resetRoot();
    }
  }, [patches, setRootTile]);

  const resetRoot = useCallback(() => {
    if (rootTileRef.current) {
      // When resetting, make sure to maintain the buffer if it exists
      const buffer =
        rootTileRef.current.buffer ||
        (rootTileRef.current.patch
          ? {
              id: rootTileRef.current.patch.id,
              type: BufferType.Patch,
              patch: rootTileRef.current.patch,
              name: rootTileRef.current.patch.name || "Untitled Patch",
            }
          : null);

      let _rootTile = new TileNode(buffer, null);
      _rootTile.children = rootTileRef.current.children;
      _rootTile.splitDirection = rootTileRef.current.splitDirection;
      _rootTile.id = rootTileRef.current.id;
      setRootTile(_rootTile);
      rootTileRef.current = _rootTile;
    }
  }, [setRootTile]);

  let rootTileRef = useRef<Tile | null>(rootTile);

  let flag = useRef(true);

  // Declare the liftPatchTile function as a ref to avoid circular dependencies
  const liftPatchTileRef = useRef<(patch: Patch) => void>();

  const goToPreviousPatch = useCallback(() => {
    let popped = patchHistory.current.pop();

    if (popped && selectedPatch && rootTile) {
      let existingTile = rootTile.findPatch(selectedPatch);
      if (existingTile) {
        // Create a buffer for the popped patch
        const poppedBuffer = {
          id: popped.id,
          type: BufferType.Patch,
          patch: popped,
          name: popped.name || "Untitled Patch",
        };

        // Update both buffer and patch for backward compatibility
        existingTile.buffer = poppedBuffer;
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

        // Update both selectedPatch and selectedBuffer
        setSelectedPatch(popped);
        setSelectedBuffer(poppedBuffer);

        resetRoot();

        patchesRef.current = Array.from(new Set(_patches));
        setPatches(Array.from(new Set(_patches)));

        // Use the ref to call liftPatchTile
        if (liftPatchTileRef.current) {
          liftPatchTileRef.current(popped);
        }
      }
    }
  }, [setRootTile, patches, setPatches, rootTile, setSelectedPatch, setSelectedBuffer, resetRoot]);

  const goToParentTile = useCallback(() => {
    if (selectedPatch && rootTile && (selectedPatch as SubPatch).parentPatch) {
      let existingTile = rootTile.findPatch(selectedPatch);
      if (existingTile) {
        const parentPatch = (selectedPatch as SubPatch).parentPatch;

        // Create a buffer for the parent patch
        const parentBuffer = {
          id: parentPatch.id,
          type: BufferType.Patch,
          patch: parentPatch,
          name: parentPatch.name || "Untitled Patch",
        };

        // Update both buffer and patch for backward compatibility
        existingTile.buffer = parentBuffer;
        existingTile.patch = parentPatch;

        // Check if we need to consolidate children
        if (
          existingTile.parent &&
          existingTile.parent.children.length === 2 &&
          (existingTile.parent.children[0].patch === existingTile.parent.children[1].patch ||
            (existingTile.parent.children[0].buffer?.patch ===
              existingTile.parent.children[1].buffer?.patch &&
              existingTile.parent.children[0].buffer?.patch !== undefined))
        ) {
          existingTile.parent.children = [existingTile.parent.children[0]];
          existingTile.parent.size = 100;
        }

        let indexOf = patches.indexOf(selectedPatch);
        if (indexOf > -1) {
          patches[indexOf] = parentPatch;
        }

        // Update both selectedPatch and selectedBuffer
        setSelectedPatch(parentPatch);
        setSelectedBuffer(parentBuffer);

        resetRoot();
        patchesRef.current = Array.from(new Set(patches));
        setPatches(Array.from(new Set(patches)));
        patchHistory.current.push(selectedPatch);
      }
    }
  }, [
    setRootTile,
    patches,
    setPatches,
    rootTile,
    selectedPatch,
    setSelectedPatch,
    setSelectedBuffer,
    resetRoot,
  ]);

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
      if (!rootTileRef.current || !objectNode.subpatch) {
        return;
      }

      // Create a buffer for the subpatch
      const subpatchBuffer = {
        id: objectNode.subpatch.id,
        type: BufferType.Patch,
        patch: objectNode.subpatch,
        name: objectNode.subpatch.name || "Untitled Patch",
      };

      // Check if this buffer/patch already exists in a tile
      let includes = rootTileRef.current.findPatch(objectNode.subpatch as Patch);
      if (objectNode.subpatch && !includes) {
        objectNode.subpatch.justExpanded = true;
        patches.forEach((p) => (p.viewed = true));
        let rootTile = rootTileRef.current;
        if (rootTile) {
          let allTiles: Tile[] = patchesRef.current
            .map((x: Patch) => rootTile.findPatch(x))
            .filter((x) => x) as Tile[];
          allTiles.sort((a: Tile, b: Tile) => a.getDepth() - b.getDepth());
          let existingTile = rootTile.findPatch(objectNode.subpatch);
          if (existingTile) {
            // Update both selectedPatch and selectedBuffer
            setSelectedPatch(objectNode.subpatch);
            setSelectedBuffer(existingTile.buffer);
            return;
          }

          if (replace) {
            let tile = rootTile.findPatch(objectNode.patch);
            if (tile) {
              // Update both buffer and patch (for backward compatibility)
              tile.buffer = subpatchBuffer;
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

              // Use the buffer for the split
              tile.split(dir, subpatchBuffer);
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

        // Update both selectedPatch and selectedBuffer
        if (objectNode.subpatch) {
          setSelectedPatch(objectNode.subpatch);
          setSelectedBuffer(subpatchBuffer);
        }
      }
    },
    [setPatches, patches, setSelectedPatch, setSelectedBuffer, setGridLayout, rootTile],
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
            // Use both buffer and patch checks for filtering
            rootTile.children = tile.parent.children.filter(
              (x) => x.patch !== patch && (!x.buffer || x.buffer.patch !== patch),
            );
          } else if (tile.children.length === 0) {
            // Use both buffer and patch checks for filtering
            tile.parent.children = tile.parent.children.filter(
              (x) => x.patch !== patch && (!x.buffer || x.buffer.patch !== patch),
            );

            if (tile.parent.parent === null) {
              tile.parent = tile.parent.children[0];

              // Set both buffer and patch for backward compatibility
              if (tile.parent.buffer) {
                tile.parent.patch = tile.parent.buffer.patch;
              } else if (tile.parent.patch) {
                tile.parent.buffer = {
                  id: tile.parent.patch.id,
                  type: BufferType.Patch,
                  patch: tile.parent.patch,
                  name: tile.parent.patch.name || "Untitled Patch",
                };
              }

              tile.parent.children = [];
            }
          } else {
            // Find child that doesn't have the patch we're closing
            let child = tile.parent.children.find(
              (x) => x.patch !== patch && (!x.buffer || x.buffer.patch !== patch),
            );

            if (child) {
              // Set both buffer and patch for backward compatibility
              if (child.buffer) {
                tile.parent.buffer = child.buffer;
                tile.parent.patch = child.buffer.patch;
              } else if (child.patch) {
                tile.parent.buffer = {
                  id: child.patch.id,
                  type: BufferType.Patch,
                  patch: child.patch,
                  name: child.patch.name || "Untitled Patch",
                };
                tile.parent.patch = child.patch;
              }

              tile.parent.children = child.children;
            }
          }
        }
      }

      let _p = patchesRef.current.filter((x) => x !== patch);
      if (_p.length === 0) {
        _p = [(patch as any).parentPatch];
      }
      patchesRef.current = _p;
      resetRoot();

      setPatches(_p);

      // Update both selectedPatch and selectedBuffer
      const newPatch = _p[0];
      setSelectedPatch(newPatch);

      // Find the buffer for the new patch
      if (rootTile) {
        const newTile = rootTile.findPatch(newPatch);
        if (newTile && newTile.buffer) {
          setSelectedBuffer(newTile.buffer);
        } else {
          // Create a new buffer if needed
          const newBuffer = {
            id: newPatch.id,
            type: BufferType.Patch,
            patch: newPatch,
            name: newPatch.name || "Untitled Patch",
          };
          setSelectedBuffer(newBuffer);
        }
      }
    },
    [
      setPatches,
      patches,
      setSelectedPatch,
      setSelectedBuffer,
      setGridLayout,
      rootTile,
      setRootTile,
    ],
  );

  let patchesRef = useRef<Patch[]>([]);
  useEffect(() => {
    patchesRef.current = [...patches];
  }, [patches]);

  const changeTileForPatch = useCallback(
    (a: Patch, b: Patch) => {
      if (patchesRef.current.includes(b)) {
        closePatch(a);
        return;
      }

      if (rootTileRef.current) {
        let tile = rootTileRef.current.findPatch(a);
        if (tile) {
          // Create a new buffer for the new patch
          const newBuffer = {
            id: b.id,
            type: BufferType.Patch,
            patch: b,
            name: b.name || "Untitled Patch",
          };

          // Update both buffer and patch (for backward compatibility)
          tile.buffer = newBuffer;
          tile.patch = b;

          resetRoot();

          // Update both selectedPatch and selectedBuffer
          setSelectedPatch(b);
          setSelectedBuffer(newBuffer);

          let index = patches.indexOf(a);
          let _patches = [...patches];
          _patches[index] = b;

          patchesRef.current = _patches;
          setPatches(_patches);
        }
      }
    },
    [setRootTile, setPatches, patches, setSelectedPatch, setSelectedBuffer, closePatch, resetRoot],
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
            // Create a buffer for the parent patch
            const parentBuffer = {
              id: parentPatch.id,
              type: BufferType.Patch,
              patch: parentPatch,
              name: parentPatch.name || "Untitled Patch",
            };

            let parentTile = tile.parent;
            tile.split(
              parentTile && parentTile.splitDirection === "horizontal" ? "vertical" : "horizontal",
              parentBuffer,
            );

            patchesRef.current = [...patches, parentPatch];
            setPatches([...patches, parentPatch]);
            resetRoot();
          }
        }
      }
    }
  }, [rootTile, selectedPatch, patches, setPatches, resetRoot]);

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
      if (rootTileRef.current) {
        let tile = rootTileRef.current.findPatch(patch);
        if (tile && tile.parent) {
          // Create a buffer for the patch
          const patchBuffer = {
            id: patch.id,
            type: BufferType.Patch,
            patch: patch,
            name: patch.name || "Untitled Patch",
          };

          // Set both buffer and patch for backward compatibility
          tile.parent.buffer = patchBuffer;
          tile.parent.patch = patch;

          // Find child to remove
          let childToKill = tile.parent.children.find(
            (x) => x.patch !== patch && (!x.buffer || x.buffer.patch !== patch),
          );

          // Clear children
          tile.parent.children = [];

          if (tile.parent.parent === null) {
            patchesRef.current = [patch];
            setPatches([patch]);
          } else {
            if (childToKill) {
              // Filter out patches from the killed child
              const childPatch = childToKill.buffer?.patch || childToKill.patch;
              if (childPatch) {
                let newPatches = patches.filter((x) => x !== childPatch);
                patchesRef.current = [...newPatches];
                setPatches(newPatches);
              }
            }
          }
          resetRoot();
        }

        setTimeout(() => {
          // Update both selectedPatch and selectedBuffer
          setSelectedPatch(patch);

          // Find or create the buffer for this patch
          const patchBuffer = {
            id: patch.id,
            type: BufferType.Patch,
            patch: patch,
            name: patch.name || "Untitled Patch",
          };
          setSelectedBuffer(patchBuffer);
        }, 200);
      }
    },
    [setRootTile, patches, setPatches, setSelectedPatch, setSelectedBuffer, resetRoot],
  );

  // Update the ref to point to the actual function
  useEffect(() => {
    liftPatchTileRef.current = liftPatchTile;
  }, [liftPatchTile]);

  return (
    <PatchesContext.Provider
      value={{
        setPatchNames,
        patchNames,
        liftPatchTile,
        zenCode,
        selectedPatch,
        setSelectedPatch,
        selectedBuffer,
        setSelectedBuffer,
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
