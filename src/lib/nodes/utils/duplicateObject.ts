console.log("duplicate obj");
import type { Coordinate, ObjectNode, Patch, SubPatch } from "../types";
import ObjectNodeImpl from "../ObjectNode";
import { OperatorContextType } from "../context";

interface DuplicateArgs {
  objectNode: ObjectNode;
  newObjectNode: (objectNode: ObjectNode, position: Coordinate) => void;
  updatePosition: (id: string, position: Coordinate) => void;
}

export const duplicateObject = ({ objectNode, newObjectNode, updatePosition }: DuplicateArgs) => {
  const copied = new ObjectNodeImpl(objectNode.patch);
  console.log("need top duplicate =", objectNode);
  if (objectNode.name === "zen") {
    let attr = "";
    if (objectNode.subpatch && objectNode.subpatch.patchType === OperatorContextType.ZEN) {
      attr = " @type zen";
    }
    if (objectNode.subpatch && objectNode.subpatch.patchType === OperatorContextType.GL) {
      attr = " @type gl";
    }
    if (objectNode.subpatch && objectNode.subpatch.patchType === OperatorContextType.CORE) {
      attr = " @type core";
    }
    if (objectNode.subpatch && objectNode.subpatch.patchType === OperatorContextType.AUDIO) {
      attr = " @type audio";
    }
    copied.parse(`zen${attr}`);
    const json = objectNode.getJSON();
    if (copied.subpatch && json.subpatch) {
      copied.subpatch.fromJSON(json.subpatch, true);
      // loadSubPatch(json.subpatch, "zen");
    }
    copied.attributes = {
      ...copied.attributes,
      ...json.attributes,
    };
    copied.size = json.size;

    if (copied.subpatch) {
      //if ((objectNode.subpatch as SubPatch).isInsideSlot) {
      (copied.subpatch as SubPatch).recompileGraph();
      //}
      (copied.subpatch as Patch).initialLoadCompile(false).then(() => {
        (copied.subpatch as Patch).setupPostCompile(false, true);
      });
    }
  } else {
    console.log("duplicate occuring");
    let size = objectNode.size;
    copied.attributes = {
      ...copied.attributes,
      ...objectNode.attributes,
    };
    if (size) {
      console.log("setting size =", size);
      copied.size = { ...size };
    }
    copied.parse(objectNode.text, objectNode.operatorContextType, false);
  }
  copied.position.x = objectNode.position.x;
  copied.position.y = objectNode.position.y;
  newObjectNode(copied, copied.position);
  updatePosition(copied.id, copied.position);
};
