import { describe, it, expect } from "bun:test";
import { compileInstructions } from "@/lib/nodes/vm/instructions";
import { InstructionType, Instruction } from "@/lib/nodes/vm/types";
import { evaluate } from "@/lib/nodes/vm/evaluate";
import {
  branchPopperGraph,
  branchPopperGraphSwap,
  branchPopperGraphSwapMult,
  graph1,
  graph2,
  graphBranch1,
  graphBranch2,
  graphBranchIntoSubPatch,
  graphBranchMessageMessage,
  graphBranchMessageMessageNested,
  graphBranchMessageMessageRoute,
  graphBranchMessageMessageRoute2,
  graphCyclicScript,
  graphScript,
  graphSubPatch1,
  graphSubPatchIntoSubpatch,
} from "./graphs";
import { compileVM, topologicalSearchFromNode } from "@/lib/nodes/vm/forwardpass";
import { ObjectNode } from "@/lib/nodes/types";

describe("createInstructions", async () => {
  it("createInstructions simple", async () => {
    const { nodes } = graph1();
    const instructions = compileInstructions(nodes);
    expect(instructions.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
    ]);
    expect(instructions.map((x) => x.node?.id)).toEqual([
      nodes[1].id, // object 1 Attribute
      nodes[1].id, // object 1 Store
      nodes[1].id, // object 1 Evaluate Object
      nodes[2].id, // object 2 Attribute
      nodes[2].id, // object 2 Store
      nodes[2].id, // object 2 Evaluate Object
    ]);
  });

  it("createInstructions simple with message nodes", async () => {
    const { nodes } = graph2();
    const instructions = compileInstructions(nodes);
    expect(instructions.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.ReplaceMessage,
      InstructionType.EvaluateObject,
      InstructionType.ReplaceMessage,
    ]);
  });

  it("createInstructions with subpatch", async () => {
    const { nodes } = graphSubPatch1();
    const instructions = compileInstructions(nodes);
    expect(instructions.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Attribute,
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.ReplaceMessage,
    ]);
  });

  it("createInstructions with subpatch into other subpatch", async () => {
    const { nodes } = graphSubPatchIntoSubpatch();
    const instructions = compileInstructions(nodes);
    expect(instructions.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Attribute,
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.ReplaceMessage,
    ]);
  });

  it("createInstructions with subpatch into branch", async () => {
    const { nodes } = graphBranch1();
    const instructions = compileInstructions(nodes);
    expect(instructions.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.Branch,
    ]);

    expect(instructions[3].branches).toBeDefined();

    expect(instructions[3].branches?.length).toBe(5);

    // 3 active branches
    expect(instructions[3].branches?.filter((x) => x.length > 0).length).toBe(3);

    // 1st branch is longer
    expect(instructions[3].branches?.[0].map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject, // * 2
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject, // + 2
      InstructionType.ReplaceMessage,
    ]);

    // 2nd branch is short
    expect(instructions[3].branches?.[1].map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.ReplaceMessage,
    ]);

    // 3nd branch is short
    expect(instructions[3].branches?.[2].map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.ReplaceMessage,
    ]);
  });
});

describe("evaluateInstructions", async () => {
  it("evaluateInstructions simple with message nodes", async () => {
    const { nodes, m2, m3 } = graph2();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 5);
    expect(m2.message).toBe(20);
    expect(m3.message).toBe(100);
  });

  it("evaluateInstructions with subpatch", async () => {
    const { nodes, m2 } = graphSubPatch1();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 5);
    expect(m2.message).toBe(15);
  });

  it("evaluateInstructions with subpatch into subpatch", async () => {
    const { nodes, m2 } = graphSubPatchIntoSubpatch();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 5);
    expect(m2.message).toBe(14);
  });

  it("evaluateInstructions with route branch", async () => {
    const { nodes, m2, m3, m4 } = graphBranch1();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 1);
    expect(m2.message).toBe(4);
    expect(m3.message).toBeDefined(false);
    expect(m4.message).toBeDefined(false);

    evaluate(instructions, 2);
    expect(m2.message).toBe(4);
    expect(m3.message).toBe(6);
    expect(m4.message).toBeDefined(false);

    evaluate(instructions, 3);
    expect(m2.message).toBe(4);
    expect(m3.message).toBe(6);
    expect(m4.message).toBe(12);
  });

  it("evaluateInstructions with branch filter", async () => {
    const { nodes, m2, m3 } = graphBranch2();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 1);
    expect(m2.message).toBe(4);
    expect(m3.message).toBeDefined(false);

    evaluate(instructions, 20);
    expect(m2.message).toBe(4);
    expect(m3.message).toBe(20);
  });

  it("messagemessage should execute branches sequentially", () => {
    const { nodes, m2, m3, expectedObjectsEvaluated } = graphBranchMessageMessage();
    const instructions = compileInstructions(nodes);
    const { objectsEvaluated } = evaluate(instructions, 5, true);
    expect(m2.message).toBe(12);
    expect(m3.message).toBe(49);
    expect(objectsEvaluated?.map((x) => x.id)).toEqual(expectedObjectsEvaluated.map((x) => x.id));
  });

  it("nested messagemessage should execute branches sequentially", () => {
    const { nodes, expectedObjectsEvaluated } = graphBranchMessageMessageNested();
    const instructions = compileInstructions(nodes);
    const { objectsEvaluated } = evaluate(instructions, 5, true);
    expect(objectsEvaluated?.map((x) => x.id)).toEqual(expectedObjectsEvaluated.map((x) => x.id));
  });

  it("script in patch", () => {
    const { nodes, m2 } = graphScript();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 5);
    expect(m2.message).toEqual([5, 5, 5, 5]);
  });

  it("script matrix", () => {
    const { matrix, nodesA, nodesB, expectedA, expectedB } = graphCyclicScript();

    expect(nodesA.map((x) => x.id)).toEqual(expectedA);
    expect(nodesB.map((x) => x.id)).toEqual(expectedB);

    const instructionsA = compileInstructions(nodesA);
    const instructionsB = compileInstructions(nodesB);

    expect(instructionsB.map((x) => x.type)).toEqual([
      InstructionType.EvaluateObject, // button
      InstructionType.Attribute,
      InstructionType.PipeMessage, // message box [0.5,0.5,0.5,0.5]
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.Store,
    ]);

    evaluate(instructionsB, "bang");
    expect(Array.from(matrix.buffer as Float32Array)).toEqual([0.5, 0.5, 0.5, 0.5]);

    evaluate(instructionsA, 1);
    expect(Array.from(matrix.buffer as Float32Array)).toEqual([1, 1, 1, 1.5]);

    expect(instructionsA.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store, // <lisp> store
      InstructionType.EvaluateObject, // <lisp> eval
      InstructionType.Attribute, // <pack> attribute
      InstructionType.Store, // pack store
      InstructionType.EvaluateObject, // pack eval
      InstructionType.Attribute, // matrix attribute
      InstructionType.Store, // matrix store
      InstructionType.EvaluateObject, // matrix eval
      InstructionType.Store, // lisp store
    ]);
  });

  it("branch into subpatch", () => {
    const { nodes, m4 } = graphBranchIntoSubPatch();
    const instructions = compileInstructions(nodes);
    console.log("instructions");
    console.log(instructions.map((x) => [x.node?.id, x.type]));

    console.log("branch 1");
    console.log(instructions[3].branches?.[0].map((x) => [x.node?.id, x.type]));
    console.log("branch 2");
    console.log(instructions[3].branches?.[1].map((x) => [x.node?.id, x.type]));

    evaluate(instructions, 1);

    expect(m4.message).toBe(3);

    // in order for this to pass we need to change topologicalSearchFromNode to not
    // pass new Set() to getOutboundConnection()
  });

  it("subscribe test", () => {
    //
  });

  it("unpack test", () => {
    //
  });

  it("messagemessage / route test", () => {
    const { nodes, expected } = graphBranchMessageMessageRoute();
    expect(nodes.map((x) => x.id)).toEqual(expected);
    const instructions = compileInstructions(nodes);
  });

  it("messagemessage / route test 2", () => {
    const { nodes, expected, expectedObjectsEvaluated } = graphBranchMessageMessageRoute2();
    expect(nodes.map((x) => x.id)).toEqual(expected);
    const instructions = compileInstructions(nodes);
    const { objectsEvaluated } = evaluate(instructions, 5);
    expect(objectsEvaluated.map((x) => x.id)).toEqual(expectedObjectsEvaluated);
  });

  it("branch pop basic", () => {
    const { patch, in_button, filter, out_message } = branchPopperGraph();
    compileVM(patch, false);

    const in_button_instructions = in_button.instructions;
    expect(in_button.instructions).toBeDefined(true);
    expect(in_button.instructions?.length, 5);

    evaluate(in_button.instructions as Instruction[], "bang");
    const { instructionsEvaluated } = evaluate(filter.instructions as Instruction[], {
      stepNumber: 0,
    });

    expect(out_message.message).toBe(0);
  });

  it("inverse", () => {
    // not enough to force objects before messages
    // need to determine if the path leads to a cold path
    const swap = branchPopperGraphSwap();
    const swapNodes = topologicalSearchFromNode(swap.filter);
    const normal = branchPopperGraph();
    const normalNodes = topologicalSearchFromNode(normal.filter);

    expect(swapNodes.map((x) => (x as ObjectNode).text)).toEqual(
      normalNodes.map((x) => (x as ObjectNode).text),
    );
  });

  it("inverse+mult", () => {
    // not enough to force objects before messages
    // need to determine if the path leads to a cold path
    const { patch, filter, in_button, out_message } = branchPopperGraphSwapMult();
    compileVM(patch, false);

    expect(in_button.instructions).toBeDefined(true);
    expect(in_button.instructions?.length, 5);

    const nodes = topologicalSearchFromNode(filter);

    evaluate(in_button.instructions as Instruction[], "bang");
    const { instructionsEvaluated } = evaluate(filter.instructions as Instruction[], {
      stepNumber: 0,
    });

    expect(out_message.message).toBe(0);
  });
});
