import type { Operator, Statement } from "../definitions/zen/types";
import { type Node, type ObjectNode, type Patch, type SubPatch } from "../types";
import { compileStatement } from "../definitions/zen/AST";
import { createWorklet, type UGen, type ZenGraph, zenWithTarget } from "@/lib/zen";
import type { ZenWorklet } from "@/lib/zen/worklet";
import type { PatchImpl } from "../Patch";
import { traverseForwards } from "../traverse";
import { Target } from "@/lib/zen/targets";
import { containsSameHistory } from "../definitions/zen/history";
import { waitForBuffers } from "./wait";
import { sortHistories } from "./histories";
import { isTrivialGraph } from "./trivialGraph";
import { onZenCompilation } from "./onZenCompilation";
import { constructMCStatement } from "./mc";

export const constructStatements = (patch: PatchImpl, statement: Statement) => {
  const historyDependencies = patch.historyDependencies.filter((x) => notInFunction(x));
  const _statement = ["s" as Operator];
  for (const dependency of historyDependencies) {
    if (dependency.node && dependency.node.name === "param") {
      continue;
    }
    // make sure that statement contains the history
    const hist = ((dependency as Statement[])[0] as any).history;
    // make sure the hist is somewhere in the statement
    if (hist) {
      if (containsSameHistory(hist, statement, false, undefined, undefined)) {
        _statement.push(dependency as any);
      } else {
      }
    } else {
      _statement.push(dependency as any);
    }
  }
  const __statement: Statement[] = sortHistories(_statement as Statement[]) as Statement[];
  __statement.push(statement as Statement);
  return __statement as Statement;
};

export const prepareAndCompile = (patch: PatchImpl, _statement: Statement) => {
  const parentNode = (patch as Patch as SubPatch).parentNode;
  const mc = parentNode.attributes.mc;
  const statement =
    !mc && patch.historyDependencies.length > 0
      ? constructStatements(patch, _statement)
      : _statement;

  const ast = compileStatement(statement);
  const target = parentNode.attributes.target === "C" ? Target.C : Target.Javascript;
  const forceScalar = !parentNode.attributes.SIMD;

  let zenGraph: ZenGraph | undefined = undefined;
  try {
    if (window.stopCompileTest) throw new Error("hello");
    zenGraph = Array.isArray(ast)
      ? zenWithTarget(target, ast[0], forceScalar)
      : zenWithTarget(target, ast as UGen, forceScalar);
  } catch (e) {
    console.log("error compiling patch", patch, e);
    throw e;
  }

  return {
    zenGraph,
    statement,
  };
};

export const onCompile = (patch: PatchImpl, inputStatement: Statement, outputNumber?: number) => {
  let statement = inputStatement;
  if (outputNumber !== undefined) {
    patch.outputStatements[outputNumber - 1] = statement;
    const numOutputs = patch.objectNodes.filter(
      (x) => x.name === "out" && x.inlets.flatMap((x) => x.connections).length > 0,
    ).length;
    const numFound = patch.outputStatements.filter((x) => x !== undefined).length;

    const parentNode = (patch as unknown as SubPatch).parentNode;
    if (numFound === numOutputs) {
      if (parentNode.attributes.mc) {
        // we are in a mc node so use # of channels (chan attribute) to convert each statement
        // into a single multi-output defun statement
        // and then do severall "call" operators on the defun (for each chan)
        // finally use nth to route each call to the right output of the actual thing
        // we may need to actually go into the asts here and convert the "out" statements and collect them
        // into a "body list" and add them to defun
        const chans = parentNode.attributes.chans as number;
        statement = constructMCStatement(patch, patch.outputStatements, chans) as Statement;
      } else {
        statement = ["s" as Operator, ...patch.outputStatements];
      }
    } else if (parentNode.attributes.mc) {
      return;
    }
  }

  if (patch.waiting) {
    patch.storedStatement = statement;
    return;
  }
  if (patch.skipRecompile) {
    patch.storedStatement = statement;
    return;
  }

  patch.storedStatement = undefined;
  patch.counter++;
  const id = patch.counter;

  patch.skipRecompile = false;
  setTimeout(() => {
    if (id !== patch.counter) {
      return;
    }
    if (patch.skipRecompile) {
      return;
    }

    if (patch.isZenBase()) {
      patch.isCompiling = false;
    }

    const parentNode = (patch as Patch as SubPatch).parentNode;

    const trivialInputs = isTrivialGraph(statement);
    if (trivialInputs > 0) {
      patch.disconnectGraph();
      // then we need to create a 2 channel gain node and connect it to the merger;
      const mergerIn = parentNode.merger || patch.audioContext.createChannelMerger(trivialInputs);
      //const mergerOut = patch.audioContext.createChannelSplitter(4);
      //mergerIn.connect(mergerOut);
      parentNode.merger = mergerIn;
      //mergerOut.connect(patch.audioContext.destination);
      parentNode.useAudioNode(mergerIn);
      return;
    }
    let a = new Date().getTime();
    const prepared = prepareAndCompile(patch, statement);
    let b = new Date().getTime();

    const zenGraph = prepared.zenGraph;
    statement = prepared.statement;

    const parentId = parentNode ? parentNode.id : patch.id;
    const workletId = `zen${parentId}_${id}_${new Date().getTime()}`;
    patch.zenGraph = zenGraph;
    patch.statementToExport = statement;

    waitForBuffers(patch).then(() => {
      createWorklet(patch.audioContext, zenGraph, workletId)
        .then((ret: ZenWorklet) => {
          onZenCompilation(ret, patch, zenGraph);
        })
        .catch((e) => {
          console.log("got an error", e);
        });
    });
  }, 120);
};

const notInFunction = (x: Statement) => {
  if (x.node) {
    const forward: Node[] = traverseForwards(x.node);
    if (forward?.some((x: Node) => (x as ObjectNode).name === "defun")) {
      return false;
    }
  }
  return true;
};

export const sleep = (time: number): Promise<void> => {
  return new Promise((resolve: () => void) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};
