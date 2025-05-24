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

describe("evaluateInstructions", () => {
  describe("Basic Operations", () => {
    // Graph: m1 -> o1(* 4) -> o2(* 5)
    it("should evaluate simple arithmetic chain", () => {
      const { nodes } = graph1();
      const instructions = compileInstructions(nodes);
      const result = evaluate(instructions, 5);
      
      // Check that the evaluation completed without errors
      expect(result.objectsEvaluated).toBeDefined();
      expect(result.objectsEvaluated.length).toBe(2); // two object nodes evaluated
    });

    // Graph: m1 -> o1(* 4) -> o2(* 5)
    //             |         |
    //             v         v
    //            m2        m3
    it("should evaluate simple with message nodes", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, 5);
      expect(m2.message).toBe(20);
      expect(m3.message).toBe(100);
    });

    it("should handle zero input", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, 0);
      expect(m2.message).toBe(0);
      expect(m3.message).toBe(0);
    });

    it("should handle negative input", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, -3);
      expect(m2.message).toBe(-12);
      expect(m3.message).toBe(-60);
    });

    it("should handle fractional input", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, 0.5);
      expect(m2.message).toBe(2);
      expect(m3.message).toBe(10);
    });
  });

  describe("SubPatch Evaluation", () => {
    // Graph: m1 -> o1[p] -> m2
    //              |
    //              subpatch: in1 -> mult(* 3) -> out1
    it("should evaluate with subpatch", () => {
      const { nodes, m2 } = graphSubPatch1();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, 5);
      expect(m2.message).toBe(15);
    });

    // Graph: m1 -> p1[subpatch1] -> p2[subpatch2] -> o2(- 5) -> m2
    //              |                |                |
    //              in1->mult1(*3)->out1  in1->mult2(+4)->out1
    it("should evaluate with subpatch into subpatch", () => {
      const { nodes, m2 } = graphSubPatchIntoSubpatch();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, 5);
      expect(m2.message).toBe(14);
    });

    it("should handle nested subpatches with different operations", () => {
      const { nodes, m2 } = graphSubPatchIntoSubpatch();
      const instructions = compileInstructions(nodes);
      
      // Test with different inputs
      evaluate(instructions, 10);
      expect(m2.message).toBe(29); // ((10 * 3) + 4) - 5 = 29
      
      evaluate(instructions, 0);
      expect(m2.message).toBe(-1); // ((0 * 3) + 4) - 5 = -1
      
      evaluate(instructions, -2);
      expect(m2.message).toBe(-7); // ((-2 * 3) + 4) - 5 = -7 (fixed calculation)
    });
  });

  describe("Branching and Routing", () => {
    // Graph: m1 -> route(1 2 3 4) -> mult1(* 2) -> add1_A(+ 2) -> m2
    //                    |                                            |
    //                    |-> mult2(* 3) -> m3                        |
    //                    |                                            |
    //                    |-> mult3(* 4) -> m4                        |
    it("should evaluate with route branch", () => {
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
    it("should evaluate with branch filter", () => {
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
    it("should execute messagemessage branches sequentially", () => {
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
    it("should execute nested messagemessage branches sequentially", () => {
      const { nodes, expectedObjectsEvaluated } = graphBranchMessageMessageNested();
      const instructions = compileInstructions(nodes);
      const { objectsEvaluated } = evaluate(instructions, 5);
      expect(objectsEvaluated?.map((x) => x.id)).toEqual(expectedObjectsEvaluated.map((x) => x.id));
    });

    // Graph: m1 -> filter.= 1 -> m2 -> o1[p] -> m4
    //                    |       |     |
    //                    |       |     subpatch: in1 -> mult(* 3) -> out1
    //                    |       |
    //                    |-> m3 -|
    it("should handle branch into subpatch", () => {
      const { nodes, m4 } = graphBranchIntoSubPatch();
      const instructions = compileInstructions(nodes);

      evaluate(instructions, 1);
      expect(m4.message).toBe(3);
    });
  });

  describe("Script and Lisp Evaluation", () => {
    // Graph: m1 -> p[subpatch] -> m2
    //              |
    //              subpatch: in1 -> script(lisp) -> out2
    it("should evaluate script in patch", () => {
      const { nodes, m2 } = graphScript();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, 5);
      expect(m2.message).toEqual([5, 5, 5, 5]);
    });

    // Graph A: m1 -> lisp -> unpack -> matrix
    //                           ^         |
    //                           |_________|
    // Graph B: button -> m2 -> matrix
    it("should handle script matrix operations", () => {
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
  });

  describe("Complex Routing Tests", () => {
    // Graph: m1 -> lisp -> messagemessage -> route1 -> get1 -> m2
    //                |              |
    //                |              |-> get2 -> m3
    //                |
    //                |-> route2 -> get3 -> m4
    it("should handle messagemessage with route", () => {
      const { nodes, expected } = graphBranchMessageMessageRoute();
      expect(nodes.map((x) => x.id)).toEqual(expected);
      const instructions = compileInstructions(nodes);
      // Test compilation without errors
      expect(instructions).toBeDefined();
    });

    // Graph: m1 -> lisp -> filter -> messagemessage -> route1 -> get1 -> m2
    //                           |               |
    //                           |               |-> get2 -> m3
    //                           |
    //                           |-> p1[subpatch] -> m4
    //                               |
    //                               subpatch: in1 -> dict -> m4
    it("should handle complex messagemessage with route and subpatch", () => {
      const { nodes, expected, expectedObjectsEvaluated } = graphBranchMessageMessageRoute2();
      expect(nodes.map((x) => x.id)).toEqual(expected);
      const instructions = compileInstructions(nodes);
      const { objectsEvaluated } = evaluate(instructions, 5);
      expect(objectsEvaluated.map((x) => x.id)).toEqual(expectedObjectsEvaluated);
    });
  });

  describe("Branch Popper Tests", () => {
    // Graph: in_button -> matrix -> list_nth -> out_message
    //                        |          ^
    //                        v          |
    //        filter -> button -> counter -> select_message
    //                                |
    //                                v
    //                            list_nth
    it("should handle branch pop basic", () => {
      const { patch, in_button, filter, out_message } = branchPopperGraph();
      compileVM(patch, false);

      const in_button_instructions = in_button.instructions;
      expect(in_button.instructions).toBeDefined();
      expect(in_button.instructions?.length).toBe(5);

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
    it("should handle inverse connection order", () => {
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
    it("should handle inverse with multiplication", () => {
      const { patch, filter, in_button, out_message } = branchPopperGraphSwapMult();
      compileVM(patch, false);

      expect(in_button.instructions).toBeDefined();
      expect(in_button.instructions?.length).toBe(5);

      const nodes = topologicalSearchFromNode(filter);

      evaluate(in_button.instructions as Instruction[], "bang");
      const { instructionsEvaluated } = evaluate(filter.instructions as Instruction[], {
        stepNumber: 0,
      });

      expect(out_message.message).toBe(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty instruction list", () => {
      const result = evaluate([], 5);
      expect(result.objectsEvaluated).toEqual([]);
      expect(result.instructionsEvaluated).toEqual([]);
    });

    it("should handle undefined input", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, undefined);
      // Should not throw, behavior depends on node implementations
    });

    it("should handle null input", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, null);
      // Should not throw, behavior depends on node implementations
    });

    it("should handle string input in numeric operations", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, "hello");
      // Should not throw, behavior depends on node implementations
    });

    it("should handle large numbers", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, 1000000);
      expect(m2.message).toBe(4000000);
      expect(m3.message).toBe(20000000);
    });

    it("should handle very small numbers", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      evaluate(instructions, 0.000001);
      expect(m2.message).toBeCloseTo(0.000004, 6);
      expect(m3.message).toBeCloseTo(0.00002, 6);
    });
  });

  describe("Multiple Evaluations", () => {
    it("should maintain state between evaluations", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      
      // First evaluation
      evaluate(instructions, 5);
      expect(m2.message).toBe(20);
      expect(m3.message).toBe(100);
      
      // Second evaluation should update the same message nodes
      evaluate(instructions, 10);
      expect(m2.message).toBe(40);
      expect(m3.message).toBe(200);
    });

    it("should handle rapid consecutive evaluations", () => {
      const { nodes, m2, m3 } = graph2();
      const instructions = compileInstructions(nodes);
      
      for (let i = 1; i <= 10; i++) {
        evaluate(instructions, i);
        expect(m2.message).toBe(i * 4);
        expect(m3.message).toBe(i * 20);
      }
    });
  });

  describe("Performance Tests", () => {
    it("should handle deep nesting efficiently", () => {
      const { nodes, m2 } = graphSubPatchIntoSubpatch();
      const instructions = compileInstructions(nodes);
      
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        evaluate(instructions, i);
      }
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });

    it("should handle complex branching efficiently", () => {
      const { nodes, m2, m3, m4 } = graphBranch1();
      const instructions = compileInstructions(nodes);
      
      const start = performance.now();
      for (let i = 1; i <= 1000; i++) {
        evaluate(instructions, (i % 3) + 1);
      }
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});