"use client";
import PatchComponent from "@/components/PatchComponent";
import { PositionProvider } from "@/contexts/PositionContext";
import { LockedProvider } from "@/contexts/LockedContext";
import { PatchProvider } from "@/contexts/PatchContext";
import { MessageProvider } from "@/contexts/MessageContext";
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from "@/lib/nodes/types";
import { usePatches } from "@/contexts/PatchesContext";
import { PatchImpl } from "@/lib/nodes/Patch";

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
  return (
    <PatchProvider patch={patch}>
      <LockedProvider patch={patch}>
        <PositionProvider patch={patch}>
          <PatchComponent
            tileRef={tileRef}
            maxWidth={maxWidth}
            isWindow={isWindow}
            maxHeight={maxHeight}
            index={index}
            setFileToOpen={setFileToOpen}
            fileToOpen={fileToOpen}
          />
        </PositionProvider>
      </LockedProvider>
    </PatchProvider>
  );
};
export default PatchWrapper;
