import { PatchImpl } from "../Patch";
import { CompoundOperator, Operator, Statement } from "../definitions/zen/types";
import { ObjectNode, SubPatch } from "../types";

/**
 * Converts a regular AST into a mc-ast by constructing a defun + multi "call" statements
 * */
export const constructMCStatement = (
  patch: PatchImpl,
  outStatements: Statement[],
  chans: number,
) => {
  console.log("construct mc statement begin");
  const numberOfOutputs = outStatements.length;
  const parentNode = (patch as unknown as SubPatch).parentNode;
  const numberOfInputs = parentNode.inlets.length;

  // TODO - we need to figure out history statements for this to work (exactly like we do in defun )
  // actually this is more like how we do it in zen compile, maybe we could just pass it into this function
  // to attach
  //

  const historyDependencies = patch.historyDependencies;

  const bodies: Statement[] = [];
  for (const statement of outStatements) {
    if (!Array.isArray(statement) || statement.length < 2) {
      continue;
    }
    const op = statement[0] as CompoundOperator;
    if (op.name === "output") {
      const outputNumber = op.outputNumber as number;
      const body = statement[1] as Statement;
      bodies[outputNumber] = body;

      if (historyDependencies.length > 0 && outputNumber === 0) {
        bodies[0] = ["s" as Operator, ...historyDependencies, body];
      }
    }
  }

  const name = "mc";
  // value - chans means is the number of invocations (so we can allocate the correct amount of memory)
  const defun = [{ name: "defun", value: chans, variableName: name + patch.id }, ...bodies];
  (defun as Statement).node = parentNode;

  const mcOutStatements: Statement[] = [];

  for (let i = 0; i < chans; i++) {
    // generate the input statements, that will then be passed to each
    // function call as arguments
    const inputStatements: Statement[] = [];
    for (let j = 0; j < numberOfInputs; j++) {
      let statement: Statement = [{ name: "input", value: chans * j + i } as CompoundOperator];
      statement.node = {
        ...parentNode,
        id: `${parentNode.id}_input_${j}_${i}`,
      };
      inputStatements.push(statement);
    }

    console.log("input statements=", inputStatements);
    // call with bodies and invocation number and input statements for the correct invocation
    let callResult = [{ name: "call", value: i }, defun, ...inputStatements];
    (callResult as Statement).node = {
      ...parentNode,
      id: `${parentNode.id}_call_${i}`,
    };

    for (let outNumber = 0; outNumber < numberOfOutputs; outNumber++) {
      let nth: Statement = ["nth" as Operator, callResult as Statement, outNumber];
      nth.node = {
        ...parentNode,
        id: `${parentNode.id}_nth_${outNumber}_${i}`,
      };

      let outStatement: Statement = [
        {
          name: "output",
          outputNumber: outNumber * chans + i,
        },
        nth,
      ];
      mcOutStatements.push(outStatement);
    }
    // we then need to do nth on this and route to the correct outputNumber
    // question is how should routes work? should they be strided?
  }

  const sStatement = ["s" as Operator, ...mcOutStatements];
  console.log("construct mc statement ended");
  return sStatement;
};

export const setupMCNode = (node: ObjectNode) => {
  const channels = node.attributes.chans as number;

  for (let inlet of node.inlets) {
    inlet.mc = true;
    inlet.chans = channels;
  }

  for (let outlet of node.outlets) {
    outlet.mc = true;
    outlet.chans = channels;
  }
};
