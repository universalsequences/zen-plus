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

// Helper function to safely connect nodes only if outlets/inlets exist
const safeConnect = (sourceNode: any, destNode: any, destInletIndex: number, sourceOutletIndex: number) => {
  if (sourceNode.outlets && sourceNode.outlets[sourceOutletIndex] &&
      destNode.inlets && destNode.inlets[destInletIndex]) {
    sourceNode.connect(destNode, destNode.inlets[destInletIndex], sourceNode.outlets[sourceOutletIndex]);
    return true;
  }
  return false;
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

export const branchPopperGraph = () => {
  const patch = new MockPatch(undefined, false, false);

  const filter = newObject("filter.%= 2 0 @field stepNumber ", patch, OperatorContextType.CORE);
  const button = newObject("button", patch, OperatorContextType.CORE);
  const counter = newObject("counter @max 16", patch, OperatorContextType.CORE);
  const list_nth = newObject("list.nth", patch, OperatorContextType.CORE);

  const select_message = new MessageNodeImpl(patch, MessageType.Message);
  select_message.message = "select $1";

  const in_button = newObject("button", patch, OperatorContextType.CORE);
  const matrix = newObject("matrix @rows 1 @columns 6", patch, OperatorContextType.CORE);

  const out_message = new MessageNodeImpl(patch, MessageType.Message);

  c(filter, button);
  c(button, counter);
  c(select_message, matrix);
  c(counter, list_nth);
  c(counter, select_message);
  c(matrix, list_nth, 1, 0);
  c(list_nth, out_message, 1, 0);
  c(in_button, matrix);

  return { patch, filter, counter, button, in_button, out_message };
};

export const branchPopperGraphSwap = () => {
  const patch = new MockPatch(undefined, false, false);

  const filter = newObject("filter.%= 2 0 @field stepNumber ", patch, OperatorContextType.CORE);
  const button = newObject("button", patch, OperatorContextType.CORE);
  const counter = newObject("counter @max 16", patch, OperatorContextType.CORE);
  const list_nth = newObject("list.nth", patch, OperatorContextType.CORE);

  const select_message = new MessageNodeImpl(patch, MessageType.Message);
  select_message.message = "select $1";

  const in_button = newObject("button", patch, OperatorContextType.CORE);
  const matrix = newObject("matrix @rows 1 @columns 6", patch, OperatorContextType.CORE);

  const out_message = new MessageNodeImpl(patch, MessageType.Message);

  c(filter, button);
  c(button, counter);
  c(counter, select_message);
  c(select_message, matrix);
  c(counter, list_nth);
  c(matrix, list_nth, 1, 0);
  c(list_nth, out_message, 1, 0);
  c(in_button, matrix);

  return { patch, filter, counter, button, in_button, out_message };
};

export const branchPopperGraphSwapMult = () => {
  const patch = new MockPatch(undefined, false, false);

  const filter = newObject("filter.%= 2 0 @field stepNumber ", patch, OperatorContextType.CORE);
  const button = newObject("button", patch, OperatorContextType.CORE);
  const counter = newObject("counter @max 16", patch, OperatorContextType.CORE);
  const list_nth = newObject("list.nth", patch, OperatorContextType.CORE);
  const mult = newObject("* 1", patch, OperatorContextType.CORE);

  const select_message = new MessageNodeImpl(patch, MessageType.Message);
  select_message.message = "select $1";

  const in_button = newObject("button", patch, OperatorContextType.CORE);
  const matrix = newObject("matrix @rows 1 @columns 6", patch, OperatorContextType.CORE);

  const out_message = new MessageNodeImpl(patch, MessageType.Message);

  c(filter, button);
  c(button, counter);
  c(counter, mult);
  c(mult, select_message);
  c(select_message, matrix);
  c(counter, list_nth);
  c(matrix, list_nth, 1, 0);
  c(list_nth, out_message, 1, 0);
  c(in_button, matrix);

  return { patch, filter, counter, button, in_button, out_message };
};

// Complex graph with multiple parallel processing chains
// Graph: m1 -> parallel_processor -> mult1(* 2) -> m2
//         |                      |-> mult2(* 3) -> m3  
//         |                      |-> mult3(* 4) -> m4
//         |-> direct_mult(* 5) -> m5
export const graphParallelProcessing = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);
  const m5 = new MessageNodeImpl(patch, MessageType.Message);

  const parallel_processor = newObject("messagemessage", patch);
  const mult1 = newObject("* 2", patch);
  const mult2 = newObject("* 3", patch);
  const direct_mult = newObject("* 5", patch);

  // Connect to parallel processor
  m1.connect(parallel_processor, parallel_processor.inlets[0], m1.outlets[0]);
  
  // Two parallel branches from messagemessage (messagemessage typically has 2 outlets)
  parallel_processor.connect(mult1, mult1.inlets[0], parallel_processor.outlets[0]);
  parallel_processor.connect(mult2, mult2.inlets[0], parallel_processor.outlets[1]);
  
  // Connect to outputs
  mult1.connect(m2, m2.inlets[1], mult1.outlets[0]);
  mult2.connect(m3, m3.inlets[1], mult2.outlets[0]);

  // Direct path
  m1.connect(direct_mult, direct_mult.inlets[0], m1.outlets[0]);
  direct_mult.connect(m5, m5.inlets[1], direct_mult.outlets[0]);

  patch.messageNodes.push(m1, m2, m3, m5);
  const nodes = topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    m1, m2, m3, m5,
    parallel_processor,
    mult1, mult2, direct_mult,
    expected: [m1.id, parallel_processor.id, mult1.id, mult2.id, direct_mult.id]
  };
};

// Deep nested subpatches with different context types
// Graph: m1 -> p1[zen_patch] -> p2[core_patch] -> p3[zen_patch] -> m2
//             |               |                |
//             zen: in->add(+1)->out  core: in->mult(*2)->out  zen: in->sub(-1)->out
export const graphDeepNestedSubpatches = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);

  // Create first subpatch (ZEN)
  const p1 = newObject("p", patch, OperatorContextType.ZEN);
  const subpatch1 = p1.subpatch as SubPatch;
  const in1 = newObject("in 1", subpatch1, OperatorContextType.ZEN);
  const out1 = newObject("out 1", subpatch1, OperatorContextType.ZEN);
  const add1 = newObject("+ 1", subpatch1);
  in1.connect(add1, add1.inlets[0], in1.outlets[0]);
  add1.connect(out1, out1.inlets[0], add1.outlets[0]);

  // Create second subpatch (CORE)
  const p2 = newObject("p", patch, OperatorContextType.ZEN);
  const subpatch2 = p2.subpatch as SubPatch;
  const in2 = newObject("in 1", subpatch2, OperatorContextType.ZEN);
  const out2 = newObject("out 1", subpatch2, OperatorContextType.ZEN);
  const mult2 = newObject("* 2", subpatch2);
  in2.connect(mult2, mult2.inlets[0], in2.outlets[0]);
  mult2.connect(out2, out2.inlets[0], mult2.outlets[0]);

  // Create third subpatch (ZEN)
  const p3 = newObject("p", patch, OperatorContextType.ZEN);
  const subpatch3 = p3.subpatch as SubPatch;
  const in3 = newObject("in 1", subpatch3, OperatorContextType.ZEN);
  const out3 = newObject("out 1", subpatch3, OperatorContextType.ZEN);
  const sub3 = newObject("- 1", subpatch3);
  in3.connect(sub3, sub3.inlets[0], in3.outlets[0]);
  sub3.connect(out3, out3.inlets[0], sub3.outlets[0]);

  // Connect main chain
  m1.connect(p1, p1.inlets[0], m1.outlets[0]);
  p1.connect(p2, p2.inlets[0], p1.outlets[0]);
  p2.connect(p3, p3.inlets[0], p2.outlets[0]);
  p3.connect(m2, m2.inlets[1], p3.outlets[0]);

  patch.messageNodes.push(m1, m2);
  const nodes = topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    m1, m2,
    p1, p2, p3,
    add1, mult2, sub3,
    expected: [m1.id, add1.id, mult2.id, sub3.id]
  };
};

// Multi-input convergence with different timing
// Graph: m1 -> add_A(+ ?) <- m2
//        m3 -> add_B(+ ?) <- m4
//        add_A -> mult(* ?) <- add_B
//        mult -> m5
export const graphMultiInputConvergence = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Number);
  const m3 = new MessageNodeImpl(patch, MessageType.Number);
  const m4 = new MessageNodeImpl(patch, MessageType.Number);
  const m5 = new MessageNodeImpl(patch, MessageType.Message);

  const add_A = newObject("+ 10", patch);
  const add_B = newObject("+ 20", patch);
  const mult = newObject("* 3", patch);

  // Two separate addition chains
  m1.connect(add_A, add_A.inlets[0], m1.outlets[0]);
  m2.connect(add_A, add_A.inlets[1], m2.outlets[0]);
  
  m3.connect(add_B, add_B.inlets[0], m3.outlets[0]);
  m4.connect(add_B, add_B.inlets[1], m4.outlets[0]);

  // Convergence at multiplication
  add_A.connect(mult, mult.inlets[0], add_A.outlets[0]);
  add_B.connect(mult, mult.inlets[1], add_B.outlets[0]);

  // Final output
  mult.connect(m5, m5.inlets[1], mult.outlets[0]);

  patch.messageNodes.push(m1, m2, m3, m4, m5);
  const nodes = topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    m1, m2, m3, m4, m5,
    add_A, add_B, mult,
    expected: [m1.id, add_A.id, mult.id]
  };
};

// Complex sequential processing with multiple branches
// Graph: m1 -> add_base(+ 10) -> split -> mult_A(* 2) -> m2
//                                     |
//                                     |-> mult_B(* 3) -> m3
export const graphSequentialBranching = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);

  const add_base = newObject("+ 10", patch);
  const split = newObject("messagemessage", patch);
  const mult_A = newObject("* 2", patch);
  const mult_B = newObject("* 3", patch);

  // Sequential processing chain
  m1.connect(add_base, add_base.inlets[0], m1.outlets[0]);
  add_base.connect(split, split.inlets[0], add_base.outlets[0]);
  split.connect(mult_A, mult_A.inlets[0], split.outlets[0]);
  split.connect(mult_B, mult_B.inlets[0], split.outlets[1]);
  
  mult_A.connect(m2, m2.inlets[1], mult_A.outlets[0]);
  mult_B.connect(m3, m3.inlets[1], mult_B.outlets[0]);

  patch.messageNodes.push(m1, m2, m3);
  const nodes = topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    m1, m2, m3,
    add_base, split, mult_A, mult_B,
    expected: [m1.id, add_base.id, split.id, mult_A.id, mult_B.id]
  };
};

// Mixed routing with conditional branches and subpatches
// Graph: m1 -> route(1 2) -> p1[add +1] -> m2
//                    |       p2[mult *3] -> m3
//                    |
//                    |-> direct_output -> m5
export const graphMixedRoutingWithSubpatches = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);
  const m5 = new MessageNodeImpl(patch, MessageType.Message);

  const route = newObject("route 1 2", patch);
  const direct_output = newObject("+ 100", patch);
  
  // Create subpatches with different operations
  const p1 = newObject("p", patch, OperatorContextType.ZEN);
  const subpatch1 = p1.subpatch as SubPatch;
  const in1 = newObject("in 1", subpatch1, OperatorContextType.ZEN);
  const out1 = newObject("out 1", subpatch1, OperatorContextType.ZEN);
  const add1 = newObject("+ 1", subpatch1);
  in1.connect(add1, add1.inlets[0], in1.outlets[0]);
  add1.connect(out1, out1.inlets[0], add1.outlets[0]);

  const p2 = newObject("p", patch, OperatorContextType.ZEN);
  const subpatch2 = p2.subpatch as SubPatch;
  const in2 = newObject("in 1", subpatch2, OperatorContextType.ZEN);
  const out2 = newObject("out 1", subpatch2, OperatorContextType.ZEN);
  const mult2 = newObject("* 3", subpatch2);
  in2.connect(mult2, mult2.inlets[0], in2.outlets[0]);
  mult2.connect(out2, out2.inlets[0], mult2.outlets[0]);

  // Connect routing directly to subpatches and outputs
  m1.connect(route, route.inlets[0], m1.outlets[0]);
  route.connect(p1, p1.inlets[0], route.outlets[0]);
  route.connect(p2, p2.inlets[0], route.outlets[1]);

  // Connect subpatches directly to message outputs
  p1.connect(m2, m2.inlets[1], p1.outlets[0]);
  p2.connect(m3, m3.inlets[1], p2.outlets[0]);

  // Direct output path
  m1.connect(direct_output, direct_output.inlets[0], m1.outlets[0]);
  direct_output.connect(m5, m5.inlets[1], direct_output.outlets[0]);

  patch.messageNodes.push(m1, m2, m3, m5);
  const nodes = topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    m1, m2, m3, m5,
    route, p1, p2,
    add1, mult2, direct_output,
    expected: [m1.id, route.id, add1.id, mult2.id, direct_output.id]
  };
};

// Multi-path processing with routing and arithmetic
// Graph: m1 -> route -> mult_filter(* 1) -> mult(* 2) -> m2
//         |                              |
//         |                              |-> add(+ 10) -> m3
//         |-> add_filter(+ 0) -> sub(- 1) -> m4
export const graphNestedConditionalProcessing = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);
  const m3 = new MessageNodeImpl(patch, MessageType.Message);
  const m4 = new MessageNodeImpl(patch, MessageType.Message);

  const route_main = newObject("route 1 2", patch);
  const mult_filter = newObject("* 1", patch);
  const add_filter = newObject("+ 0", patch);
  
  const mult = newObject("* 2", patch);
  const add = newObject("+ 10", patch);
  const sub = newObject("- 1", patch);

  // Main routing path
  m1.connect(route_main, route_main.inlets[0], m1.outlets[0]);
  route_main.connect(mult_filter, mult_filter.inlets[0], route_main.outlets[0]);
  mult_filter.connect(mult, mult.inlets[0], mult_filter.outlets[0]);
  mult.connect(m2, m2.inlets[1], mult.outlets[0]);

  // Second branch from route
  route_main.connect(add, add.inlets[0], route_main.outlets[1]);
  add.connect(m3, m3.inlets[1], add.outlets[0]);

  // Alternative path
  m1.connect(add_filter, add_filter.inlets[0], m1.outlets[0]);
  add_filter.connect(sub, sub.inlets[0], add_filter.outlets[0]);
  sub.connect(m4, m4.inlets[1], sub.outlets[0]);

  patch.messageNodes.push(m1, m2, m3, m4);
  const nodes = topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    m1, m2, m3, m4,
    route_main, mult_filter, add_filter,
    mult, add, sub,
    expected: [m1.id, route_main.id, mult_filter.id, mult.id, add_filter.id, sub.id]
  };
};

// Arithmetic processing with dual computation paths
// Graph: m1 -> add_base(+ 5) -> mult_A(* 2) -> add_final(+ ?) <- mult_B(* 3) <- sub_base(- 1) <- m1
//                                                   |
//                                                   v
//                                                  m2
export const graphDualArithmeticProcessing = () => {
  const patch = new MockPatch(undefined, false, false);
  const m1 = new MessageNodeImpl(patch, MessageType.Number);
  const m2 = new MessageNodeImpl(patch, MessageType.Message);

  const add_base = newObject("+ 5", patch);
  const sub_base = newObject("- 1", patch);
  const mult_A = newObject("* 2", patch);
  const mult_B = newObject("* 3", patch);
  const add_final = newObject("+ 0", patch);

  // First processing path: m1 -> add_base -> mult_A -> add_final
  m1.connect(add_base, add_base.inlets[0], m1.outlets[0]);
  add_base.connect(mult_A, mult_A.inlets[0], add_base.outlets[0]);
  mult_A.connect(add_final, add_final.inlets[0], mult_A.outlets[0]);

  // Second processing path: m1 -> sub_base -> mult_B -> add_final
  m1.connect(sub_base, sub_base.inlets[0], m1.outlets[0]);
  sub_base.connect(mult_B, mult_B.inlets[0], sub_base.outlets[0]);
  mult_B.connect(add_final, add_final.inlets[1], mult_B.outlets[0]);

  // Final output
  add_final.connect(m2, m2.inlets[1], add_final.outlets[0]);

  patch.messageNodes.push(m1, m2);
  const nodes = topologicalSearchFromNode(m1);

  return {
    nodes,
    patch,
    m1, m2,
    add_base, sub_base, mult_A, mult_B, add_final,
    expected: [m1.id, add_base.id, mult_A.id, sub_base.id, mult_B.id, add_final.id]
  };
};
