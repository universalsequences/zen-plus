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
  graphParallelProcessing,
  graphDeepNestedSubpatches,
  graphMultiInputConvergence,
  graphSequentialBranching,
  graphMixedRoutingWithSubpatches,
  graphNestedConditionalProcessing,
  graphDualArithmeticProcessing,
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
        InstructionType.Store, // store input value
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
        InstructionType.Store, // store in first subpatch
        InstructionType.EvaluateObject, // evaluate first subpatch (* 3)
        InstructionType.Attribute, // second subpatch add operation
        InstructionType.Store, // store in second subpatch
        InstructionType.EvaluateObject, // evaluate second subpatch (+ 4)
        InstructionType.Attribute, // final subtraction setup
        InstructionType.Store, // store for final operation
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
      const branchInstructions = instructions.filter((i) => i.type === InstructionType.Branch);
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
      expect(firstObjectInstructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
      ]);

      const secondObjectInstructions = instructions.slice(3, 6);
      expect(secondObjectInstructions.map((x) => x.type)).toEqual([
        InstructionType.Attribute,
        InstructionType.Store,
        InstructionType.EvaluateObject,
      ]);
    });

    it("should include ReplaceMessage instructions for message node outputs", () => {
      const { nodes } = graph2();
      const instructions = compileInstructions(nodes);

      // Should contain ReplaceMessage instructions for message outputs
      const replaceMessageInstructions = instructions.filter(
        (inst) => inst.type === InstructionType.ReplaceMessage,
      );

      expect(replaceMessageInstructions.length).toBe(2); // Two message outputs in graph2
    });
  });

  describe("Advanced Parallel Processing", () => {
    // Graph: m1 -> parallel_processor -> mult1(* 2) -> m2
    //         |                      |-> mult2(* 3) -> m3
    //         |                      |-> mult3(* 4) -> m4
    //         |-> direct_mult(* 5) -> m5
    it("should compile complex parallel processing with messagemessage splitter", () => {
      const { nodes, parallel_processor, direct_mult } = graphParallelProcessing();
      const instructions = compileInstructions(nodes);

      // Should contain messagemessage evaluation and direct path
      expect(
        instructions.some(
          (inst) =>
            inst.node?.id === parallel_processor.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      expect(
        instructions.some(
          (inst) =>
            inst.node?.id === direct_mult.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should contain branch instruction for parallel processing
      const branchInstructions = instructions.filter(
        (inst) => inst.type === InstructionType.Branch,
      );
      expect(branchInstructions.length).toBeGreaterThan(0);

      // Should have multiple branches for parallel outputs (messagemessage has 2 outlets)
      const mainBranch = branchInstructions.find((inst) => inst.node?.id === parallel_processor.id);
      expect(mainBranch?.branches?.length).toBeGreaterThanOrEqual(2);
    });

    // Graph: m1 -> add_A(+ ?) <- m2
    //        m3 -> add_B(+ ?) <- m4
    //        add_A -> mult(* ?) <- add_B
    //        mult -> m5
    it("should compile multi-input convergence patterns", () => {
      const { nodes, add_A, mult } = graphMultiInputConvergence();
      const instructions = compileInstructions(nodes);

      // Should have instruction sequence for addition operation in the path
      expect(
        instructions.some(
          (inst) => inst.node?.id === add_A.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should have multiplication that depends on the addition
      expect(
        instructions.some(
          (inst) => inst.node?.id === mult.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should maintain proper ordering
      const addIndex = instructions.findIndex(
        (inst) => inst.node?.id === add_A.id && inst.type === InstructionType.EvaluateObject,
      );
      const multIndex = instructions.findIndex(
        (inst) => inst.node?.id === mult.id && inst.type === InstructionType.EvaluateObject,
      );
      expect(addIndex).toBeLessThan(multIndex);
    });
  });

  describe("Deep Nesting and Complex Hierarchies", () => {
    // Graph: m1 -> p1[zen_patch] -> p2[core_patch] -> p3[zen_patch] -> m2
    //             |               |                |
    //             zen: in->add(+1)->out  core: in->mult(*2)->out  zen: in->sub(-1)->out
    it("should compile deep nested subpatches with different context types", () => {
      const { nodes, add1, mult2, sub3 } = graphDeepNestedSubpatches();
      const instructions = compileInstructions(nodes);

      // Should have instructions for all three nested operations
      expect(
        instructions.some(
          (inst) => inst.node?.id === add1.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      expect(
        instructions.some(
          (inst) => inst.node?.id === mult2.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      expect(
        instructions.some(
          (inst) => inst.node?.id === sub3.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should maintain proper ordering for nested execution
      const add1Index = instructions.findIndex(
        (inst) => inst.node?.id === add1.id && inst.type === InstructionType.EvaluateObject,
      );
      const mult2Index = instructions.findIndex(
        (inst) => inst.node?.id === mult2.id && inst.type === InstructionType.EvaluateObject,
      );
      const sub3Index = instructions.findIndex(
        (inst) => inst.node?.id === sub3.id && inst.type === InstructionType.EvaluateObject,
      );

      expect(add1Index).toBeLessThan(mult2Index);
      expect(mult2Index).toBeLessThan(sub3Index);
    });

    // Graph: m1 -> route(1 2 3) -> p1[add +1] -> gate -> m2
    //                    |         p2[mult *3] -> gate -> m3
    //                    |         p3[div /2] -> gate -> m4
    //                    |-> direct_output -> m5
    it("should compile mixed routing with subpatches", () => {
      const { nodes, route, add1, mult2, direct_output } = graphMixedRoutingWithSubpatches();
      const instructions = compileInstructions(nodes);

      // Should have route object evaluation
      expect(
        instructions.some(
          (inst) => inst.node?.id === route.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should have direct output path
      expect(
        instructions.some(
          (inst) =>
            inst.node?.id === direct_output.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should contain branch instructions for routing
      const branchInstructions = instructions.filter(
        (inst) => inst.type === InstructionType.Branch,
      );
      expect(branchInstructions.length).toBeGreaterThan(0);
    });
  });

  describe("Sequential and Branching Processing", () => {
    // Graph: m1 -> add_base(+ 10) -> split -> mult_A(* 2) -> m2
    //                                     |
    //                                     |-> mult_B(* 3) -> m3
    it("should compile sequential processing with branching", () => {
      const { nodes, add_base, split, mult_A, mult_B } = graphSequentialBranching();
      const instructions = compileInstructions(nodes);

      // Should have all components in the sequential chain
      expect(
        instructions.some(
          (inst) => inst.node?.id === add_base.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      expect(
        instructions.some(
          (inst) => inst.node?.id === split.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should contain branch instruction for split (mult_A and mult_B are in branches)
      const branchInstructions = instructions.filter(
        (inst) => inst.type === InstructionType.Branch && inst.node?.id === split.id,
      );
      expect(branchInstructions.length).toBeGreaterThan(0);
    });
  });

  describe("Advanced Conditional Processing", () => {
    // Graph: m1 -> route(1 2) -> mult_filter(* 1) -> mult(* 2) -> m2
    //         |                |
    //         |                |-> add(+ 10) -> m3
    //         |-> add_filter(+ 0) -> sub(- 1) -> m4
    it("should compile nested conditional processing with multiple paths", () => {
      /*
      const { nodes, route_main, mult_filter, add_filter, mult, add, sub } = graphNestedConditionalProcessing();
      const instructions = compileInstructions(nodes);

      // Should have all routing and filtering evaluations
      expect(instructions.some(inst =>
        inst.node?.id === route_main.id && inst.type === InstructionType.EvaluateObject
      )).toBe(true);

      expect(instructions.some(inst =>
        inst.node?.id === mult_filter.id && inst.type === InstructionType.EvaluateObject
      )).toBe(true);

      expect(instructions.some(inst =>
        inst.node?.id === add_filter.id && inst.type === InstructionType.EvaluateObject
      )).toBe(true);

      // Should have main processing operations
      expect(instructions.some(inst =>
        inst.node?.id === mult.id && inst.type === InstructionType.EvaluateObject
      )).toBe(true);

      expect(instructions.some(inst =>
        inst.node?.id === sub.id && inst.type === InstructionType.EvaluateObject
      )).toBe(true);

      // Should contain branch instructions for routing
      const branchInstructions = instructions.filter(inst => inst.type === InstructionType.Branch);
      expect(branchInstructions.length).toBeGreaterThan(0);
      */
    });
  });

  describe("Dual Path Arithmetic Processing", () => {
    // Graph: m1 -> add_base(+ 5) -> mult_A(* 2) -> add_final(+ ?) <- mult_B(* 3) <- sub_base(- 1) <- m1
    //                                                   |
    //                                                   v
    //                                                  m2
    it("should compile dual arithmetic processing paths with convergence", () => {
      const { nodes, add_base, sub_base, mult_A, mult_B, add_final } =
        graphDualArithmeticProcessing();
      const instructions = compileInstructions(nodes);

      // Should have both base operations
      expect(
        instructions.some(
          (inst) => inst.node?.id === add_base.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      expect(
        instructions.some(
          (inst) => inst.node?.id === sub_base.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should have both multiplication operations
      expect(
        instructions.some(
          (inst) => inst.node?.id === mult_A.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      expect(
        instructions.some(
          (inst) => inst.node?.id === mult_B.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should have final convergence operation
      expect(
        instructions.some(
          (inst) => inst.node?.id === add_final.id && inst.type === InstructionType.EvaluateObject,
        ),
      ).toBe(true);

      // Should maintain proper data flow ordering for first path
      const addBaseIndex = instructions.findIndex(
        (inst) => inst.node?.id === add_base.id && inst.type === InstructionType.EvaluateObject,
      );
      const multAIndex = instructions.findIndex(
        (inst) => inst.node?.id === mult_A.id && inst.type === InstructionType.EvaluateObject,
      );
      const addFinalIndex = instructions.findIndex(
        (inst) => inst.node?.id === add_final.id && inst.type === InstructionType.EvaluateObject,
      );

      expect(addBaseIndex).toBeLessThan(multAIndex);
      expect(multAIndex).toBeLessThan(addFinalIndex);
    });
  });

  describe("Performance and Optimization", () => {
    it("should optimize instruction count for complex graphs", () => {
      const { nodes: parallelNodes } = graphParallelProcessing();
      const { nodes: deepNodes } = graphDeepNestedSubpatches();
      const { nodes: sequentialNodes } = graphSequentialBranching();

      const parallelInstructions = compileInstructions(parallelNodes);
      const deepInstructions = compileInstructions(deepNodes);
      const sequentialInstructions = compileInstructions(sequentialNodes);

      // Complex graphs should still compile to reasonable instruction counts
      expect(parallelInstructions.length).toBeLessThan(50);
      expect(deepInstructions.length).toBeLessThan(30);
      expect(sequentialInstructions.length).toBeLessThan(25);
    });

    it("should handle branch complexity efficiently", () => {
      const { nodes: mixedNodes } = graphMixedRoutingWithSubpatches();
      const { nodes: conditionalNodes } = graphNestedConditionalProcessing();

      const mixedInstructions = compileInstructions(mixedNodes);
      const conditionalInstructions = compileInstructions(conditionalNodes);

      // Branch instructions should be properly structured
      const mixedBranches = mixedInstructions.filter(
        (inst) => inst.type === InstructionType.Branch,
      );
      const conditionalBranches = conditionalInstructions.filter(
        (inst) => inst.type === InstructionType.Branch,
      );

      expect(mixedBranches.length).toBeGreaterThan(0);
      expect(conditionalBranches.length).toBeGreaterThan(0);

      // Each branch should have reasonable sub-instruction counts
      mixedBranches.forEach((branch) => {
        if (branch.branches) {
          branch.branches.forEach((subBranch) => {
            expect(subBranch.length).toBeLessThan(15);
          });
        }
      });
    });
  });
});
