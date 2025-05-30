"use client";
import BufferComponent from "@/components/BufferComponent";
import { PositionProvider } from "@/contexts/PositionContext";
import { LockedProvider } from "@/contexts/LockedContext";
import { PatchProvider } from "@/contexts/PatchContext";
import { BufferProvider } from "@/contexts/BufferContext";
import { Buffer, BufferType } from "@/lib/tiling/types";
import Toolbar from "./Toolbar";
import PatchComponent from "./PatchComponent";
import { BufferToolbar } from "./toolbar/BufferToolbar";
import { useEffect } from "react";
import { usePatches } from "@/contexts/PatchesContext";

/**
 * BufferWrapper is a component that provides context providers for buffers
 * It wraps the BufferComponent with appropriate contexts based on buffer type
 */
const BufferWrapper: React.FC<{
  isWindow?: boolean;
  tileRef: React.RefObject<HTMLDivElement | null>;
  setFileToOpen: (x: any | null) => void;
  fileToOpen: any | null;
  maxWidth: number;
  maxHeight: number;
  buffer: Buffer;
  index: number;
}> = ({ buffer, index, maxWidth, maxHeight, fileToOpen, setFileToOpen, tileRef, isWindow }) => {
  const { selectedBuffer } = usePatches();
  
  // Error handling for empty buffers
  if (buffer.type === BufferType.Patch && !buffer.patch) {
    return <div className="text-white p-4">Error: No patch in buffer</div>;
  }

  // Wrap all buffer types with the BufferProvider
  return (
    <BufferProvider buffer={buffer}>
      {buffer.type === BufferType.Patch && buffer.patch ? (
        <PatchProvider patch={buffer.patch}>
          <LockedProvider patch={buffer.patch}>
            <PositionProvider patch={buffer.patch}>
              <PatchComponent
                isWindow={isWindow}
                tileRef={tileRef}
                buffer={buffer}
                maxWidth={maxWidth}
                maxHeight={maxHeight}
                index={index}
                fileToOpen={fileToOpen}
                setFileToOpen={setFileToOpen}
              >
                <Toolbar patch={buffer.patch} />
              </PatchComponent>
            </PositionProvider>
          </LockedProvider>
        </PatchProvider>
      ) : (
        // For other buffer types, we don't need the patch-specific context providers
        <BufferComponent
          isWindow={isWindow}
          tileRef={tileRef}
          maxWidth={maxWidth}
          maxHeight={maxHeight}
          index={index}
          buffer={buffer}
          fileToOpen={fileToOpen}
          setFileToOpen={setFileToOpen}
        >
          <BufferToolbar buffer={buffer} />
        </BufferComponent>
      )}
    </BufferProvider>
  );
};

export default BufferWrapper;
