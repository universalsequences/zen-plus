import React, { useCallback, useMemo } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { Buffer, BufferType, Tile } from "@/lib/tiling/types";

interface BufferListViewProps {
  buffer: Buffer;
}

/**
 * BufferListView displays a list of available buffers that users can click on to switch to
 */
const BufferListView: React.FC<BufferListViewProps> = ({ buffer }) => {
  const {
    workingBuffers,
    switchToBuffer,
    rootTile,
    getAllTilesWithBuffer,
    killCurrentBuffer,
    closeTile,
    setSelectedBuffer,
  } = usePatches();

  // Function to get a readable buffer type label
  const getBufferTypeLabel = (type: BufferType): string => {
    switch (type) {
      case BufferType.Patch:
        return "Patch";
      case BufferType.Object:
        return "Object";
      case BufferType.Dired:
        return "Directory";
      case BufferType.BufferList:
        return "Buffer List";
      default:
        return "Unknown";
    }
  };

  // Function to handle buffer selection with special case handling
  const handleBufferSelect = useCallback(
    (selectedBuffer: Buffer) => {
      if (!rootTile) return;

      console.log("Buffer selected:", selectedBuffer.id);

      // Find the current buffer list tile
      const currentTile = rootTile.findBuffer(buffer.id);
      console.log("Current buffer list tile:", currentTile?.id);

      if (!currentTile) {
        console.log("Current tile not found");
        return;
      }

      // Check if buffer is already displayed in other tiles (excluding current buffer list tile)
      const tilesWithBuffer = getAllTilesWithBuffer(selectedBuffer.id);
      const otherTilesWithBuffer = tilesWithBuffer.filter((tile) => tile.id !== currentTile.id);
      const isAlreadyDisplayed = otherTilesWithBuffer.length > 0;
      console.log("Buffer already displayed:", isAlreadyDisplayed);

      if (isAlreadyDisplayed) {
        // If buffer is already displayed elsewhere, just close this tile and select that buffer
        console.log("Closing buffer list tile and selecting existing buffer");

        // First set the selected buffer

        // Then close this tile - this is important for the order
        //closeTile(currentTile);
        killCurrentBuffer();
        setSelectedBuffer(selectedBuffer);
      } else {
        // Buffer is not displayed anywhere, switch to it in the current tile
        console.log("Switching to buffer in current tile");
        switchToBuffer(selectedBuffer);
      }
    },
    [rootTile, buffer.id, getAllTilesWithBuffer, closeTile, setSelectedBuffer, switchToBuffer],
  );

  // Function to check if a buffer is already displayed in any tile
  const isBufferDisplayed = useCallback(
    (bufferToCheck: Buffer): boolean => {
      if (!rootTile) return false;

      // Get all tiles showing this buffer
      const tilesWithBuffer = getAllTilesWithBuffer(bufferToCheck.id);

      // Get the current buffer list tile
      const currentTile = rootTile.findBuffer(buffer.id);

      // Count only tiles that are not the current buffer list tile
      const otherTilesWithBuffer = tilesWithBuffer.filter(
        (tile) => !currentTile || tile.id !== currentTile.id,
      );

      return otherTilesWithBuffer.length > 0;
    },
    [rootTile, getAllTilesWithBuffer, buffer.id],
  );

  // Render a buffer list item with click handler
  const renderBufferItem = useCallback(
    (b: Buffer, index: number) => {
      // Don't show the current buffer list in the list
      if (b.id === buffer.id) return null;

      // Check if this buffer is already displayed
      const displayed = isBufferDisplayed(b);

      // Get a display name for the buffer
      const displayName = b.name || b.patch?.name || `Untitled ${getBufferTypeLabel(b.type)}`;

      return (
        <div
          key={b.id}
          className={`buffer-item p-2 my-1 cursor-pointer hover:bg-zinc-700 rounded ${displayed ? "border-l-2 border-blue-500" : ""}`}
          onClick={() => handleBufferSelect(b)}
        >
          <div className="flex justify-between">
            <span className="buffer-name font-medium">{displayName}</span>
            <span className="buffer-type text-sm text-zinc-400">{getBufferTypeLabel(b.type)}</span>
          </div>
          {b.type === BufferType.Patch && b.patch?.description && (
            <div className="buffer-description text-sm text-zinc-400 mt-1">
              {b.patch.description}
            </div>
          )}
          {displayed && (
            <div className="buffer-status text-xs text-blue-400 mt-1">Already displayed</div>
          )}
        </div>
      );
    },
    [buffer.id, isBufferDisplayed, handleBufferSelect],
  );

  return (
    <div className="buffer-list p-4 w-full h-full overflow-auto bg-zinc-800 text-white">
      <h2 className="text-lg font-bold mb-3">Buffer List</h2>

      {workingBuffers.length === 0 ? (
        <div className="empty-message text-zinc-400">No buffers available</div>
      ) : (
        <div className="buffer-items">{workingBuffers.map(renderBufferItem)}</div>
      )}

      <div className="help-text mt-4 text-xs text-zinc-500">
        <p>Press 'b' to show/hide buffer list</p>
        <p>Click on a buffer to switch to it</p>
        <p>Buffers with blue border are already displayed in another tile</p>
      </div>
    </div>
  );
};

export default BufferListView;
