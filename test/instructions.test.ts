import { describe, it, expect } from "bun:test";
import { compileInstructions } from "@/lib/nodes/vm/instructions";
import { InstructionType } from "@/lib/nodes/vm/types";
import {
  graph1,
  graph2,
  graphBranch1,
  graphSubPatch1,
  graphSubPatchIntoSubpatch,
} from "./graphs";

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

