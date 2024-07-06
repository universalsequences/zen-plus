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

const constructStatements = (patch: PatchImpl, statement: Statement) => {
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
      if (containsSameHistory(hist, statement, false)) {
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
  const statement =
    patch.historyDependencies.length > 0 ? constructStatements(patch, _statement) : _statement;

  const parentNode = (patch as Patch as SubPatch).parentNode;
  const ast = compileStatement(statement);
  const target = parentNode.attributes.target === "C" ? Target.C : Target.Javascript;
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

export const onCompile = (patch: PatchImpl, statement: Statement, outputNumber?: number) => {
  console.log("onCompile", patch, statement, outputNumber);
  if (outputNumber !== undefined) {
    patch.outputStatements[outputNumber - 1] = statement;
    const numOutputs = patch.objectNodes.filter((x) => x.name === "out").length;
    const numFound = patch.outputStatements.filter((x) => x !== undefined).length;
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
    patch.disconnectGraph();
    const parentId = parentNode ? parentNode.id : patch.id;
    const workletId = "zen" + parentId + "_" + id + new Date().getTime();

    patch.zenGraph = zenGraph;

    console.log("about to create worklet");

    waitForBuffers(patch).then(() => {
      createWorklet(patch.audioContext, zenGraph, workletId)
        .then((ret) => {
          console.log("finished creating worklet with name=", workletId);
          ret = ret as ZenWorklet;
          patch.audioNode = ret.workletNode;
          let worklet = ret.workletNode;
          if (ret.wasm) {
            patch.wasmCode = ret.wasm;
          }
          ret.workletNode.port.onmessage = (e) => {
            if (e.data.type === "wasm-ready") {
              initMemory(zenGraph.context, worklet);
              worklet.port.postMessage({ type: "ready" });
              patch.skipRecompile = true;
              patch.sendAttributeMessages();
              patch.sendNumberMessages(true);
              let matricesAndBuffers = patch.objectNodes.filter(
                (x) => x.name === "matrix" || x.name === "buffer",
              );
              matricesAndBuffers.forEach((matrix) => matrix.receive(matrix.inlets[0], "bang"));

              patch.skipRecompile = false;
            }
            const data = e.data.time
              ? [
                  e.data.subType,
                  e.data.body === true ? 1 : e.data.body === false ? 0 : e.data.body,
                  patch,
                  e.data.time,
                ]
              : [
                  e.data.subType,
                  e.data.body === true ? 1 : e.data.body === false ? 0 : e.data.body,
                  patch,
                ];
            publish(e.data.type, data);
          };

          console.log("zenGraph numberOfInputs=", zenGraph.numberOfInputs);
          const merger = patch.audioContext.createChannelMerger(zenGraph.numberOfInputs);
          const parentNode = (patch as Patch as SubPatch).parentNode;
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

          mapReceive(patch.objectNodes.filter((x) => x.name === "matrix" || x.name === "buffer"));

          patch.skipRecompile = false;

          if (parentNode) {
            handlePublishers(parentNode);
          }

          patch.zenCode = printAndMinify(statement);
          if (patch.setZenCode) {
            patch.setZenCode(patch.zenCode);
          }
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

const getFunctionNames = (dslCode: string, ultraMinify = true) => {
  const funcRegex = /\b(\w+\.)?(\w+)\(/g;

  // Object to store unique function names
  const functions: any = {};

  // Find all matches
  let match;
  while ((match = funcRegex.exec(dslCode)) !== null) {
    if (match[1] && match[2]) {
      functions[match[1] + match[2]] = true; // Store the function name
    } else {
      if (ultraMinify) {
        functions[match[2]] = true; // Store the function name
      }
    }
  }

  const shorthands: any = {};
  // Generate shorthands
  /*
    let shorthandIndex = 0;

    let currentCharCode = 97; // ASCII code for 'a'
    let extraChar = -1;
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let currentCharIndex = 0;
    let prefixIndex = -1;
    */

  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let prefixIndex = 0;
  let suffixIndex = 0;

  Object.keys(functions).forEach((func) => {
    // Generate a shorthand name, e.g., f1, f2, ...
    /*
        shorthands[func] = 'F' + shorthandIndex++;
        */
    let shorthand = alphabet[prefixIndex] + (suffixIndex > 0 ? alphabet[suffixIndex - 1] : "");

    if (shorthand === "do") {
      shorthand = "d000";
    }

    if (shorthand === "eq") {
      shorthand = "eq000";
    }

    shorthands[func] = shorthand;

    if (suffixIndex === alphabet.length) {
      suffixIndex = 0;
      prefixIndex++;
    } else {
      suffixIndex++;
    }
  });

  // Generate the shorthand definitions
  let shorthandDefinitions = "let ";
  let outDSL = dslCode;

  ultraMinify = true;
  if (ultraMinify) {
    Object.entries(shorthands).forEach(([original, shorthand], i) => {
      if (
        original.includes("connections") ||
        original.includes("bidirectional") ||
        original.includes("gen")
      ) {
        return;
      }
      if (!original.includes("hst") || original === "history") {
        shorthandDefinitions += `${shorthand}=${original}`;
        if (i < Object.values(shorthands).length - 1) {
          shorthandDefinitions += ",";
        }
        if (original === "history") {
        }
        outDSL = outDSL.replaceAll("= " + original + "(", "=" + shorthand + "(");
        outDSL = outDSL.replaceAll("=" + original + "(", "=" + shorthand + "(");
      }
    });
    shorthandDefinitions = replaceAll(shorthandDefinitions, "\n", "");
  }

  if (!ultraMinify) {
    shorthandDefinitions = "";
  }
  outDSL =
    shorthandDefinitions +
    ";\n" +
    "let " +
    outDSL.replaceAll("let ", ",").replaceAll(";", "").replaceAll("\n", "").slice(1);
  let retIndex = outDSL.indexOf("return");
  outDSL = outDSL.slice(0, retIndex) + ";\n" + outDSL.slice(retIndex);

  return outDSL;
};

export const sleep = (time: number): Promise<void> => {
  return new Promise((resolve: () => void) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};

export const minify = (inputFile: string, ultraMinify = true): string => {
  inputFile = inputFile
    .replace(/zswitch(\d+)/g, (_, number) => `z${number}`)
    .replace(/add(\d+)/g, (_, number) => `a${number}`)
    .replace(/sub(\d+)/g, (_, number) => `q${number}`)
    .replace(/mult(\d+)/g, (_, number) => `m${number}`);
  inputFile = inputFile
    .replace(/div(\d+)/g, (_, number) => `d${number}`)
    .inputFile.replace(/rampToTrig(\d+)/g, (_, number) => `r${number}`)
    .replace(/phasor(\d+)/g, (_, number) => `p${number}`);
  inputFile = inputFile.replace(/cycle(\d+)/g, (_, number) => `c${number}`);
  inputFile = inputFile.replace(/floor(\d+)/g, (_, number) => `f${number}`);
  inputFile = inputFile.replace(/and(\d+)/g, (_, number) => `an${number}`);
  inputFile = inputFile.replace(/accum(\d+)/g, (_, number) => `ac${number}`);
  inputFile = inputFile.replace(/mod(\d+)/g, (_, number) => `mo${number}`);
  inputFile = inputFile.replace(/clamp(\d+)/g, (_, number) => `cl${number}`);
  inputFile = inputFile.replace(/eq(\d+)/g, (_, number) => `E${number}`);
  inputFile = inputFile.replace(/selector(\d+)/g, (_, number) => `S${number}`);
  inputFile = inputFile.replace(/triangle(\d+)/g, (_, number) => `T${number}`);
  inputFile = inputFile.replace(/mstosamps(\d+)/g, (_, number) => `ms${number}`);
  inputFile = inputFile.replace(/round(\d+)/g, (_, number) => `ro${number}`);
  inputFile = inputFile.replace(/compressor(\d+)/g, (_, number) => `co${number}`);
  inputFile = inputFile.replace(/wrap(\d+)/g, (_, number) => `w${number}`);
  inputFile = inputFile.replace(/argument(\d+)/g, (_, number) => `A${number}`);
  inputFile = inputFile.replace(/onepole(\d+)/g, (_, number) => `o${number}`);
  inputFile = inputFile.replace(/scale(\d+)/g, (_, number) => `sc${number}`);
  inputFile = inputFile.replace(/vactrol(\d+)/g, (_, number) => `V${number}`);
  inputFile = replaceAll(inputFile, " ,", ",");
  inputFile = inputFile.replace(/param(\d+)/g, "p$1");
  inputFile = inputFile.replace(/latch(\d+)/g, "L$1");
  inputFile = inputFile.replace(/mix(\d+)/g, "M$1");
  inputFile = inputFile.replace(/delay(\d+)/g, "D$1");
  inputFile = inputFile.replace(/biquad(\d+)/g, "B$1");
  inputFile = replaceAll(inputFile, "  ", "");
  inputFile = replaceAll(inputFile, "(\n", "(");
  inputFile = replaceAll(inputFile, "( ", "(");
  inputFile = replaceAll(inputFile, ",\n", ",");
  inputFile = replaceAll(inputFile, " (", "(");
  inputFile = replaceAll(inputFile, " )", ")");
  inputFile = replaceAll(inputFile, ") ", ")");
  inputFile = replaceAll(inputFile, " = ", "=");

  inputFile = getFunctionNames(inputFile, ultraMinify);

  return inputFile;
};

export const sortHistories = (statements: Statement[]): Statement[] => {
  let histories = statements.slice(1);
  let historyPairs: any[] = [];
  for (let h of histories) {
    let _h = getAllHistories(h as Statement[]);
    historyPairs.push([h, Array.from(new Set(_h))]);
  }

  let sorted: any[] = historyPairs.sort((a, b) => a[1].length - b[1].length);

  return ["s", ...sorted.map((x) => x[0])] as Statement[];
};

const getAllHistories = (statement: Statement[], visited: Set<string> = new Set()): any[] => {
  let node = (statement as Statement).node;
  if (node) {
    if (visited.has(node.id)) {
      return [];
    }
    visited.add(node.id);
  }
  let histories: any[] = [];
  if (statement[0] && (statement[0] as any).name === "history") {
    histories.push((statement[0] as any).history);
  }
  for (let i = 1; i < statement.length; i++) {
    histories.push(...getAllHistories(statement[i] as Statement[], visited));
  }
  return histories;
};
