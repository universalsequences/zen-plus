import ObjectNodeImpl from "../ObjectNode";
import { OperatorContextType, isCompiledType } from "../context";
import { isForwardCycle } from "../traverse";
import type { Message, ObjectNode, Patch, Node } from "../types";
import { evaluate } from "../vm/evaluate";
import { topologicalSearchFromNode } from "../vm/forwardpass";
import { compileInstructions } from "../vm/instructions";
import { getOutboundConnections } from "../vm/traversal";
import { Instruction, InstructionType } from "../vm/types";

const isSourceNode = (x: Node) => {
  if (x instanceof ObjectNodeImpl) {
    const objectNode = x as ObjectNode;
    if (x.name === "in") {
      return false;
    }
    return (
      objectNode.inlets.length === 0 ||
      objectNode.name === "param" ||
      objectNode.name === "argument" ||
      objectNode.name === "invocation" ||
      (objectNode.name === "history" && isForwardCycle(objectNode)) ||
      objectNode.name === "uniform" ||
      objectNode.name === "data" ||
      (isCompiledType(objectNode.operatorContextType) && objectNode.needsLoad) ||
      objectNode.operatorContextType === OperatorContextType.NUMBER
    );
  }
  return false;
};

const compileNode = (sourceNode: ObjectNode, patch: Patch) => {
  const nodes = topologicalSearchFromNode(sourceNode, true, patch);
  const instructions = compileInstructions(nodes, patch);
  const value =
    instructions[0]?.type === InstructionType.EvaluateObject && instructions[0]?.node === sourceNode
      ? "bang"
      : sourceNode.fn?.("bang")[0];
  if (sourceNode.inlets[0]) {
    sourceNode.inlets[0].lastMessage = "bang";
  }
  if (value !== undefined) {
    const { skippedInstructions } = evaluate(instructions, value, true);
    if (skippedInstructions) {
      return skippedInstructions;
    }
  }
  return undefined;
};

export const recompileGraphTopological = (patch: Patch) => {
  console.log(
    "******************************** BEGIN RECOMPILE ZEN **************************************",
  );
  let a = new Date().getTime();
  const allNodes = patch.getAllNodes();
  const skipIds = new Set<string>();

  // turn "off" skipCompilation on any nodes of compiled type
  // note: skipCompilation is used for compiling objects of type=Core, it sets
  // the compilation boundaries
  for (const node of allNodes) {
    if (
      node.operatorContextType === OperatorContextType.NUMBER ||
      (node.skipCompilation && isCompiledType((node as ObjectNode).operatorContextType))
    ) {
      skipIds.add(node.id);
      node.skipCompilation = false;
    }
  }
  const rawSourceNodes = allNodes.filter((x) => isSourceNode(x));

  const sourceNodes = [
    ...rawSourceNodes.filter(
      (x) => (x as ObjectNode).operatorContextType === OperatorContextType.NUMBER,
    ),
    ...rawSourceNodes
      .filter(
        (x) =>
          (x as ObjectNode).name !== "history" &&
          (x as ObjectNode).operatorContextType !== OperatorContextType.NUMBER,
      )
      .reverse(),
    ...rawSourceNodes.filter((x) => (x as ObjectNode).name === "history"),
  ];

  // paste any number notes into their destinations
  for (const sourceNode of sourceNodes) {
    const node = sourceNode as ObjectNode;
    if (node.operatorContextType === OperatorContextType.NUMBER) {
      const outbounds = getOutboundConnections(node, new Set(), patch);
      for (const outbound of outbounds) {
        const index = outbound.destination.inlets.indexOf(outbound.destinationInlet);
        if (index > 0) {
          const num = node.fn?.("bang")[0] as number;
          (outbound.destination as ObjectNode).arguments[index - 1] = num;
          outbound.destinationInlet.lastMessage = num;
        }
      }
    }
  }

  let skippedInstructions: {
    value: Message;
    instructions: Instruction[];
  }[] = [];

  for (let sourceNode of sourceNodes) {
    const skipped = compileNode(sourceNode, patch);
    if (skipped) {
      for (const skip of skipped) {
        if (!skippedInstructions.some((x) => x.instructions[0] !== skip.instructions[0])) {
          skippedInstructions.push(skip);
        }
      }
    }
  }

  console.log("skipped instructions=", skippedInstructions);
  for (const { value, instructions } of skippedInstructions) {
    const node = instructions[0].node as ObjectNode;
    const nodes = topologicalSearchFromNode(node, true, patch);
    const instructs = compileInstructions(nodes, patch);
    evaluate(instructs, value, true);
  }

  const callNodes = allNodes.filter((x) => x.name?.includes("call"));
  for (const node of callNodes) {
    const value = node.inlets[0]?.lastMessage;
    if (value) {
      const nodes = topologicalSearchFromNode(node, true, patch);
      const instructions = compileInstructions(nodes, patch);
      const { skippedInstructions } = evaluate(instructions, value);

      if (skippedInstructions.length > 0) {
        console.log("were skipping but dont mean it", skippedInstructions, node);
      }
    }
  }

  const bangs = allNodes.filter((x) => x.name === "matrix");
  for (const bang of bangs) {
    console.log("sending bang to matrix", bang);
    bang.receive(bang.inlets[0], "bang");
  }

  // turn skipCompilation back "on"
  for (const node of allNodes) {
    if (skipIds.has(node.id)) {
      node.skipCompilation = true;
    }
  }

  let b = new Date().getTime();
  console.log(
    "******************************** END RECOMPILE ZEN (took %s ms)**************************************",
    b - a,
  );
};
