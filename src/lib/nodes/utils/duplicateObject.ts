import type { Coordinate, ObjectNode } from "../types";
import ObjectNodeImpl from "../ObjectNode";
import { OperatorContextType } from "../context";

interface DuplicateArgs {
  objectNode: ObjectNode;
  newObjectNode: (objectNode: ObjectNode, position: Coordinate) => void;
  updatePosition: (id: string, position: Coordinate) => void;
}

export const duplicate = ({
  objectNode,
  newObjectNode,
  updatePosition,
}: DuplicateArgs) => {
  const copied = new ObjectNodeImpl(objectNode.patch);
  if (objectNode.name === "zen") {
    let attr = "";
    if (
      objectNode.subpatch &&
      objectNode.subpatch.patchType === OperatorContextType.ZEN
    ) {
      attr = " @type zen";
    }
    if (
      objectNode.subpatch &&
      objectNode.subpatch.patchType === OperatorContextType.GL
    ) {
      attr = " @type gl";
    }
    if (
      objectNode.subpatch &&
      objectNode.subpatch.patchType === OperatorContextType.CORE
    ) {
      attr = " @type core";
    }
    if (
      objectNode.subpatch &&
      objectNode.subpatch.patchType === OperatorContextType.AUDIO
    ) {
      attr = " @type audio";
    }
    copied.parse("zen" + attr);
    let json = objectNode.getJSON();
    if (copied.subpatch && json.subpatch) {
      copied.subpatch.fromJSON(json.subpatch, true);
      // loadSubPatch(json.subpatch, "zen");
    }
    copied.attributes = {
      ...copied.attributes,
      ...json.attributes,
    };
    copied.size = json.size;
  } else {
    let size = objectNode.size;
    copied.parse(objectNode.text, objectNode.operatorContextType, false);
    if (size) {
      copied.size = { ...size };
    }
  }
  copied.position.x =
    objectNode.position.x + sizeIndexRef.current[objectNode.id].width + 15;
  copied.position.y = objectNode.position.y;
  newObjectNode(copied, copied.position);
  updatePosition(copied.id, copied.position);
};