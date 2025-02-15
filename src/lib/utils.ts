import { ObjectNode, Patch, Size, SubPatch } from "@/lib/nodes/types";
import ObjectNodeImpl from "./nodes/ObjectNode";
import { OperatorContextType } from "./nodes/context";

export const getUpdatedSize = (objectNode: ObjectNode, size: Size | null): Size => {
  if (objectNode.position) {
    let p = objectNode.position;
    if (!size) {
      let x = {
        width: p.x + 800,
        height: p.y + 800,
      };
    } else {
      let { width, height } = size;
      if (p.x + 100 > width) {
        width = p.x + 300;
      }
      if (p.y + 100 > height) {
        height = p.y + 300;
      }
      return { width, height };
    }
  }
  return { width: 500, height: 500 };
};

export const setupSkeletonPatch = (patch: SubPatch) => {
  const ZEN = OperatorContextType.ZEN;
  let in1 = new ObjectNodeImpl(patch as Patch);
  in1.parse("in 1", ZEN, false);

  let out1 = new ObjectNodeImpl(patch as Patch);
  out1.parse("out 1", ZEN, false);

  in1.connect(out1, out1.inlets[0], in1.outlets[0], false);
  in1.position = { x: 100, y: 100 };
  out1.position = { x: 100, y: 300 };

  patch.objectNodes = [in1, out1];
  patch.messageNodes = [];
};
