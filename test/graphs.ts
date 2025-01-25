import { MockPatch } from "./mocks/MockPatch";
import { MockObjectNode } from "./mocks/MockObjectNode";
import { MessageType, type Node, type Patch, type SubPatch } from "@/lib/nodes/types";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import { topologicalSearchFromNode } from "@/lib/nodes/vm/forwardpass";
import { OperatorContextType } from "@/lib/nodes/context";
import { getInboundConnections, getOutboundConnections } from "@/lib/nodes/vm/traversal";

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
  const nodes = topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    expected: [m1.id, o1.id, o2.id],
  };
};

export const graph2 = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);
  const o1 = newObject("* 4", patch);
  const o2 = newObject("* 5", patch);
  m1.connect(o1, o1.inlets[0], m1.outlets[0]);
  o1.connect(o2, o2.inlets[0], o1.outlets[0]);
  o1.connect(m2, m2.inlets[1], o1.outlets[0]);
  o2.connect(m3, m3.inlets[1], o2.outlets[0]);

  patch.messageNodes.push(m1, m2, m3);

  const nodes = topologicalSearchFromNode(m1);

  // skips m2's cold inlet (inlet #2)
  return { nodes, patch, m1, m2, m3, expected: [m1.id, o1.id, o2.id] };
};

export const graphSubPatch1 = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const o1 = newObject("p", patch, OperatorContextType.ZEN);

  const subpatch = o1.subpatch as SubPatch;
  const in1 = newObject("in 1", subpatch, OperatorContextType.ZEN);
  const out1 = newObject("out 1", subpatch, OperatorContextType.ZEN);
  const mult = newObject("* 3", subpatch);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);

  m1.connect(o1, o1.inlets[0], m1.outlets[0]);
  in1.connect(mult, mult.inlets[0], in1.outlets[0]);
  mult.connect(out1, out1.inlets[0], mult.outlets[0]);
  o1.connect(m2, m2.inlets[1], o1.outlets[0]);

  patch.messageNodes.push(m1, m2);

  const nodes = topologicalSearchFromNode(m1);
  return { nodes, patch, m2, expected: [m1.id, mult.id] };
};

const createSubPatch = (patch: Patch, text = "* 3") => {
  const o1 = newObject("p", patch, OperatorContextType.ZEN);
  const subpatch = o1.subpatch as SubPatch;
  const in1 = newObject("in 1", subpatch, OperatorContextType.ZEN);
  const out1 = newObject("out 1", subpatch, OperatorContextType.ZEN);
  const mult = newObject(text, subpatch);
  in1.connect(mult, mult.inlets[0], in1.outlets[0]);
  mult.connect(out1, out1.inlets[0], mult.outlets[0]);

  return {
    p: o1,
    subpatch,
    mult,
  };
};

export const graphSubPatchIntoSubpatch = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);

  const { mult: mult1, p: p1 } = createSubPatch(patch);
  const { mult: mult2, p: p2 } = createSubPatch(patch, "+ 4");
  const m2 = new MessageNodeImpl(patch, MessageType.Message);

  m1.connect(p1, p1.inlets[0], m1.outlets[0]);
  p1.connect(p2, p2.inlets[0], p1.outlets[0]);

  const o2 = newObject("- 5", patch);

  p2.connect(o2, o2.inlets[0], p2.outlets[0]);
  o2.connect(m2, m2.inlets[1], o2.outlets[0]);

  patch.messageNodes.push(m1, m2);

  const nodes = topologicalSearchFromNode(m1);
  return { nodes, patch, m2, expected: [m1.id, mult1.id, mult2.id, o2.id] };
};

export const graphNestedSubPatch = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);

  // first level subpatch (in root patch)
  const o1 = newObject("p hello", patch, OperatorContextType.ZEN);
  const subpatch = o1.subpatch as SubPatch;

  // create a nested subpatch inside subpatch o1
  const { p, mult: mult1 } = createSubPatch(subpatch, "+ 4");
  const in1 = newObject("in 1", subpatch, OperatorContextType.ZEN);
  const out1 = newObject("out 1", subpatch, OperatorContextType.ZEN);
  in1.connect(p, p.inlets[0], in1.outlets[0]);
  p.connect(out1, out1.inlets[0], p.outlets[0]);

  const mult2 = newObject("* 5", patch);

  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  m1.connect(o1, o1.inlets[0], m1.outlets[0]);
  p.connect(mult2, mult2.inlets[0], p.outlets[0]);
  mult2.connect(m2, m2.inlets[1], mult2.outlets[0]);

  const nodes = topologicalSearchFromNode(m1);
  return { nodes, patch, m2, expected: [m1.id, mult1.id, mult2.id] };
};

export const graphNestedSubPatchIntoSubpatch = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);

  // first top level subpatch
  const o1 = newObject("p hello", patch, OperatorContextType.ZEN);
  const subpatch = o1.subpatch as SubPatch;

  // create nested subpatch in o1
  const { p: p1, mult: mult1 } = createSubPatch(subpatch, "+ 4");
  const in1 = newObject("in 1", subpatch, OperatorContextType.ZEN);
  const out1 = newObject("out 1", subpatch, OperatorContextType.ZEN);
  in1.connect(p1, p1.inlets[0], in1.outlets[0]);
  p1.connect(out1, out1.inlets[0], p1.outlets[0]);

  const { p: p2, mult: mult2 } = createSubPatch(patch, "* 4");

  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  m1.connect(o1, o1.inlets[0], m1.outlets[0]);

  const mult3 = newObject("* 5", patch);
  o1.connect(p2, p2.inlets[0], o1.outlets[0]);
  p2.connect(mult3, mult3.inlets[0], p2.outlets[0]);
  mult3.connect(m2, m2.inlets[1], mult3.outlets[0]);

  const nodes = topologicalSearchFromNode(m1, true);
  return { nodes, patch, m2, expected: [m1.id, mult1.id, mult2.id, mult3.id] };
};

export const graphBranch1 = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Number);
  const m3 = new MessageNodeImpl(patch, MessageType.Number);
  const m4 = new MessageNodeImpl(patch, MessageType.Number);

  const route = newObject("route 1 2 3 4", patch);

  const mult1 = newObject("* 2", patch);
  const add1_A = newObject("+ 2", patch);
  const mult2 = newObject("* 3", patch);
  const mult3 = newObject("* 4", patch);
  m1.connect(route, route.inlets[0], m1.outlets[0]);
  route.connect(mult1, mult1.inlets[0], route.outlets[0]);
  route.connect(mult2, mult2.inlets[0], route.outlets[1]);
  route.connect(mult3, mult3.inlets[0], route.outlets[2]);

  mult1.connect(add1_A, add1_A.inlets[0], mult1.outlets[0]);
  add1_A.connect(m2, m2.inlets[1], add1_A.outlets[0]);
  mult2.connect(m3, m3.inlets[1], mult2.outlets[0]);
  mult3.connect(m4, m4.inlets[1], mult3.outlets[0]);

  const nodes = topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    m2,
    m3,
    m4,
    expected: [m1.id, route.id, mult3.id, mult2.id, mult1.id, add1_A.id],
  };
};

export const graphBranch2 = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Number);
  const m3 = new MessageNodeImpl(patch, MessageType.Number);

  const filter = newObject("filter.= 1", patch);

  m1.connect(m3, m3.inlets[1], m1.outlets[0]);

  const mult1 = newObject("* 2", patch);
  const add1_A = newObject("+ 2", patch);
  m1.connect(filter, filter.inlets[0], m1.outlets[0]);
  filter.connect(mult1, mult1.inlets[0], filter.outlets[0]);

  mult1.connect(add1_A, add1_A.inlets[0], mult1.outlets[0]);
  add1_A.connect(m2, m2.inlets[1], add1_A.outlets[0]);

  const nodes = topologicalSearchFromNode(m1);
  return {
    nodes,
    patch,
    m2,
    m3,
    expected: [m1.id, filter.id, mult1.id, add1_A.id],
  };
};

export const graphBranchMessageMessage = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);

  const messagemessage = newObject("messagemessage", patch);

  const mult1 = newObject("* 2", patch);
  const add1_A = newObject("+ 2", patch);
  m1.connect(messagemessage, messagemessage.inlets[0], m1.outlets[0]);
  messagemessage.connect(mult1, mult1.inlets[0], messagemessage.outlets[0]);
  mult1.connect(add1_A, add1_A.inlets[0], mult1.outlets[0]);
  add1_A.connect(m2, m2.inlets[1], add1_A.outlets[0]);

  const mult2 = newObject("* 8", patch);
  const add2_A = newObject("+ 9", patch);
  messagemessage.connect(mult2, mult2.inlets[0], messagemessage.outlets[1]);
  mult2.connect(add2_A, add2_A.inlets[0], mult2.outlets[0]);
  add2_A.connect(m3, m3.inlets[1], add2_A.outlets[0]);

  const nodes = topologicalSearchFromNode(m1);
  return {
    nodes,
    patch,
    m2,
    m3,
    expectedObjectsEvaluated: [messagemessage, mult1, add1_A, mult2, add2_A],
  };
};

export const graphBranchMessageMessageNested = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);
  const m4 = new MessageNodeImpl(patch, MessageType.Message);

  const messagemessage1 = newObject("messagemessage", patch);
  const messagemessage2 = newObject("messagemessage", patch);

  const mult1 = newObject("* 2", patch);
  const add1_A = newObject("+ 2", patch);
  m1.connect(messagemessage1, messagemessage1.inlets[0], m1.outlets[0]);
  messagemessage1.connect(mult1, mult1.inlets[0], messagemessage1.outlets[0]);
  mult1.connect(add1_A, add1_A.inlets[0], mult1.outlets[0]);
  add1_A.connect(messagemessage2, messagemessage2.inlets[0], add1_A.outlets[0]);

  const mult2 = newObject("* 8", patch);
  const add2_A = newObject("+ 9", patch);
  messagemessage1.connect(mult2, mult2.inlets[0], messagemessage1.outlets[1]);
  mult2.connect(add2_A, add2_A.inlets[0], mult2.outlets[0]);
  add2_A.connect(m3, m3.inlets[1], add2_A.outlets[0]);

  const mult3 = newObject("* 2", patch);
  const add3_A = newObject("+ 2", patch);

  const mult4 = newObject("* 2", patch);
  const add4_A = newObject("+ 2", patch);

  messagemessage2.connect(mult3, mult3.inlets[0], messagemessage2.outlets[0]);
  messagemessage2.connect(mult4, mult4.inlets[0], messagemessage2.outlets[1]);

  mult3.connect(add3_A, add3_A.inlets[0], mult3.outlets[0]);
  mult4.connect(add4_A, add4_A.inlets[0], mult4.outlets[0]);

  add3_A.connect(m3, m3.inlets[1], add3_A.outlets[0]);
  add4_A.connect(m4, m4.inlets[1], add4_A.outlets[0]);

  const nodes = topologicalSearchFromNode(m1);
  return {
    nodes,
    patch,
    m2,
    m3,
    m4,
    expectedObjectsEvaluated: [
      messagemessage1,
      mult1,
      add1_A,
      messagemessage2,
      mult3,
      add3_A,
      mult4,
      add4_A,
      mult2,
      add2_A,
    ],
  };
};

export const graphScript = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const p = newObject("p", patch, OperatorContextType.ZEN);
  const subpatch = p.subpatch as SubPatch;
  const in1 = newObject("in 1", subpatch, OperatorContextType.ZEN);
  const script = newObject("lisp", subpatch);
  script.script = "(list $1 $1 $1 $1)";
  newObject("out 1", subpatch, OperatorContextType.ZEN);
  const out2 = newObject("out 2", subpatch, OperatorContextType.ZEN);

  m1.connect(p, p.inlets[0], m1.outlets[0]);
  in1.connect(script, script.inlets[0], in1.outlets[0]);
  script.connect(out2, out2.inlets[0], script.outlets[0]);

  p.connect(m2, m2.inlets[1], p.outlets[1]);

  return { m1, m2, nodes: topologicalSearchFromNode(m1) };
};

export const graphPipeMessage = () => {
  const patch = new MockPatch(undefined, false, false);
  const button = newObject("button", patch);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);

  button.connect(m2, m2.inlets[0], button.outlets[0]);
  m2.connect(m3, m3.inlets[1], m2.outlets[0]);

  return {
    m2,
    m3,
    nodes: topologicalSearchFromNode(button),
    expected: [button.id, m2.id],
  };
};

const c = (a: Node, b: Node, inlet = 0, outlet = 0) => {
  a.connect(b, b.inlets[inlet], a.outlets[outlet], false);
};

export const graphCyclicScript = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const lisp = newObject("lisp 0 ", patch);
  lisp.script = "(list (list $1 $1 $1 (+ (get $2 0) $1)) 0 0)";
  const unpack = newObject("unpack 0 0 0", patch);

  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  m2.message = [0.5, 0.5, 0.5, 0.5];
  const button = newObject("button", patch);
  const matrix = newObject("matrix @rows 1 @colums 4", patch);

  c(button, m2);
  c(m2, matrix);

  c(m1, lisp);
  c(lisp, unpack);
  c(unpack, matrix);
  c(matrix, lisp, 1);

  return {
    matrix,
    nodesA: topologicalSearchFromNode(m1),
    nodesB: topologicalSearchFromNode(button),
    expectedA: [m1.id, lisp.id, unpack.id, matrix.id],
    expectedB: [button.id, m2.id, matrix.id],
  };
};
