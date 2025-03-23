"use client";
import BufferComponent from "@/components/BufferComponent";
import { PositionProvider } from "@/contexts/PositionContext";
import { LockedProvider } from "@/contexts/LockedContext";
import { PatchProvider } from "@/contexts/PatchContext";
import { Patch } from "@/lib/nodes/types";
import { Buffer, BufferType } from "@/lib/tiling/types";
import Toolbar from "./Toolbar";

/**
 * Legacy PatchWrapper component that wraps a patch in context providers
 * For backward compatibility, this creates a buffer object and passes it to BufferComponent
 */
const PatchWrapper: React.FC<{
  isWindow?: boolean;
  tileRef: React.RefObject<HTMLDivElement | null>;
  setFileToOpen: (x: any | null) => void;
  fileToOpen: any | null;
  maxWidth: number;
  maxHeight: number;
  patch: Patch;
  index: number;
}> = ({ patch, index, maxWidth, maxHeight, fileToOpen, setFileToOpen, tileRef, isWindow }) => {
  // Create a buffer object from the patch
  const buffer: Buffer = {
    id: patch.id,
    type: BufferType.Patch,
    patch: patch,
    name: patch.name || 'Untitled Patch'
  };
  
  return (
    <PatchProvider patch={patch}>
      <LockedProvider patch={patch}>
        <PositionProvider patch={patch}>
          <BufferComponent
            isWindow={isWindow}
            tileRef={tileRef}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            index={index}
            buffer={buffer}
          >
            <Toolbar patch={patch} />
          </BufferComponent>
        </PositionProvider>
      </LockedProvider>
    </PatchProvider>
  );
};

export default PatchWrapper;
