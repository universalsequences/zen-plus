import React, { useEffect, useRef } from "react";
import { Tile, Buffer, BufferType } from "@/lib/tiling/types";
import BufferWrapper from "./BufferWrapper";
import { usePatches } from "@/contexts/PatchesContext";

const PatchTile: React.FC<{
  fileToOpen: any | null;
  setFileToOpen: (x: any | null) => void;
  gridTemplate?: string;
  tile: Tile | null;
}> = ({ tile, setFileToOpen, fileToOpen }) => {
  let ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tile) {
      tile.ref = ref;
    }
  }, [tile]);

  let direction = tile && tile.parent ? tile.parent.splitDirection : null;
  let mem;
  
  // Get the tile that contains the content to display
  let _tile: Tile | null =
    tile && tile.children.length === 0 && (tile.buffer || tile.patch)
      ? tile
      : tile && tile.children[0] && (tile.children[0].buffer || tile.children[0].patch)
        ? tile.children[0]
        : null;
        
  let PRE_INDEX = 0;
  
  if (_tile) {
    // Determine which content to display - buffer (preferred) or patch (legacy)
    const hasContent = _tile.buffer || _tile.patch;
    
    if (hasContent) {
      let _direction = _tile.parent ? _tile.parent.splitDirection : null;
      let cl = _direction === "vertical" ? "mx-2" : "my-2";
      let size = _tile.parent ? _tile.parent.size : 0;
      
      if (_tile.parent) {
        if (_tile.parent.children[1] === tile) {
          size = 100 - size;
        }
      } else {
        size = 100;
      }
      
      let maxWidth = _direction === "horizontal" ? size : 100;
      let maxHeight = _direction === "vertical" ? size : 100;
      
      // Determine whether to use buffer directly or create one from patch
      if (_tile.buffer) {
        // Use the buffer directly
        mem = (
          <BufferWrapper
            tileRef={ref}
            fileToOpen={fileToOpen}
            setFileToOpen={setFileToOpen}
            key={0}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            index={0}
            buffer={_tile.buffer}
          />
        );
      } else if (_tile.patch) {
        // Create a buffer from the patch for backward compatibility
        const patchBuffer = {
          id: _tile.patch.id,
          type: BufferType.Patch,
          patch: _tile.patch,
          name: _tile.patch.name || 'Untitled Patch'
        };
        
        mem = (
          <BufferWrapper
            tileRef={ref}
            fileToOpen={fileToOpen}
            setFileToOpen={setFileToOpen}
            key={0}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            index={0}
            buffer={patchBuffer}
          />
        );
      }
      PRE_INDEX = 1;
    }
  }

  if (!tile) {
    return <></>;
  }
  
  let cl = "flex-1 h-full w-full";
  let size = tile.size;
  
  if (tile.parent) {
    direction = tile.parent.splitDirection;
    if (tile.parent.children[1] === tile) {
      size = 100 - size;
    }
  } else {
    size = 100;
  }

  let _maxWidth = 100;
  let _maxHeight = 100;

  if (tile) {
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
      _maxWidth = hparent && hparent.children[0] === hprev ? hparent.size : 100 - hparent.size;
    }
    if (vparent) {
      _maxHeight = vparent && vparent.children[0] === vprev ? vparent.size : 100 - vparent.size;
    }

    if (tile.parent && tile.parent.splitDirection === "vertical") {
      _maxWidth = 100;
    }
    if (tile.parent && tile.parent.splitDirection === "horizontal") {
      _maxHeight = 100;
    }
  }

  // Check if children have content (either buffer or patch)
  let remainder = tile.children[0] && (tile.children[0].buffer || tile.children[0].patch);
  
  let children =
    tile.children.length === 0 && (tile.buffer || tile.patch)
      ? [mem]
      : [
          ...(remainder ? [mem] : []),
          ...tile.children.slice(remainder ? 1 : 0).map((tile: Tile, i: number) => {
            return (
              <PatchTile
                fileToOpen={fileToOpen}
                setFileToOpen={setFileToOpen}
                tile={tile}
                key={tile.id}
              />
            );
          }),
        ];
        
  return (
    <>
      <div
        ref={ref}
        style={
          false
            ? {}
            : {
                minWidth: _maxWidth + "%",
                maxWidth: _maxWidth + "%",
                maxHeight: _maxHeight + "%",
                minHeight: _maxHeight + "%",
              }
        }
        className={
          children.length === 1
            ? "flex w-full h-full flex-1"
            : cl +
              "  flex tile-container flex-1 " +
              (tile.splitDirection === "vertical" ? "flex-col" : "flex-row")
        }
      >
        {children}
      </div>
    </>
  );
};

export default PatchTile;
