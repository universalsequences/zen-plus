import { describe, it, expect } from "bun:test";
import {
  graph1,
  c,
  graph2,
  graphBranch1,
  graphBranch2,
  graphNestedSubPatch,
  graphNestedSubPatchIntoSubpatch,
  graphPipeMessage,
  graphSubPatch1,
  graphSubPatchIntoSubpatch,
  newObject,
} from "./graphs";
import { MockPatch } from "./mocks/MockPatch";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import {
  compileVM,
  getSourceNodesForCompilation,
  topologicalSearchFromNode,
} from "@/lib/nodes/vm/forwardpass";
import { MessageType } from "@/lib/nodes/types";
import { InstructionType } from "@/lib/nodes/vm/types";

describe("topologicalSearchFromNode", async () => {
  it("topologicalSearchFromNode simple", async () => {
    const { nodes, expected } = graph1();
    expect(nodes.map((x) => x.id)).toEqual(expected);
  });

  it("topologicalSearchFromNode message", async () => {
    const { nodes, expected } = graph2();
    expect(nodes.map((x) => x.id)).toEqual(expected);
  });

  it("topologicalSearchFromNode subpatch", async () => {
    const { nodes, expected } = graphSubPatch1();
    expect(nodes.map((x) => x.id)).toEqual(expected);
  });

  it("topologicalSearchFromNode subpatch into subpatch", async () => {
    const { nodes, expected } = graphSubPatchIntoSubpatch();
    expect(nodes.map((x) => x.id)).toEqual(expected);
  });

  it("topologicalSearchFromNode nested subpatch", async () => {
    const { nodes, expected } = graphNestedSubPatch();
    expect(nodes.map((x) => x.id)).toEqual(expected);
  });

  it("topologicalSearchFromNode nested subpatch into subpatch", async () => {
    const { nodes, expected } = graphNestedSubPatchIntoSubpatch();
    expect(nodes.map((x) => x.id)).toEqual(expected);
  });

  it("topologicalSearchFromNode branch route", async () => {
    const { nodes, expected } = graphBranch1();
    expect(nodes.map((x) => x.id)).toEqual(expected);
  });

  it("topologicalSearchFromNode branch filter.=", async () => {
    const { nodes, expected } = graphBranch2();
    expect(nodes.map((x) => x.id)).toEqual(expected);
  });

  it("topologicalSearchFromNode pipe message", async () => {
    const { nodes, expected } = graphPipeMessage();
    expect(nodes.map((x) => x.id)).toEqual(expected);
  });
});

describe("compileVM", async () => {
  it("handles metro graph", async () => {
    const patch = new MockPatch(undefined, false, false);
    const m1 = new MessageNodeImpl(patch, MessageType.Number);
    const m2 = new MessageNodeImpl(patch, MessageType.Number);
    const m3 = new MessageNodeImpl(patch, MessageType.Message);

    const metro = newObject("metro", patch);
    const getter = newObject("get stepNumber", patch);

    m1.connect(metro, metro.inlets[0], m1.outlets[0]);
    m2.connect(metro, metro.inlets[1], m2.outlets[0]);
    metro.connect(getter, getter.inlets[0], metro.outlets[0]);
    getter.connect(m3, m3.inlets[1], getter.outlets[0]);

    const messagemessage = newObject("messagemessage", patch);
    const m4 = new MessageNodeImpl(patch, MessageType.Number);
    const m5 = new MessageNodeImpl(patch, MessageType.Message);
    const mult = newObject("* 15", patch);

    c(getter, messagemessage);
    c(messagemessage, m4, 1, 0);
    c(messagemessage, mult, 0, 1);
    c(mult, m5, 1, 0);

    console.log(
      "getter.id=%s m4.id=%s m5.id=%s messagemessage.id=%s",
      getter.id,
      m4.id,
      m5.id,
      messagemessage.id,
    );

    patch.messageNodes.push(m1, m2, m3, m4, m5);

    const sourceNodes = getSourceNodesForCompilation(patch);
    expect(sourceNodes.length).toBe(3);

    const nodesFromM1 = topologicalSearchFromNode(m1);
    expect(nodesFromM1.map((x) => x.id)).toEqual([m1.id, metro.id]);

    compileVM(patch);

    expect(m1.instructions).toBeDefined(true);
    expect(m2.instructions).toBeDefined(true);
    expect(getter.instructions).toBeDefined(true);

    expect(m1.instructions?.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
    ]);

    expect(m2.instructions?.map((x) => x.type)).toEqual([
      InstructionType.Store,
      InstructionType.EvaluateObject,
    ]);

    expect(getter.instructions?.map((x) => x.type)).toEqual([
      InstructionType.EvaluateObject,
      InstructionType.ReplaceMessage,
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.Branch,
    ]);

    const branch = getter.instructions?.[5];
    expect(branch?.branches?.length).toBe(2);

    expect(branch?.branches?.[0].map((x) => x.type)).toEqual([InstructionType.ReplaceMessage]);
    expect(branch?.branches?.[1].map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.ReplaceMessage,
    ]);
  });

  it("handles metro graph 2", async () => {
    const patch = new MockPatch(undefined, false, false);
    const m1 = new MessageNodeImpl(patch, MessageType.Number);
    const m2 = new MessageNodeImpl(patch, MessageType.Number);
    const m3 = new MessageNodeImpl(patch, MessageType.Message);

    const metro = newObject("metro", patch);
    const getter = newObject("get stepNumber", patch);

    m1.connect(metro, metro.inlets[0], m1.outlets[0]);
    m2.connect(metro, metro.inlets[1], m2.outlets[0]);

    const messagemessage = newObject("messagemessage", patch);
    const messagemessage2 = newObject("messagemessage", patch);

    c(metro, messagemessage);
    const m4 = new MessageNodeImpl(patch, MessageType.Number);
    const m5 = new MessageNodeImpl(patch, MessageType.Message);
    const mult = newObject("* 15", patch);

    c(messagemessage, m4, 1, 0);
    c(messagemessage, messagemessage2, 0, 1);
    c(messagemessage2, mult);
    c(mult, m5, 1, 0);

    console.log(
      "getter.id=%s m4.id=%s m5.id=%s messagemessage.id=%s messagemessage2.id=%s",
      getter.id,
      m4.id,
      m5.id,
      messagemessage.id,
      messagemessage2.id,
    );

    patch.messageNodes.push(m1, m2, m3, m4, m5);

    const sourceNodes = getSourceNodesForCompilation(patch);
    expect(sourceNodes.length).toBe(3);

    const nodesFromM1 = topologicalSearchFromNode(m1);
    expect(nodesFromM1.map((x) => x.id)).toEqual([m1.id, metro.id]);

    compileVM(patch);

    expect(m1.instructions).toBeDefined(true);
    expect(m2.instructions).toBeDefined(true);

    expect(m1.instructions?.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
    ]);

    expect(m2.instructions?.map((x) => x.type)).toEqual([
      InstructionType.Store,
      InstructionType.EvaluateObject,
    ]);

    console.log(messagemessage.instructions?.map((x) => x.type));
    const branch = messagemessage.instructions?.[1];
    expect(branch?.branches?.length).toBe(2);

    expect(branch?.branches?.[0].map((x) => x.type)).toEqual([InstructionType.ReplaceMessage]);

    // should have a branch here refering to messagemessage2
    expect(branch?.branches?.[1].map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.Branch,
    ]);
  });
});
