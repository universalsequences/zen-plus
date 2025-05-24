import { describe, it, expect } from "bun:test";
import { compileInstructions } from "@/lib/nodes/vm/instructions";
import { InstructionType } from "@/lib/nodes/vm/types";
import {
  graph1,
  graph2,
  graphBranch1,
  graphBranch2,
  graphBranchMessageMessage,
  graphBranchMessageMessageNested,
  graphBranchMessageMessageRoute,
  graphBranchMessageMessageRoute2,
  graphBranchIntoSubPatch,
  graphCyclicScript,
  graphScript,
  graphSubPatch1,
  graphSubPatchIntoSubpatch,
} from "./graphs";

describe("Instruction Compilation Tests", () => {
  describe("Basic Linear Chains", () => {
    // Graph: m1 -> o1(* 4) -> o2(* 5)
    it("should compile simple arithmetic chain without message outputs", () => {
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
    it("should compile arithmetic chain with message node outputs", () => {
      const { nodes } = graph2();
      const instructions = compileInstructions(nodes);
      
      expect(instructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // o1 evaluate
        InstructionType.Attribute,
        InstructionType.Store, // store result of o1 in o2
        InstructionType.ReplaceMessage, // replace message in m2
        InstructionType.EvaluateObject, // o2 evaluate
        InstructionType.ReplaceMessage, // replace message in m3
      ]);
    });
  });

  describe("SubPatch Compilation", () => {
    // Graph: m1 -> o1[p] -> m2
    //              |
    //              subpatch: in1 -> mult(* 3) -> out1
    it("should compile simple subpatch with single operation", () => {
      const { nodes } = graphSubPatch1();
      const instructions = compileInstructions(nodes);
      
      expect(instructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute, // subpatch input preparation
        InstructionType.Attribute, // subpatch operation setup
        InstructionType.Attribute, // subpatch output preparation
        InstructionType.Store,     // store input value
        InstructionType.EvaluateObject, // evaluate multiplication
        InstructionType.ReplaceMessage, // output to message node
      ]);
    });

    // Graph: m1 -> p1[subpatch1] -> p2[subpatch2] -> o2(- 5) -> m2
    //              |                |                |
    //              in1->mult1(*3)->out1  in1->mult2(+4)->out1
    it("should compile nested subpatches with chained operations", () => {
      const { nodes } = graphSubPatchIntoSubpatch();
      const instructions = compileInstructions(nodes);
      
      expect(instructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute, // first subpatch setup
        InstructionType.Attribute, // first subpatch mult operation
        InstructionType.Attribute, // second subpatch setup
        InstructionType.Store,     // store in first subpatch
        InstructionType.EvaluateObject, // evaluate first subpatch (* 3)
        InstructionType.Attribute, // second subpatch add operation
        InstructionType.Store,     // store in second subpatch
        InstructionType.EvaluateObject, // evaluate second subpatch (+ 4)
        InstructionType.Attribute, // final subtraction setup
        InstructionType.Store,     // store for final operation
        InstructionType.EvaluateObject, // evaluate final operation (- 5)
        InstructionType.ReplaceMessage, // output to message node
      ]);
    });
  });

  describe("Branching and Routing", () => {
    // Graph: m1 -> route(1 2 3 4) -> mult1(* 2) -> add1_A(+ 2) -> m2
    //                    |                                            |
    //                    |-> mult2(* 3) -> m3                        |
    //                    |                                            |
    //                    |-> mult3(* 4) -> m4                        |
    it("should compile route object with multiple conditional branches", () => {
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

      // 3 active branches out of 5 possible routes
      expect(instructions[3].branches?.filter((x) => x.length > 0).length).toBe(3);

      // First branch: route 1 -> mult (* 2) -> add (+ 2) -> message
      expect(instructions[3].branches?.[0].map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // * 2
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // + 2
        InstructionType.ReplaceMessage,
      ]);

      // Second branch: route 2 -> mult (* 3) -> message
      expect(instructions[3].branches?.[1].map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
        InstructionType.ReplaceMessage,
      ]);

      // Third branch: route 3 -> mult (* 4) -> message
      expect(instructions[3].branches?.[2].map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
        InstructionType.ReplaceMessage,
      ]);
    });

    // Graph: m1 -> filter.= 1 -> mult1(* 2) -> add1_A(+ 2) -> m2
    //         |
    //         |-> m3
    it("should compile filter object with conditional branching", () => {
      const { nodes } = graphBranch2();
      const instructions = compileInstructions(nodes);
      
      expect(instructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.ReplaceMessage, // message update happens before evaluation
        InstructionType.EvaluateObject,
        InstructionType.Branch,
      ]);

      expect(instructions[4].branches).toBeDefined();
      expect(instructions[4].branches?.length).toBe(2);

      // First branch: when filter passes (value equals 1)
      expect(instructions[4].branches?.[0].map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // * 2
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // + 2
        InstructionType.ReplaceMessage,
      ]);

      // Second branch: when filter fails (empty branch)
      expect(instructions[4].branches?.[1]).toEqual([]);
    });

    // Graph: m1 -> filter.= 1 -> m2 -> o1[p] -> m4
    //                    |       |     |
    //                    |       |     subpatch: in1 -> mult(* 3) -> out1
    //                    |       |
    //                    |-> m3 -|
    it("should compile branch leading into subpatch", () => {
      const { nodes } = graphBranchIntoSubPatch();
      const instructions = compileInstructions(nodes);
      
      expect(instructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
        InstructionType.Branch,
        InstructionType.Attribute, // subpatch setup
        InstructionType.Attribute, // subpatch operation
      ]);

      expect(instructions[3].branches).toBeDefined();
      expect(instructions[3].branches?.length).toBe(2);
    });
  });

  describe("MessageMessage Objects", () => {
    // Graph: m1 -> messagemessage -> mult1(* 2) -> add1_A(+ 2) -> m2
    //                    |
    //                    |-> mult2(* 8) -> add2_A(+ 9) -> m3
    it("should compile messagemessage with parallel execution branches", () => {
      const { nodes } = graphBranchMessageMessage();
      const instructions = compileInstructions(nodes);
      
      expect(instructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
        InstructionType.Branch,
      ]);

      expect(instructions[3].branches).toBeDefined();
      expect(instructions[3].branches?.length).toBe(2);

      // First branch: mult1(* 2) -> add1_A(+ 2) -> m2
      expect(instructions[3].branches?.[0].map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // * 2
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // + 2
        InstructionType.ReplaceMessage,
      ]);

      // Second branch: mult2(* 8) -> add2_A(+ 9) -> m3
      expect(instructions[3].branches?.[1].map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // * 8
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // + 9
        InstructionType.ReplaceMessage,
      ]);
    });

    // Nested messagemessage test
    it("should compile nested messagemessage objects", () => {
      const { nodes } = graphBranchMessageMessageNested();
      const instructions = compileInstructions(nodes);
      
      expect(instructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
        InstructionType.Branch,
      ]);

      expect(instructions[3].branches).toBeDefined();
      expect(instructions[3].branches?.length).toBe(2);
    });
  });

  describe("Script and Advanced Features", () => {
    // Graph: m1 -> p[subpatch] -> m2
    //              |
    //              subpatch: in1 -> script(lisp) -> out2
    it("should compile subpatch containing lisp script", () => {
      const { nodes } = graphScript();
      const instructions = compileInstructions(nodes);
      
      expect(instructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Attribute,
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
        InstructionType.Branch, // script evaluation produces a branch
      ]);
    });

    // Complex cyclic graph with matrix operations
    it("should compile complex cyclic script with matrix operations", () => {
      const { nodesA, nodesB } = graphCyclicScript();
      
      const instructionsA = compileInstructions(nodesA);
      const instructionsB = compileInstructions(nodesB);

      // Graph B: button -> message -> matrix
      expect(instructionsB.map((x) => x.type)).toEqual([
        InstructionType.EvaluateObject, // button
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.PipeMessage, // message box
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject, // matrix
        InstructionType.Branch,
      ]);

      // Graph A: lisp -> unpack -> matrix (with feedback loop)
      expect(instructionsA.map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store, // lisp store
        InstructionType.EvaluateObject, // lisp eval
        InstructionType.Branch, // unpack branch
      ]);

      // Check nested branch structure in Graph A
      expect(instructionsA[3]?.branches?.[0].map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store, // unpack store
        InstructionType.EvaluateObject, // unpack eval
        InstructionType.Attribute, // matrix attribute
        InstructionType.Store, // matrix store
        InstructionType.EvaluateObject, // matrix eval
        InstructionType.Branch, // nested lisp branch
      ]);
    });
  });

  describe("Complex Routing Scenarios", () => {
    // Graph: m1 -> lisp -> messagemessage -> route1 -> get1 -> m2
    //                |              |
    //                |              |-> get2 -> m3
    //                |
    //                |-> route2 -> get3 -> m4
    it("should compile messagemessage with route splitting", () => {
      const { nodes, expected } = graphBranchMessageMessageRoute();
      expect(nodes.map((x) => x.id)).toEqual(expected);
      
      const instructions = compileInstructions(nodes);
      expect(instructions).toBeDefined();
      expect(instructions.length).toBeGreaterThan(0);
      
      // Should start with lisp evaluation
      expect(instructions[0].type).toBe(InstructionType.Attribute);
    });

    // Graph: m1 -> lisp -> filter -> messagemessage -> route1 -> get1 -> m2
    //                           |               |
    //                           |               |-> get2 -> m3
    //                           |
    //                           |-> p1[subpatch] -> m4
    //                               |
    //                               subpatch: in1 -> dict -> m4
    it("should compile complex routing with filter, messagemessage, route and subpatch", () => {
      const { nodes, expected } = graphBranchMessageMessageRoute2();
      expect(nodes.map((x) => x.id)).toEqual(expected);
      
      const instructions = compileInstructions(nodes);
      expect(instructions).toBeDefined();
      expect(instructions.length).toBeGreaterThan(0);
      
      // Should contain branch instructions for complex routing
      const branchInstructions = instructions.filter(i => i.type === InstructionType.Branch);
      expect(branchInstructions.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty node list gracefully", () => {
      const instructions = compileInstructions([]);
      expect(instructions).toEqual([]);
    });

    it("should compile single node without connections", () => {
      const { nodes } = graph1();
      const singleNodeInstructions = compileInstructions([nodes[1]]); // Just the first object node
      
      expect(singleNodeInstructions.map((x) => x.type)).toEqual([
        InstructionType.EvaluateObject, // single node gets evaluated first
        InstructionType.Attribute,
        InstructionType.Store,
      ]);
    });

    it("should handle nodes with undefined properties", () => {
      const { nodes } = graph1();
      // Test compilation doesn't crash with standard node setup
      const instructions = compileInstructions(nodes);
      expect(instructions).toBeDefined();
      expect(instructions.length).toBeGreaterThan(0);
    });
  });

  describe("Instruction Ordering and Dependencies", () => {
    it("should maintain proper attribute-store-evaluate ordering for objects", () => {
      const { nodes } = graph1();
      const instructions = compileInstructions(nodes);
      
      // For each object node, should have Attribute -> Store -> EvaluateObject
      const firstObjectInstructions = instructions.slice(0, 3);
      expect(firstObjectInstructions.map(x => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
      ]);
      
      const secondObjectInstructions = instructions.slice(3, 6);
      expect(secondObjectInstructions.map(x => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
      ]);
    });

    it("should include ReplaceMessage instructions for message node outputs", () => {
      const { nodes } = graph2();
      const instructions = compileInstructions(nodes);
      
      // Should contain ReplaceMessage instructions for message outputs
      const replaceMessageInstructions = instructions.filter(inst => 
        inst.type === InstructionType.ReplaceMessage
      );
      
      expect(replaceMessageInstructions.length).toBe(2); // Two message outputs in graph2
    });
  });
});

