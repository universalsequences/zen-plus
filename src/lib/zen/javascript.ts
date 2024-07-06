import { determineBlocks } from "./blocks/analyze";
import { printBlocks, printUserFunction } from "./blocks/printBlock";
import { Target } from "./targets";
import type { ZenGraph } from "./zen";

interface JSProcessResponse {
  process: string;
  functions: string;
}
export const generateJSProcess = (graph: ZenGraph) => {
  const blocks = determineBlocks(...graph.codeFragments);
  const blocksCode = printBlocks(blocks, Target.Javascript);

  const functionsCode = graph.functions
    .map((x) => printUserFunction(x, Target.Javascript))
    .join("\n");

  return {
    process: blocksCode,
    functions: functionsCode,
  };
};
