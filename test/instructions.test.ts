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
  // Graph: m1 -> o1(* 4) -> o2(* 5)
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

  // Graph: m1 -> o1(* 4) -> o2(* 5)
  //             |         |
  //             v         v
  //            m2        m3
  it("createInstructions simple with message nodes", async () => {
    const { nodes } = graph2();
    const instructions = compileInstructions(nodes);
    expect(instructions.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject, // o1 evaluate
      InstructionType.Attribute,
      InstructionType.Store, // store result of o1 in o2
      InstructionType.ReplaceMessage,
      InstructionType.EvaluateObject, // o2 evaluate
      InstructionType.ReplaceMessage, // execute replace message with stored result
    ]);
  });

  // Graph: m1 -> o1[p] -> m2
  //              |
  //              subpatch: in1 -> mult(* 3) -> out1
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

  // Graph: m1 -> p1[subpatch1] -> p2[subpatch2] -> o2(- 5) -> m2
  //              |                |                |
  //              in1->mult1(*3)->out1  in1->mult2(+4)->out1
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

  // Graph: m1 -> route(1 2 3 4) -> mult1(* 2) -> add1_A(+ 2) -> m2
  //                    |                                            |
  //                    |-> mult2(* 3) -> m3                        |
  //                    |                                            |
  //                    |-> mult3(* 4) -> m4                        |
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
  // Graph: m1 -> o1(* 4) -> o2(* 5)
  //             |         |
  //             v         v
  //            m2        m3
  it("evaluateInstructions simple with message nodes", async () => {
    const { nodes, m2, m3 } = graph2();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 5);
    expect(m2.message).toBe(20);
    expect(m3.message).toBe(100);
  });

  // Graph: m1 -> o1[p] -> m2
  //              |
  //              subpatch: in1 -> mult(* 3) -> out1
  it("evaluateInstructions with subpatch", async () => {
    const { nodes, m2 } = graphSubPatch1();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 5);
    expect(m2.message).toBe(15);
  });

  // Graph: m1 -> p1[subpatch1] -> p2[subpatch2] -> o2(- 5) -> m2
  //              |                |                |
  //              in1->mult1(*3)->out1  in1->mult2(+4)->out1
  it("evaluateInstructions with subpatch into subpatch", async () => {
    const { nodes, m2 } = graphSubPatchIntoSubpatch();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 5);
    expect(m2.message).toBe(14);
  });

  // Graph: m1 -> route(1 2 3 4) -> mult1(* 2) -> add1_A(+ 2) -> m2
  //                    |                                            |
  //                    |-> mult2(* 3) -> m3                        |
  //                    |                                            |
  //                    |-> mult3(* 4) -> m4                        |
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

  // Graph: m1 -> filter.= 1 -> mult1(* 2) -> add1_A(+ 2) -> m2
  //         |
  //         |-> m3
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

  // Graph: m1 -> messagemessage -> mult1(* 2) -> add1_A(+ 2) -> m2
  //                    |
  //                    |-> mult2(* 8) -> add2_A(+ 9) -> m3
  it("messagemessage should execute branches sequentially", () => {
    const { nodes, m2, m3, expectedObjectsEvaluated } = graphBranchMessageMessage();
    const instructions = compileInstructions(nodes);
    const { objectsEvaluated } = evaluate(instructions, 5, true);
    expect(m2.message).toBe(12);
    expect(m3.message).toBe(49);
    expect(objectsEvaluated?.map((x) => x.id)).toEqual(expectedObjectsEvaluated.map((x) => x.id));
  });

  // Graph: m1 -> messagemessage1 -> mult1(* 2) -> add1_A(+ 2) -> messagemessage2
  //                      |                                                |
  //                      |-> mult2(* 8) -> add2_A(+ 9) -> m3           |
  //                                                                       |
  //                                                mult3(* 2) -> add3_A(+ 2) -> m3
  //                                                       |
  //                                                mult4(* 2) -> add4_A(+ 2) -> m4
  it("nested messagemessage should execute branches sequentially", () => {
    const { nodes, expectedObjectsEvaluated } = graphBranchMessageMessageNested();
    const instructions = compileInstructions(nodes);
    const { objectsEvaluated } = evaluate(instructions, 5);
    expect(objectsEvaluated?.map((x) => x.id)).toEqual(expectedObjectsEvaluated.map((x) => x.id));
  });

  // Graph: m1 -> p[subpatch] -> m2
  //              |
  //              subpatch: in1 -> script(lisp) -> out2
  it("script in patch", () => {
    const { nodes, m2 } = graphScript();
    const instructions = compileInstructions(nodes);
    evaluate(instructions, 5);
    expect(m2.message).toEqual([5, 5, 5, 5]);
  });

  // Graph A: m1 -> lisp -> unpack -> matrix
  //                           ^         |
  //                           |_________|
  // Graph B: button -> m2 -> matrix
  it("script matrix", () => {
    const { matrix, nodesA, nodesB, expectedA, expectedB } = graphCyclicScript();

    expect(nodesA.map((x) => x.id)).toEqual(expectedA);
    expect(nodesB.map((x) => x.id)).toEqual(expectedB);

    const instructionsA = compileInstructions(nodesA);
    const instructionsB = compileInstructions(nodesB);

    expect(instructionsB.map((x) => x.type)).toEqual([
      InstructionType.EvaluateObject, // button
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.PipeMessage, // message box [0.5,0.5,0.5,0.5]
      InstructionType.Attribute,
      InstructionType.Store,
      InstructionType.EvaluateObject,
      InstructionType.Branch,
    ]);

    evaluate(instructionsB, "bang");
    expect(Array.from(matrix.buffer as Float32Array)).toEqual([0.5, 0.5, 0.5, 0.5]);

    evaluate(instructionsA, 1);
    expect(Array.from(matrix.buffer as Float32Array)).toEqual([1, 1, 1, 1.5]);

    expect(instructionsA.map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store, // <lisp> store
      InstructionType.EvaluateObject, // <lisp> eval
      InstructionType.Branch, // <pack> attribute
    ]);

    expect(instructionsA?.[3]?.branches?.[0].map((x) => x.type)).toEqual([
      InstructionType.Attribute,
      InstructionType.Store, // pack store
      InstructionType.EvaluateObject, // pack eval
      InstructionType.Attribute, // matrix attribute
      InstructionType.Store, // matrix store
      InstructionType.EvaluateObject, // matrix eval
      InstructionType.Branch, // lisp branch
    ]);
  });

  // Graph: m1 -> filter.= 1 -> m2 -> o1[p] -> m4
  //                    |       |     |
  //                    |       |     subpatch: in1 -> mult(* 3) -> out1
  //                    |       |
  //                    |-> m3 -|
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

  // Graph: [placeholder for subscribe test]
  it("subscribe test", () => {
    //
  });

  // Graph: [placeholder for unpack test]
  it("unpack test", () => {
    //
  });

  // Graph: m1 -> lisp -> messagemessage -> route1 -> get1 -> m2
  //                |              |
  //                |              |-> get2 -> m3
  //                |
  //                |-> route2 -> get3 -> m4
  it("messagemessage / route test", () => {
    const { nodes, expected } = graphBranchMessageMessageRoute();
    expect(nodes.map((x) => x.id)).toEqual(expected);
    const instructions = compileInstructions(nodes);
  });

  // Graph: m1 -> lisp -> filter -> messagemessage -> route1 -> get1 -> m2
  //                           |               |
  //                           |               |-> get2 -> m3
  //                           |
  //                           |-> p1[subpatch] -> m4
  //                               |
  //                               subpatch: in1 -> dict -> m4
  it("messagemessage / route test 2", () => {
    const { nodes, expected, expectedObjectsEvaluated } = graphBranchMessageMessageRoute2();
    expect(nodes.map((x) => x.id)).toEqual(expected);
    const instructions = compileInstructions(nodes);
    const { objectsEvaluated } = evaluate(instructions, 5);
    expect(objectsEvaluated.map((x) => x.id)).toEqual(expectedObjectsEvaluated);
  });

  // Graph: in_button -> matrix -> list_nth -> out_message
  //                        |          ^
  //                        v          |
  //        filter -> button -> counter -> select_message
  //                                |
  //                                v
  //                            list_nth
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

  // Graph: Same as branch pop basic but with swapped connection order
  //        filter -> button -> counter -> list_nth -> out_message
  //                              |          ^
  //                              v          |
  //                      select_message -> matrix
  //                              ^
  //                              |
  //                         in_button
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

  // Graph: filter -> button -> counter -> mult(* 1) -> select_message -> matrix
  //                              |                                          |
  //                              |-> list_nth <--------------------------|
  //                                     |
  //                                     v
  //                               out_message
  //        in_button -> matrix
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
