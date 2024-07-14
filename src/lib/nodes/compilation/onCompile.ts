import { replaceAll } from "@/lib/zen/replaceAll";

import { Operator, Statement } from "../definitions/zen/types";
import { ConnectionType, Node, ObjectNode, Patch, SubPatch } from "../types";
import { compileStatement } from "../definitions/zen/AST";
import { printStatement } from "../definitions/zen/AST";
import { Arg, createWorklet, UGen, ZenGraph, zenWithTarget } from "@/lib/zen";
import { ZenWorklet } from "@/lib/zen/worklet";
import { PatchImpl } from "../Patch";
import { publish } from "@/lib/messaging/queue";
import { getRootPatch, traverseForwards } from "../traverse";
import { Target } from "@/lib/zen/targets";
import { containsSameHistory } from "../definitions/zen/history";
import { printAndMinify } from "./minify";
import { mapReceive } from "./recompileGraph";
import { waitForBuffers } from "./wait";
import { initMemory } from "@/lib/zen/memory/initialize";
import { exportParameters, exportToAudioUnit } from "./export";
import { sortHistories } from "./histories";

const constructStatements = (patch: PatchImpl, statement: Statement) => {
  const historyDependencies = patch.historyDependencies.filter((x) =>
    notInFunction(x),
  );
  const _statement = ["s" as Operator];
  for (const dependency of historyDependencies) {
    if (dependency.node && dependency.node.name === "param") {
      continue;
    }
    // make sure that statement contains the history
    const hist = ((dependency as Statement[])[0] as any).history;
    // make sure the hist is somewhere in the statement
    if (hist) {
      if (containsSameHistory(hist, statement, false)) {
        _statement.push(dependency as any);
      } else {
      }
    } else {
      _statement.push(dependency as any);
    }
  }
  const __statement: Statement[] = sortHistories(
    _statement as Statement[],
  ) as Statement[];
  __statement.push(statement as Statement);
  return __statement as Statement;
};

export const prepareAndCompile = (patch: PatchImpl, _statement: Statement) => {
  const statement =
    patch.historyDependencies.length > 0
      ? constructStatements(patch, _statement)
      : _statement;

  const parentNode = (patch as Patch as SubPatch).parentNode;
  const ast = compileStatement(statement);
  const target =
    parentNode.attributes.target === "C" ? Target.C : Target.Javascript;
  const forceScalar = !parentNode.attributes.SIMD;

  const a = new Date().getTime();

  const zenGraph: ZenGraph = Array.isArray(ast)
    ? zenWithTarget(target, ast[0], forceScalar)
    : zenWithTarget(target, ast as UGen, forceScalar);

  const h = new Date().getTime();
  console.log("compiling zen graph took %s ms", h - a);
  return {
    zenGraph,
    statement,
  };
};

export const onCompile = (
  patch: PatchImpl,
  statement: Statement,
  outputNumber?: number,
) => {
  if (outputNumber !== undefined) {
    patch.outputStatements[outputNumber - 1] = statement;
    const numOutputs = patch.objectNodes.filter((x) => x.name === "out").length;
    const numFound = patch.outputStatements.filter(
      (x) => x !== undefined,
    ).length;
    if (numFound === numOutputs) {
      statement = ["s" as Operator, ...patch.outputStatements];
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
      console.log("still compiling..");
      return;
    }

    if (patch.isZenBase()) {
      patch.isCompiling = false;
    }
    const prepared = prepareAndCompile(patch, statement);

    const zenGraph = prepared.zenGraph;
    statement = prepared.statement;

    const parentNode = (patch as Patch as SubPatch).parentNode;
    const parentId = parentNode ? parentNode.id : patch.id;
    const workletId = "zen" + parentId + "_" + id + new Date().getTime();
    patch.zenGraph = zenGraph;
    waitForBuffers(patch).then(() => {
      const exportedParameters = exportParameters(zenGraph);
      createWorklet(patch.audioContext, zenGraph, workletId)
        .then((ret) => {
          ret = ret as ZenWorklet;
          patch.audioNode = ret.workletNode;
          let worklet = ret.workletNode;
          if (ret.wasm) {
            patch.wasmCode = ret.wasm;
            patch.exportedAudioUnit = exportToAudioUnit(
              exportedParameters,
              ret.wasm,
            );
          }
          ret.workletNode.port.onmessage = (e) => {
            if (e.data.type === "wasm-ready") {
              initMemory(zenGraph.context, worklet);
              worklet.port.postMessage({ type: "ready" });
              patch.skipRecompile = true;
              console.log("sending attributes and messages...");
              patch.sendAttributeMessages();
              patch.sendNumberMessages(true);
              let matricesAndBuffers = patch.objectNodes.filter(
                (x) => x.name === "matrix" || x.name === "buffer",
              );
              matricesAndBuffers.forEach((matrix) =>
                matrix.receive(matrix.inlets[0], "bang"),
              );

              patch.skipRecompile = false;
              console.log("finished");
            }
            const data = e.data.time
              ? [
                  e.data.subType,
                  e.data.body === true
                    ? 1
                    : e.data.body === false
                      ? 0
                      : e.data.body,
                  patch,
                  e.data.time,
                ]
              : [
                  e.data.subType,
                  e.data.body === true
                    ? 1
                    : e.data.body === false
                      ? 0
                      : e.data.body,
                  patch,
                ];
            publish(e.data.type, data);
          };

          patch.disconnectGraph();
          const merger = patch.audioContext.createChannelMerger(
            zenGraph.numberOfInputs,
          );
          const parentNode = (patch as Patch as SubPatch).parentNode;
          console.log("connecting new worklet now", ret.workletNode);
          if (parentNode) {
            parentNode.merger = merger;
            merger.connect(ret.workletNode);

            for (let i = 0; i < parentNode.outlets.length; i++) {
              parentNode.outlets[i].connectionType = ConnectionType.AUDIO;
            }
          }
          patch.worklets.push({
            workletNode: ret.workletNode,
            graph: zenGraph,
            merger: merger,
          });

          if (parentNode) {
            parentNode.useAudioNode(patch.audioNode);
          }

          patch.setupAudioNode(patch.audioNode);
          const gain = patch.audioContext.createGain();
          ret.workletNode.connect(gain);

          if (patch.setAudioWorklet) {
            patch.setAudioWorklet(ret.workletNode);
          }

          for (const messageNode of patch.messageNodes) {
            if (messageNode.message) {
              messageNode.receive(messageNode.inlets[1], messageNode.message);
            }
          }
          patch.skipRecompile = true;
          patch.sendNumberMessages();
          patch.sendAttributeMessages();

          mapReceive(
            patch.objectNodes.filter(
              (x) => x.name === "matrix" || x.name === "buffer",
            ),
          );

          patch.skipRecompile = false;

          if (parentNode) {
            handlePublishers(parentNode);
          }

          /*
          patch.zenCode = printAndMinify(statement);
          if (patch.setZenCode) {
            patch.setZenCode(patch.zenCode);
          }
          */
        })
        .catch(() => {});
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

const handlePublishers = (parentNode: ObjectNode) => {
  const moduleType = parentNode.attributes.moduleType;
  const publishers = parentNode.patch.objectNodes.filter(
    (x) => x.name === "publishPatchSignals" && x.arguments[0] === moduleType,
  );

  const root = getRootPatch(parentNode.patch);
  const allReceives = root.getAllNodes().filter((x) => x.name === "receive~");
  for (const x of publishers) {
    const name = x.arguments[2] as string;
    const matches = allReceives.filter((x) => x.arguments[0] === name);
    mapReceive(
      matches.filter((x) => x.fn),
      [],
    );
    for (const match of matches) {
      if (match.fn) {
        match.fn([]);
      }
    }
    if (x.fn) {
      x.fn([]);
    }
  }
};

export const sleep = (time: number): Promise<void> => {
  return new Promise((resolve: () => void) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};
