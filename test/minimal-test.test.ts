import { describe, it, expect } from "bun:test";
import { MockPatch } from "./mocks/MockPatch";
import { api } from "@/lib/nodes/definitions/core/index";
import { OperatorContextType } from "@/lib/nodes/context";
import { MessageType, Patch } from "@/lib/nodes/types";
import { MockObjectNode } from "./mocks/MockObjectNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import { topologicalSearchFromNode } from "@/lib/nodes/vm/forwardpass";
export const newObject = (text: string, p: Patch, type = OperatorContextType.CORE) => {
  const obj1 = new MockObjectNode(p);
  obj1.parse(text, type);
  p.objectNodes.push(obj1);
  return obj1;
};

export const graph1 = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const o1 = newObject("* 4", patch);
  const o2 = newObject("* 5", patch);
  m1.connect(o1, o1.inlets[0], m1.outlets[0]);
  o1.connect(o2, o2.inlets[0], o1.outlets[0]);

  patch.messageNodes.push(m1);
  const nodes = [];
  topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    expected: [m1.id, o1.id, o2.id],
  };
};

describe("minimal test", () => {
  it("should run without Firebase errors", () => {
    graph1();
  });
});
