import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react";
import { SubPatch, Patch, IOConnection, ObjectNode } from "@/lib/nodes/types";
import { type Buffer, type Tile, BufferType } from "@/lib/tiling/types";
import { TileNode } from "@/lib/tiling/TileNode";
import { uuid } from "@/lib/uuid/IDGenerator";

export type Connections = {
  [x: string]: IOConnection[];
};

interface IPatchesContext {
  zenCode: string | null;
  goToParentTile: () => void;
  splitTile: (direction?: "vertical" | "horizontal") => void;
  visualsCode: string | null;
  audioWorklet: AudioWorkletNode | null;
  setAudioWorklet: (x: AudioWorkletNode | null) => void;
  liftPatchTile: (x: Buffer) => void;
  selectedPatch: Patch | null;
  selectedBuffer: Buffer | null;
  closePatch: (x: Patch) => void;
  closeTile: (tile: Tile) => void;
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
  createDiredBuffer: () => void;
  createBufferListBuffer: () => void;
  createWorkletCodeBuffer: () => void;
  switchToBuffer: (buffer: Buffer, newTile?: boolean) => void;
  killCurrentBuffer: () => void;
  goToPreviousPatch: () => void;
  switchTileDirection: () => void;
  resizeTile: (x: number) => void;
  patchDragging: Patch | undefined;
  setPatchDragging: (x: Patch | undefined) => void;
  counter: number;
  setCounter: React.Dispatch<React.SetStateAction<number>>;
  patchNames: { [x: string]: string };
  setPatchNames: React.Dispatch<React.SetStateAction<{ [x: string]: string }>>;
  workingBuffers: Buffer[];
  setWorkingBuffers: React.Dispatch<React.SetStateAction<Buffer[]>>;
  renamePatch: (patch: Patch, newName: string) => void;
  getAllTilesWithBuffer: (x: string) => Tile[];
  visibleBuffers: Buffer[];
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
  const [workingBuffers, setWorkingBuffers] = useState<Buffer[]>([]);
  const [visibleBuffers, setVisibleBuffers] = useState<Buffer[]>([]);

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

      // Add to working buffers
      setWorkingBuffers((prev) =>
        prev.some((x) => x.id === buffer.id) ? prev : [...prev, buffer],
      );
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
      rootTileRef.current = _rootTile;
      setVisibleBuffers(_rootTile.getAllBuffers());
      setRootTile(_rootTile);
    }
  }, []);

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
        setWorkingBuffers((prev) => [parentBuffer, ...prev]);

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

          // Add to working buffers list
          setWorkingBuffers((prevBuffers) => {
            // Add the buffer at the start of the array
            const updatedBuffers = [
              subpatchBuffer,
              ...prevBuffers.filter((b) => b.id !== subpatchBuffer.id),
            ];
            // Limit to most recent 10 buffers if needed
            return updatedBuffers.slice(0, 10);
          });
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
      setWorkingBuffers,
    ],
  );

  // Generic function to close a tile
  const closeTile = useCallback(
    (tile: Tile) => {
      if (!rootTileRef.current || !tile) {
        return;
      }

      // Buffer to update workingBuffers if needed
      let bufferToRemove: Buffer | null = null;
      if (tile.buffer) {
        bufferToRemove = tile.buffer;
      }

      // Root level handling
      if (tile.parent === null) {
        return; // Cannot close root tile
      }

      // Handle case where tile is the only child
      if (tile.parent.children.length <= 1) {
        // Cannot remove the only child - must have a parent with multiple children
        return;
      }

      // Find the sibling tile
      const siblingTile = tile.parent.children.find((child) => child !== tile);

      if (siblingTile) {
        // Make the parent adopt the sibling's content
        if (siblingTile.buffer) {
          tile.parent.buffer = siblingTile.buffer;
          if (siblingTile.buffer.type === BufferType.Patch && siblingTile.buffer.patch) {
            tile.parent.patch = siblingTile.buffer.patch;
          } else {
            tile.parent.patch = null;
          }
        } else if (siblingTile.patch) {
          tile.parent.patch = siblingTile.patch;
          tile.parent.buffer = {
            id: siblingTile.patch.id,
            type: BufferType.Patch,
            patch: siblingTile.patch,
            name: siblingTile.patch.name || "Untitled Patch",
          };
        }

        // Parent adopts the children of the sibling
        tile.parent.children = siblingTile.children;

        // If the sibling has no children, clear the parent's children
        if (siblingTile.children.length === 0) {
          tile.parent.children = [];
        }

        // If we're closing the selected buffer/tile, select the parent
        if (selectedBuffer && bufferToRemove && selectedBuffer.id === bufferToRemove.id) {
          if (tile.parent.buffer) {
            setSelectedBuffer(tile.parent.buffer);
          }
          if (tile.parent.patch) {
            setSelectedPatch(tile.parent.patch);
          }
        }

        // Update working buffers if needed
        if (bufferToRemove) {
          // Only remove from working buffers if it's not used elsewhere
          const tilesWithBuffer = getAllTilesWithBuffer(bufferToRemove.id);
          if (tilesWithBuffer.length <= 1) {
            // Only this tile has it
            /*
          setWorkingBuffers(prevBuffers => {
            return prevBuffers.filter(b => b.id !== bufferToRemove!.id);
          });
          */
          }
        }

        // Update patches list if needed
        if (tile.patch) {
          const patchToRemove = tile.patch;
          let stillInUse = false;

          // Check if this patch is still used in any other tile
          if (rootTileRef.current) {
            const tilesWithPatch = findTilesWithPatch(patchToRemove);
            stillInUse = tilesWithPatch.length > 1; // > 1 because current tile is included
          }

          if (!stillInUse) {
            let _p = patchesRef.current.filter((x) => x !== patchToRemove);
            if (_p.length === 0 && (patchToRemove as any).parentPatch) {
              _p = [(patchToRemove as any).parentPatch];
            }
            patchesRef.current = _p;
            setPatches(_p);
          }
        }

        resetRoot();
      }
    },
    [selectedBuffer, setSelectedBuffer, setSelectedPatch, setWorkingBuffers, resetRoot, setPatches],
  );

  // Function to find all tiles that have a specific patch
  const findTilesWithPatch = useCallback((patch: Patch): Tile[] => {
    if (!rootTileRef.current) {
      return [];
    }

    const result: Tile[] = [];

    const searchTiles = (tile: Tile) => {
      if (tile.patch === patch || tile.buffer?.patch === patch) {
        result.push(tile);
      }

      for (const child of tile.children) {
        searchTiles(child);
      }
    };

    searchTiles(rootTileRef.current);
    return result;
  }, []);

  const closePatch = useCallback(
    (patch: Patch) => {
      let rootTile = rootTileRef.current;
      if (rootTile) {
        let tile = rootTile.findPatch(patch);
        if (tile) {
          closeTile(tile);
        } else {
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
    [setPatches, setSelectedPatch, setSelectedBuffer, rootTile, resetRoot, closeTile],
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

          // Add to working buffers list
          setWorkingBuffers((prevBuffers) => {
            // Add the new buffer at the start of the array
            const updatedBuffers = [
              newBuffer,
              ...prevBuffers.filter((buff) => buff.id !== newBuffer.id),
            ];
            // Limit to most recent 10 buffers if needed
            return updatedBuffers.slice(0, 10);
          });

          let index = patches.indexOf(a);
          let _patches = [...patches];
          _patches[index] = b;

          patchesRef.current = _patches;
          setPatches(_patches);
        }
      }
    },
    [
      setRootTile,
      setPatches,
      patches,
      setSelectedPatch,
      setSelectedBuffer,
      setWorkingBuffers,
      closePatch,
      resetRoot,
    ],
  );

  const splitTile = useCallback(
    (direction?: "horizontal" | "vertical") => {
      if (rootTileRef.current && selectedBuffer) {
        let tile = rootTileRef.current.findBuffer(selectedBuffer.id);
        if (tile && workingBuffers.length >= 2) {
          // Create a buffer for the parent patch
          const parentBuffer = [...workingBuffers]
            .reverse()
            .find((x) => !rootTileRef.current.findBuffer(x.id));

          console.log("parent buffer = ", parentBuffer, selectedBuffer);
          if (parentBuffer) {
            let parentTile = tile.parent;
            tile.split(
              direction
                ? direction
                : parentTile && parentTile.splitDirection === "horizontal"
                  ? "vertical"
                  : "horizontal",
              parentBuffer,
            );

            if (parentBuffer.patch) {
              patchesRef.current = [...patches, parentBuffer.patch];
              setPatches([...patches, parentBuffer.patch]);
            }

            // Add to working buffers list
            setWorkingBuffers((prevBuffers) => {
              // Add the new buffer at the start of the array
              const updatedBuffers = [
                parentBuffer,
                ...prevBuffers.filter((buff) => buff.id !== parentBuffer.id),
              ];
              // Limit to most recent 10 buffers if needed
              return updatedBuffers.slice(0, 10);
            });

            resetRoot();
          }
        }
      }
    },
    [rootTile, selectedPatch, patches, setPatches, resetRoot, setWorkingBuffers, selectedBuffer],
  );

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
    (buffer: Buffer) => {
      if (rootTileRef.current) {
        let tile = rootTileRef.current;
        if (tile) {
          // Create a buffer for the patch

          // Set both buffer and patch for backward compatibility
          tile.buffer = buffer;
          if (buffer.patch) tile.patch = buffer.patch;

          // Clear children
          tile.children = [];

          if (buffer.patch) setPatches([buffer.patch]);
          resetRoot();
        }
      }
    },
    [
      setRootTile,
      patches,
      setPatches,
      setSelectedPatch,
      setSelectedBuffer,
      setWorkingBuffers,
      resetRoot,
    ],
  );

  // Update the ref to point to the actual function
  useEffect(() => {
    liftPatchTileRef.current = liftPatchTile;
  }, [liftPatchTile]);

  // Function to create a new Dired buffer in the currently selected tile
  // or reuse an existing one for the same patch
  const createDiredBuffer = useCallback(() => {
    if (!rootTileRef.current) {
      return;
    }

    // Determine which patch to use for the Dired view
    // Use selectedPatch if available, otherwise use basePatch
    const patchToUse = selectedPatch || basePatch;

    // First check if we already have a Dired buffer for this patch
    const existingDiredBuffer = workingBuffers.find(
      (b) => b.type === BufferType.Dired && b.patch && b.patch.id === patchToUse.id,
    );

    // If we found an existing Dired buffer for this patch, use it
    if (existingDiredBuffer) {
      // Find the currently selected tile
      let selectedTile: Tile | null = null;
      if (selectedBuffer) {
        selectedTile =
          rootTileRef.current.findBuffer(selectedBuffer.id) ||
          (selectedPatch ? rootTileRef.current.findPatch(selectedPatch) : null);
      }

      // Fallback to root tile if no selected tile found
      if (!selectedTile) {
        selectedTile = rootTileRef.current;
      }

      // Replace the current buffer with the existing Dired buffer
      selectedTile.buffer = existingDiredBuffer;

      // Clear patch reference for buffer types other than Patch
      if (existingDiredBuffer.type !== BufferType.Patch) {
        selectedTile.patch = null;
      }

      // Set the buffer as selected
      setSelectedBuffer(existingDiredBuffer);

      // Move to front of working buffers
      setWorkingBuffers((prevBuffers) => {
        return [
          existingDiredBuffer,
          ...prevBuffers.filter((b) => b.id !== existingDiredBuffer.id),
        ].slice(0, 10);
      });

      resetRoot();
      return;
    }

    // Create a new Dired buffer with reference to the patch
    const diredBuffer: Buffer = {
      id: uuid(),
      type: BufferType.Dired,
      name: patchToUse.name ? `Directory: ${patchToUse.name}` : "Directory Browser",
      patch: patchToUse, // Set the patch reference
    };

    // Find the currently selected tile (the one with the currently selected buffer)
    let selectedTile: Tile | null = null;

    if (selectedBuffer) {
      // First, try to find by buffer ID (most accurate)
      selectedTile = rootTileRef.current.findBuffer(selectedBuffer.id);

      if (!selectedTile && selectedPatch) {
        // If not found by buffer, try finding by patch
        selectedTile = rootTileRef.current.findPatch(selectedPatch);
      }
    }

    // Fallback to root tile if no selected tile found
    if (!selectedTile) {
      selectedTile = rootTileRef.current;
    }

    // Replace the current buffer with the new Dired buffer
    selectedTile.buffer = diredBuffer;

    // Clear patch reference for buffer types other than Patch
    if (diredBuffer.type !== BufferType.Patch) {
      selectedTile.patch = null;
    }

    // Set the new buffer as selected
    setSelectedBuffer(diredBuffer);

    // Add to or update working buffers list
    setWorkingBuffers((prevBuffers) => {
      // Add the new buffer at the start of the array
      const updatedBuffers = [diredBuffer, ...prevBuffers.filter((b) => b.id !== diredBuffer.id)];
      // Limit to most recent 10 buffers if needed
      return updatedBuffers.slice(0, 10);
    });

    resetRoot();
  }, [
    rootTile,
    selectedBuffer,
    selectedPatch,
    basePatch,
    setSelectedBuffer,
    setWorkingBuffers,
    resetRoot,
    workingBuffers,
  ]);

  // Forward declare the switchToBuffer function
  let switchToBufferFn: (buffer: Buffer, newTile?: boolean) => void;

  // Function to create a WorkletCode buffer that displays the current patch's worklet code
  const createWorkletCodeBuffer = useCallback(() => {
    const selectedBuffer = selectedBufferRef.current;
    if (!rootTileRef.current || !selectedBuffer) {
      return;
    }

    // Get the currently selected patch (if any)
    const patchToUse = selectedBuffer.patch || selectedPatch;
    if (!patchToUse) {
      console.log("No patch selected to show worklet code for");
      return;
    }

    // Check if we already have a WorkletCode buffer for this patch
    const existingWorkletCodeBuffer = workingBuffers.find(
      (b) => b.type === BufferType.WorkletCode && b.patch && b.patch.id === patchToUse.id,
    );

    // If we found an existing WorkletCode buffer, use it
    if (existingWorkletCodeBuffer) {
      switchToBufferFn(existingWorkletCodeBuffer);
      return;
    }

    // Create a new WorkletCode buffer
    const workletCodeBuffer: Buffer = {
      id: uuid(),
      type: BufferType.WorkletCode,
      name: `Worklet Code: ${patchToUse.name || "Unnamed Patch"}`,
      patch: patchToUse,
    };

    // Find the currently selected tile
    let selectedTile: Tile | null = null;

    if (selectedBuffer) {
      // Try finding by buffer ID first
      selectedTile = rootTileRef.current.findBuffer(selectedBuffer.id);

      if (!selectedTile && selectedPatch) {
        // If not found by buffer, try finding by patch
        selectedTile = rootTileRef.current.findPatch(selectedPatch);
      }
    }

    // Fallback to root tile if no selected tile found
    if (!selectedTile) {
      selectedTile = rootTileRef.current;
    }

    // Replace the current buffer with the new WorkletCode buffer
    selectedTile.buffer = workletCodeBuffer;

    // Clear patch reference for tile if not a Patch buffer type
    if (workletCodeBuffer.type !== BufferType.Patch) {
      selectedTile.patch = null;
    }

    // Set the new buffer as selected
    setSelectedBuffer(workletCodeBuffer);

    // Add to working buffers list
    setWorkingBuffers((prevBuffers) => {
      const updatedBuffers = [
        workletCodeBuffer,
        ...prevBuffers.filter((b) => b.id !== workletCodeBuffer.id),
      ];
      return updatedBuffers.slice(0, 10);
    });

    resetRoot();
  }, [
    rootTile,
    selectedBuffer,
    selectedPatch,
    setSelectedBuffer,
    setWorkingBuffers,
    resetRoot,
    workingBuffers,
  ]);

  // Function to toggle or create a BufferList buffer in the currently selected tile
  const createBufferListBuffer = useCallback(() => {
    const selectedBuffer = selectedBufferRef.current;
    if (!rootTileRef.current || !selectedBuffer) {
      return;
    }

    // First check if we already have a BufferList buffer in the working buffers
    const existingBufferList = workingBuffers.find((b) => b.type === BufferType.BufferList);

    // If the current buffer is already a BufferList, switch to the previous buffer
    if (selectedBuffer.type === BufferType.BufferList) {
      // Find the most recent non-BufferList buffer
      const previousBuffer = workingBuffers.find((b) => b.id !== selectedBuffer.id);
      if (previousBuffer) {
        switchToBufferFn(previousBuffer);
      }
      return;
    }

    // If we found an existing BufferList in working buffers, use it
    if (existingBufferList) {
      switchToBufferFn(existingBufferList);
      return;
    }

    // Otherwise, create a new BufferList buffer
    const bufferListBuffer: Buffer = {
      id: uuid(),
      type: BufferType.BufferList,
      name: "Buffer List",
    };

    // Find the currently selected tile (the one with the currently selected buffer)
    let selectedTile: Tile | null = null;

    if (selectedBuffer) {
      // First, try to find by buffer ID (most accurate)
      selectedTile = rootTileRef.current.findBuffer(selectedBuffer.id);

      if (!selectedTile && selectedPatch) {
        // If not found by buffer, try finding by patch
        selectedTile = rootTileRef.current.findPatch(selectedPatch);
      }
    }

    // Fallback to root tile if no selected tile found
    if (!selectedTile) {
      selectedTile = rootTileRef.current;
    }

    // Replace the current buffer with the new BufferList buffer
    selectedTile.buffer = bufferListBuffer;

    // Clear patch reference for buffer types other than Patch
    if (bufferListBuffer.type !== BufferType.Patch) {
      selectedTile.patch = null;
    }

    // Set the new buffer as selected
    setSelectedBuffer(bufferListBuffer);

    // Add to or update working buffers list
    setWorkingBuffers((prevBuffers) => {
      // Add the new buffer at the start of the array
      const updatedBuffers = [
        bufferListBuffer,
        ...prevBuffers.filter((b) => b.id !== bufferListBuffer.id),
      ];
      // Limit to most recent 10 buffers if needed
      return updatedBuffers.slice(0, 10);
    });

    resetRoot();
  }, [
    rootTile,
    selectedBuffer,
    selectedPatch,
    setSelectedBuffer,
    setWorkingBuffers,
    resetRoot,
    workingBuffers,
  ]);

  const selectedBufferRef = useRef<Buffer | null>(null);
  useEffect(() => {
    selectedBufferRef.current = selectedBuffer;
  }, [selectedBuffer]);

  // Function to switch to a different buffer in the currently selected tile
  const switchToBuffer = useCallback(
    (buffer: Buffer, newTile?: boolean) => {
      const selectedBuffer = selectedBufferRef.current;
      if (!rootTileRef.current || !selectedBuffer) {
        return;
      }

      const existingTile = rootTileRef.current.findBuffer(buffer.id);
      if (existingTile) {
        setSelectedBuffer(buffer);
        return;
      }
      // Find the tile with the currently selected buffer
      const tile =
        rootTileRef.current.findBuffer(selectedBuffer.id) ||
        (selectedPatch ? rootTileRef.current.findPatch(selectedPatch) : null);

      if (tile) {
        if (newTile) {
          let parentTile = tile.parent;
          tile.split(
            parentTile && parentTile.splitDirection === "horizontal" ? "vertical" : "horizontal",
            buffer,
          );
        } else {
          // Replace the current buffer with the specified buffer
          tile.buffer = buffer;
        }

        // Update patch reference for backward compatibility if it's a Patch buffer
        if (buffer.type === BufferType.Patch && buffer.patch && !newTile) {
          tile.patch = buffer.patch;
          setSelectedPatch(buffer.patch);
        } else {
          tile.patch = null;
        }

        if (!newTile) {
          // Set the specified buffer as selected
          setSelectedBuffer(buffer);
        }

        // Update working buffers list to move this buffer to the front
        setWorkingBuffers((prevBuffers) => {
          // Add the buffer at the start of the array
          const updatedBuffers = [buffer, ...prevBuffers.filter((b) => b.id !== buffer.id)];
          // Limit to most recent 10 buffers if needed
          return updatedBuffers.slice(0, 10);
        });

        resetRoot();
      }
    },
    [rootTile, selectedBuffer, selectedPatch, setSelectedBuffer, setSelectedPatch, resetRoot],
  );

  // Assign the implementation to our forwarded declaration
  switchToBufferFn = switchToBuffer;

  // Function to kill the current buffer and replace it with the previous one
  const killCurrentBuffer = useCallback(() => {
    if (!rootTileRef.current || !selectedBuffer) {
      return;
    }

    // Get the current tile
    const currentTile =
      rootTileRef.current.findBuffer(selectedBuffer.id) ||
      (selectedPatch ? rootTileRef.current.findPatch(selectedPatch) : null);

    if (!currentTile) {
      return;
    }

    // Don't kill the buffer if there are no other buffers to switch to
    if (workingBuffers.length <= 1) {
      return;
    }

    // Find a buffer that isn't already displayed in any tile
    const findUniqueBuffer = () => {
      for (const buffer of workingBuffers) {
        // Skip the current buffer
        if (buffer.id === selectedBuffer.id) continue;

        // Check if this buffer is already displayed in any tile
        const tilesWithBuffer = getAllTilesWithBuffer(buffer.id);
        if (tilesWithBuffer.length === 0) {
          // Found a buffer that isn't displayed anywhere
          return buffer;
        }
      }
      // No unique buffer found
      return null;
    };

    // Try to find a unique buffer first
    const uniqueNextBuffer = findUniqueBuffer();

    // If we have a unique buffer, use it, otherwise try to close the tile
    if (uniqueNextBuffer) {
      console.log("Found unique buffer to switch to:", uniqueNextBuffer.id);
      setWorkingBuffers((prevBuffers) => {
        return [...prevBuffers.filter((b) => b.id !== selectedBuffer.id), selectedBuffer];
      });
      switchToBufferFn(uniqueNextBuffer);
    } else {
      console.log("No unique buffer found, trying to close tile");
      // No unique buffer found, try to close the tile
      closeTile(currentTile);

      // Make sure the buffer is removed from working buffers if it's not used elsewhere
      const tilesWithBuffer = getAllTilesWithBuffer(selectedBuffer.id);
      if (tilesWithBuffer.length <= 1) {
        setWorkingBuffers((prevBuffers) => {
          return [...prevBuffers.filter((b) => b.id !== selectedBuffer.id), selectedBuffer];
        });
      }
    }
  }, [rootTile, selectedBuffer, selectedPatch, workingBuffers, setWorkingBuffers, closeTile]);

  // Helper function to find all tiles that have a specific buffer
  const getAllTilesWithBuffer = useCallback((bufferId: string): Tile[] => {
    if (!rootTileRef.current) {
      return [];
    }

    const result: Tile[] = [];

    const searchTiles = (tile: Tile) => {
      if (tile.buffer && (bufferId === "" || tile.buffer.id === bufferId)) {
        result.push(tile);
      }

      for (const child of tile.children) {
        searchTiles(child);
      }
    };

    searchTiles(rootTileRef.current);
    return result;
  }, []);

  // Function to rename a patch and update relevant buffers
  const renamePatch = useCallback(
    (patch: Patch, newName: string) => {
      if (!patch) return;

      // Update the patch name
      patch.name = newName;

      // Update any buffers that reference this patch
      setWorkingBuffers((prevBuffers) => {
        return prevBuffers.map((b) => {
          if (b.patch && b.patch.id === patch.id) {
            if (b.type === BufferType.Dired) {
              // Update Dired buffer name to reflect the patch
              return {
                ...b,
                name: `Directory: ${newName}`,
              };
            } else if (b.type === BufferType.Patch) {
              // Update Patch buffer name
              return {
                ...b,
                name: newName,
              };
            }
          }
          return b;
        });
      });

      // Force a refresh of the UI
      setCounter((c) => c + 1);

      // Update patchNames map if being used
      setPatchNames((prev) => ({
        ...prev,
        [patch.id]: newName,
      }));
    },
    [setWorkingBuffers, setCounter, setPatchNames],
  );

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
        createDiredBuffer,
        createBufferListBuffer,
        createWorkletCodeBuffer,
        switchToBuffer,
        killCurrentBuffer,
        closePatch,
        closeTile,
        getAllTilesWithBuffer,
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
        workingBuffers,
        setWorkingBuffers,
        renamePatch,
        visibleBuffers,
      }}
    >
      {children}
    </PatchesContext.Provider>
  );
};
