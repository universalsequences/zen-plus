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

  const nodes = topologicalSearchFromNode(m1);
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

  console.log(
    "m1.id=%s route.id=%s mult3.id=%s mult2.id=%s mult1.id=%s add1A.id=%s",
    m1.id,
    route.id,
    mult3.id,
    mult2.id,
    mult1.id,
    add1_A.id,
  );
  console.log(
    "nodes=",
    nodes.map((x) => x.id),
  );
  return {
    nodes,
    patch,
    m2,
    m3,
    m4,
    expected: [m1.id, route.id, mult1.id, add1_A.id, mult2.id, mult3.id],
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

export const c = (a: Node, b: Node, inlet = 0, outlet = 0) => {
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

export const graphBranchIntoSubPatch = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);
  const filter = newObject("filter.= 1", patch);
  m2.message = 1;
  m3.message = 0;

  const o1 = newObject("p", patch, OperatorContextType.ZEN);

  const subpatch = o1.subpatch as SubPatch;
  const in1 = newObject("in 1", subpatch, OperatorContextType.ZEN);
  const out1 = newObject("out 1", subpatch, OperatorContextType.ZEN);
  const mult = newObject("* 3", subpatch);
  const m4 = new MessageNodeImpl(patch, MessageType.Message);

  c(m1, filter);
  c(filter, m2);
  c(filter, m3, 0, 1);
  c(m2, o1);
  c(m3, o1);
  c(in1, mult);
  c(mult, out1);
  c(o1, m4, 1, 0);

  const nodes = topologicalSearchFromNode(m1);
  return {
    m4,
    nodes,
  };
};

export const graphEndInButton = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const o1 = newObject("* 3", patch);
  const o2 = newObject("button", patch);
  c(m1, o1);
  c(o1, o2);

  const nodes = topologicalSearchFromNode(m1);
  return {
    nodes,
    expected: [m1.id, o1.id, o2.id],
  };
};

export const graphBranchMessageMessageRoute = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);
  const m4 = new MessageNodeImpl(patch, MessageType.Message);
  const lisp = newObject("lisp", patch);
  lisp.script = `
{
   type "hello"
   stepData $1
}
`;

  const messagemessage = newObject("messagemessage", patch);
  const route1 = newObject("route @field type hello", patch);
  const route2 = newObject("route @field type hello", patch);
  const get1 = newObject("get type", patch);
  const get2 = newObject("get stepData", patch);
  const get3 = newObject("get stepData", patch);

  c(m1, lisp);
  c(lisp, messagemessage);
  c(messagemessage, route1);
  c(route1, get1);
  c(messagemessage, get2, 0, 1);
  c(lisp, route2);
  c(route2, get3);
  c(get1, m2);
  c(get2, m3);
  c(get3, m4);

  console.log("m1=%s m2=%s m3=%3 m4=%3", m1.id, m2.id, m3.id, m4.id);
  const nodes = topologicalSearchFromNode(m1);
  return {
    nodes,
    expected: [
      m1.id,
      lisp.id,
      messagemessage.id,
      route1.id,
      get1.id,
      m2.id,
      get2.id,
      m3.id,
      route2.id,
      get3.id,
      m4.id,
    ],
  };
};

export const graphBranchMessageMessageRoute2 = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);
  const m4 = new MessageNodeImpl(patch, MessageType.Message);
  const lisp = newObject("lisp", patch);
  lisp.script = `
{
   type "hello"
   stepData $1
}
`;

  const p1 = newObject("p hello", patch, OperatorContextType.ZEN);
  const subpatch = p1.subpatch as SubPatch;

  const filter = newObject("filter.%= 1 0 @field stepData", patch);
  const messagemessage = newObject("messagemessage", patch);
  const route1 = newObject("route @field type hello", patch);

  const dict = newObject("dict hello p", subpatch);
  const get1 = newObject("get type", patch);
  const get2 = newObject("get stepData", patch);

  const in1 = newObject("in 1", subpatch, OperatorContextType.ZEN);

  c(dict, m4);
  c(in1, dict);

  c(m1, lisp);
  c(lisp, filter);
  c(filter, messagemessage);
  c(messagemessage, route1);
  c(route1, get1);
  c(messagemessage, get2, 0, 1);
  c(filter, p1);
  c(get1, m2);
  c(get2, m3);

  console.log("m1=%s m2=%s m3=%3 m4=%3", m1.id, m2.id, m3.id, m4.id);
  console.log("get1=%s get2=%s", get1.id, get2.id);
  console.log("dict=%s", dict.id);
  const nodes = topologicalSearchFromNode(m1);
  return {
    nodes,
    expectedObjectsEvaluated: [
      lisp.id,
      filter.id,
      messagemessage.id,
      route1.id,
      get1.id,
      get2.id,
      dict.id,
    ],
    expected: [
      m1.id,
      lisp.id,
      filter.id,
      messagemessage.id,
      route1.id,
      get1.id,
      m2.id,
      get2.id,
      m3.id,
      dict.id,
      m4.id,
    ],
  };
};
