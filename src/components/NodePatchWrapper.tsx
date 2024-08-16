import PatchComponent from "@/components/PatchComponent";
import { PositionProvider } from "@/contexts/PositionContext";
import { LockedProvider } from "@/contexts/LockedContext";
import { PatchProvider } from "@/contexts/PatchContext";
import { MessageProvider } from "@/contexts/MessageContext";
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from "@/lib/nodes/types";
import { usePatches } from "@/contexts/PatchesContext";
import { PatchImpl } from "@/lib/nodes/Patch";
import ObjectNodeWrapper from "./ObjectNodeWrapper";

export const NodePatchWrapper: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const patch = objectNode.patch;
  return (
    <PatchProvider patch={patch}>
      <LockedProvider patch={patch}>
        <PositionProvider patch={patch}>
          <ObjectNodeWrapper
              position="relative"
              objectNode={objectNode} />
        </PositionProvider>
      </LockedProvider>
    </PatchProvider>
  );
};
