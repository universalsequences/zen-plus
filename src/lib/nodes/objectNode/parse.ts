import { Definition, NumberOfInlets } from "@/lib/docs/docs";
import pako from "pako";
import { OperatorContextType, getOperatorContext, isCompiledType } from "../context";
import { createGLFunction } from "../definitions/create";
import {
  Message,
  InstanceFunction,
  ObjectNode,
  SerializedPatch,
  SubPatch,
  Lazy,
  NodeFunction,
  ConnectionType,
} from "../types";

interface Constants {
  [x: string]: number | boolean;
}

const CONSTANTS: Constants = {
  twopi: 2 * Math.PI,
  halfpi: 0.5 * Math.PI,
  pi: Math.PI,
  false: false,
  true: true,
};

export const parse = (
  objectNode: ObjectNode,
  _text: string,
  contextType: OperatorContextType = objectNode.operatorContextType,
  compile = true,
  patchPreset?: SerializedPatch,
): boolean => {
  let text = _text;
  const context = getOperatorContext(contextType);
  objectNode.lastSentMessage = undefined;
  objectNode.operatorContextType = contextType;
  const originalText = text;
  text = objectNode.parseAttributes(text, context);
  const tokens: string[] = text.split(" ").filter((x) => x.length > 0);
  let name = tokens[0];
  const argumentTokens = tokens.slice(1);

  if (patchPreset) {
    text = text.replace(name, "zen");
    name = "zen";
  }

  objectNode.isCycle = undefined;

  if (isCompiledType(contextType) || contextType === OperatorContextType.AUDIO) {
    // skip vm compilation
    objectNode.skipCompilation = true;
  }

  const definition: Definition | null = context.lookupDoc(name);

  if (definition?.name) {
    name = definition.name;
    objectNode.definition = definition;
  }

  if (definition?.attributeOptions) {
    for (const opt in definition.attributeOptions) {
      if (!objectNode.attributeOptions[opt]) {
        objectNode.attributeOptions[opt] = [];
      }
      objectNode.attributeOptions[opt] = Array.from(
        new Set([...objectNode.attributeOptions[opt], ...definition.attributeOptions[opt]]),
      );
    }
  }

  for (const x of objectNode.inlets) {
    x.hidden = false;
  }

  if (!definition) {
    if (name in CONSTANTS || !Number.isNaN(Number.parseFloat(name))) {
      const parsed = CONSTANTS[name] || Number.parseFloat(name);
      // an object with just a number becomes a static number object (all it does is send its number along)
      if (tokens.length > 1 && tokens.every((x) => !Number.isNaN(Number.parseFloat(x)))) {
        const array: number[] = tokens.map((x) => Number.parseFloat(x));
        objectNode.text = text;
        setupStaticListObject(objectNode, array, compile);
        return true;
      }

      objectNode.text = name;

      setupStaticNumberObject(objectNode, parsed as number, compile);
      return true;
    }
    return false;
  }

  if (!context.api[name] && objectNode.operatorContextType !== OperatorContextType.GL) {
    return false;
  }

  objectNode.text = originalText;

  const _numberOfOutlets =
    typeof definition.numberOfOutlets === "function"
      ? definition.numberOfOutlets(tokens.length)
      : typeof definition.numberOfOutlets === "string"
        ? (objectNode.attributes[definition.numberOfOutlets] as number)
        : definition.numberOfOutlets;

  const numberOfInlets =
    definition.numberOfInlets === NumberOfInlets.Outlets
      ? _numberOfOutlets
      : definition.numberOfInlets === NumberOfInlets.OutletsPlusOne
        ? _numberOfOutlets + 1
        : typeof definition.numberOfInlets === "function"
          ? definition.numberOfInlets(tokens.length)
          : typeof definition.numberOfInlets === "string"
            ? (objectNode.attributes[definition.numberOfInlets] as number)
            : definition.numberOfInlets;

  const parsedArguments = parseArguments(
    objectNode,
    argumentTokens,
    numberOfInlets,
    definition.defaultValue as number | undefined,
  );

  const lazyArgs: Lazy[] = generateIO(
    objectNode,
    definition,
    parsedArguments,
    argumentTokens.length,
  );
  let nodeFunction: NodeFunction = context.api[name];

  if (!nodeFunction && objectNode.operatorContextType === OperatorContextType.GL) {
    nodeFunction = createGLFunction(objectNode, definition);
    if (definition.numberOfInlets === 0) {
      objectNode.needsLoad = true;
    }
  }
  objectNode.name = name;

  const instanceFunction: InstanceFunction = nodeFunction(objectNode, ...lazyArgs);
  objectNode.fn = instanceFunction;

  if (
    compile &&
    objectNode.name !== "zen" &&
    (objectNode.operatorContextType === OperatorContextType.ZEN ||
      objectNode.operatorContextType === OperatorContextType.GL)
  ) {
    if (!objectNode.patch.skipRecompile) {
      //objectNode.patch.recompileGraph();
      const parentNode = (objectNode.patch as SubPatch).parentNode;
      if (!parentNode || parentNode.attributes.type !== "core") {
        objectNode.patch.recompileGraph();
      }
    }
  }

  if (patchPreset && objectNode.subpatch) {
    objectNode.subpatch.objectNodes = [];
    if ((patchPreset as any).compressed) {
      // Convert the Base64 string back to a binary buffer
      const binaryBuffer = Buffer.from((patchPreset as any).compressed, "base64");
      // Decompress the data using Pako
      const decompressed = pako.inflate(binaryBuffer, { to: "string" });
      const json = JSON.parse(decompressed);
      objectNode.subpatch.fromJSON(json, true);
    } else {
      objectNode.subpatch.fromJSON(patchPreset, true);
    }
    objectNode.subpatch.doc = patchPreset.doc;
    objectNode.subpatch.docId = patchPreset.docId;
  }

  if (
    objectNode.name !== "param" &&
    objectNode.name !== "uniform" &&
    objectNode.name !== "color" &&
    objectNode.name !== "attrui" &&
    objectNode.name !== "call" &&
    objectNode.name !== "history" &&
    objectNode.name !== "defun" &&
    objectNode.name !== "polycall" &&
    objectNode.name !== "polytrig" &&
    objectNode.name !== "modeling.component" &&
    objectNode.name !== "modeling.synth" &&
    objectNode.name !== "data" &&
    objectNode.name !== "canvas"
  ) {
    objectNode.isSpecialCase = false;
  } else {
    objectNode.isSpecialCase = true;
  }

  if (
    (objectNode.name && objectNode.name.includes("modeling")) ||
    objectNode.name === "uniform" ||
    objectNode.name === "color" ||
    objectNode.name === "data" ||
    objectNode.name === "param" ||
    objectNode.name === "history" ||
    objectNode.name === "zen" ||
    objectNode.name === "latchcall" ||
    objectNode.name === "call" ||
    objectNode.name === "defun" ||
    objectNode.name === "polycall" ||
    objectNode.name === "polytrig"
  ) {
    objectNode.isInletSumSpecialCase = true;
  } else {
    objectNode.isInletSumSpecialCase = false;
  }

  if (
    objectNode.needsLoad &&
    objectNode.inlets[0] &&
    objectNode.operatorContextType === OperatorContextType.CORE
  ) {
    // need to ensure things are straight with objectNode
    objectNode.receive(objectNode.inlets[0], "bang");
  }
  if (objectNode.patch.registerNewNode) {
    objectNode.patch.registerNewNode(objectNode);
  }

  if (objectNode.definition?.isHot) {
    for (const inlet of objectNode.inlets) {
      inlet.isHot = true;
    }
  } else {
    let i = 0;
    for (const inlet of objectNode.inlets) {
      inlet.isHot = i === 0;
      i++;
    }
  }
  return true;
};

const setupStaticNumberObject = (objectNode: ObjectNode, num: number, compile: boolean) => {
  objectNode.operatorContextType = OperatorContextType.NUMBER;
  objectNode.fn = (message: Message) => [num];
  objectNode.inlets.length = 0;
  if (objectNode.outlets.length === 0) {
    objectNode.newOutlet();
  }
  if (compile) {
    objectNode.patch.recompileGraph();
  }
};

const setupStaticListObject = (objectNode: ObjectNode, array: number[], compile: boolean) => {
  objectNode.fn = (message: Message) => [array];
  if (objectNode.outlets.length === 0) {
    objectNode.newOutlet();
  }
  if (compile) {
    objectNode.send(objectNode.outlets[0], array);
  }
};

const generateIO = (
  objectNode: ObjectNode,
  definition: Definition,
  parsedArguments: (Message | undefined)[],
  numberOfParsedArguments: number,
): Lazy[] => {
  const { numberOfInlets, numberOfOutlets, outletNames, inletNames } = definition;
  const _numberOfOutlets =
    typeof numberOfOutlets === "function"
      ? numberOfOutlets(numberOfParsedArguments + 1)
      : typeof numberOfOutlets === "string"
        ? (objectNode.attributes[numberOfOutlets] as number)
        : numberOfOutlets;
  const _numberOfInlets =
    numberOfInlets === NumberOfInlets.Outlets
      ? _numberOfOutlets
      : numberOfInlets === NumberOfInlets.OutletsPlusOne
        ? _numberOfOutlets + 1
        : typeof numberOfInlets === "function"
          ? numberOfInlets(numberOfParsedArguments + 1)
          : typeof numberOfInlets === "string"
            ? (objectNode.attributes[numberOfInlets] as number)
            : numberOfInlets;

  const lazyArgs: Lazy[] = [];
  for (let i = 0; i < _numberOfInlets; i++) {
    if (!objectNode.inlets[i]) {
      // no inlet yet, so we need to create one
      if (inletNames && inletNames[i]) {
        objectNode.newInlet(inletNames[i], definition.inletType);
      } else {
        objectNode.newInlet(undefined, definition.inletType);
      }
    } else {
      // inlet already exists.. so just change name if necessary
      if (inletNames && inletNames[i]) {
        objectNode.inlets[i].name = inletNames[i];
      }
    }

    if (i > 0 && i < numberOfParsedArguments + 1 && objectNode.inlets[i]) {
      if (typeof numberOfInlets === "function") {
        objectNode.inlets[i].hidden = false;
      } else {
        objectNode.inlets[i].hidden = true;
      }
    } else {
      objectNode.inlets[i].hidden = false;
    }

    // create a lazy function that resolve to the current argument value
    if (i > 0) {
      if (objectNode.inlets[i]) {
        if (objectNode.inlets[i].connections.length === 0) {
          objectNode.inlets[i].lastMessage = parsedArguments[i - 1];
        }
      }
      lazyArgs.push(() => objectNode.arguments[i - 1]);
    }
    if (objectNode.name === "in") {
      objectNode.inlets[i].hidden = true;
    }
  }

  for (let i = 0; i < _numberOfOutlets; i++) {
    if (!objectNode.outlets[i]) {
      // no inlet yet, so we need to create one
      const outletType =
        objectNode.name === "zen" && !objectNode.patch.isZen
          ? ConnectionType.AUDIO
          : definition.outletType;
      if (outletNames && outletNames[i]) {
        objectNode.newOutlet(outletNames[i], outletType);
      } else {
        objectNode.newOutlet(undefined, outletType);
      }
    } else {
      // inlet already exists.. so just change name if necessary
      if (outletNames && outletNames[i]) {
        objectNode.outlets[i].name = outletNames[i];
      }
    }
  }

  // check the number of io-lets matches the spec
  if (
    !objectNode.audioNode &&
    objectNode.name !== "speakers~" &&
    objectNode.name !== "call" &&
    objectNode.name !== "latchcall" &&
    objectNode.name !== "zen" &&
    objectNode.outlets.length > _numberOfOutlets &&
    objectNode.name !== "canvas" &&
    objectNode.name !== "polycall" &&
    objectNode.name !== "polytrig" &&
    objectNode.name !== "param" &&
    objectNode.name !== "modeling.synth" &&
    objectNode.name !== "modeling.component"
  ) {
    objectNode.outlets = objectNode.outlets.slice(0, _numberOfOutlets);
  }

  if (
    !objectNode.audioNode &&
    objectNode.name !== "zen" &&
    objectNode.inlets.length > _numberOfInlets &&
    objectNode.name !== "polycall" &&
    objectNode.name !== "polytrig"
  ) {
    objectNode.inlets = objectNode.inlets.slice(0, _numberOfInlets);
  }

  return lazyArgs;
};

const parseArguments = (
  objectNode: ObjectNode,
  tokens: string[],
  numberOfInlets: number,
  defaultMessage?: number,
): (Message | undefined)[] => {
  const otherArguments: (Message | undefined)[] = [];
  const defaultArgument = defaultMessage === undefined ? 0 : defaultMessage;

  for (let i = 0; i < Math.max(tokens.length, numberOfInlets); i++) {
    let parsed: Message =
      CONSTANTS[tokens[i]] !== undefined ? CONSTANTS[tokens[i]] : Number.parseFloat(tokens[i]);
    if (tokens[i] !== undefined && Number.isNaN(parsed)) {
      parsed = tokens[i];
    }
    objectNode.arguments[i] = i < tokens.length ? parsed : defaultArgument;
    otherArguments[i] = i < tokens.length ? parsed : defaultMessage;
  }
  return otherArguments;
};
