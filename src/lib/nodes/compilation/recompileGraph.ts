import { OperatorContextType } from "../context";
import { PatchType, type Message, type ObjectNode, type Patch, type SubPatch } from "../types";

const debug = false;
const dlog = (...x: any[]) => {
  if (debug) console.log(...x);
};

const handleCompileReset = (patch: Patch): [ObjectNode[], ObjectNode[]] => {
  const parentPatch = (patch as Patch as SubPatch).parentPatch;
  patch.disconnectGraph();
  patch.outputStatements = [];
  patch.storedStatement = undefined;
  patch.historyDependencies = [];
  patch.historyNodes = new Set<ObjectNode>();
  patch.waiting = true;

  // re-parse every node so that we "start from scratch"
  const objectNodes = patch.objectNodes;
  const _objectNodes = patch.name === undefined ? patch.getAllNodes() : objectNodes; //objectNodes;
  if (patch.name === undefined || patch.isZenBase()) {
    let __o = patch.getAllNodes();
    if (!parentPatch) {
      // skip all zen nodes... (cuz we're compiling from base patch)
      __o = __o.filter(
        (x) =>
          x.operatorContextType !== OperatorContextType.ZEN &&
          x.operatorContextType !== OperatorContextType.NUMBER &&
          x.operatorContextType !== OperatorContextType.CORE &&
          x.name !== "zen",
      );
    }

    for (const node of __o) {
      if (
        node.operatorContextType !== OperatorContextType.ZEN &&
        node.operatorContextType !== OperatorContextType.GL
      ) {
        continue;
      }
      if (node.subpatch) {
        for (const x of node.inlets) {
          if (x.connections.length > 0) {
            x.messagesReceived = undefined;
            x.lastMessage = undefined;
            x.markedMessages = [];
          }
        }
        continue;
      }
      for (const n of node.inlets) {
        if (n.connections.length > 0) {
          n.lastMessage = undefined;
          n.messagesReceived = undefined;
          n.markedMessages = [];
        }
      }
      node.lastSentMessage = undefined;
      const name = (node as ObjectNode).name;

      // note: do we want latchcall here
      if (
        name === "call" ||
        name === "defun" ||
        name === "polycall" ||
        name === "polytrig" ||
        name === "latchcall"
      ) {
        node.storedMessage = undefined;
      }
    }

    for (const node of __o) {
      if (
        node.operatorContextType !== OperatorContextType.ZEN &&
        node.operatorContextType !== OperatorContextType.GL
      ) {
        continue;
      }
      if (node.subpatch) {
        continue;
      }

      for (const n of node.inlets) {
        if (n.connections.length > 0) {
          n.lastMessage = undefined;
          n.messagesReceived = undefined;
          n.markedMessages = [];
        }
      }

      if (node.name !== "in") {
        node.parse(node.text, node.operatorContextType, false);
      }
    }
  }
  return [objectNodes, _objectNodes];
};

export const recompileGraph = (patch: Patch) => {
  const parentNode = (patch as Patch as SubPatch).parentNode;
  const parentPatch = (patch as Patch as SubPatch).parentPatch;
  if (parentNode && parentNode.attributes.type === "core") {
    return;
  }
  if (patch.skipRecompile) {
    return;
  }
  if (patch.isZenBase()) {
    patch.isCompiling = true;
  }

  const [objectNodes, _objectNodes] = handleCompileReset(patch);

  if (parentPatch) {
    // we are in a zen node so we proceed as usual
    for (const node of objectNodes) {
      if (node.subpatch && node.subpatch.patchType !== OperatorContextType.AUDIO) {
        node.subpatch.recompileGraph(true);
      }
    }
  } else {
    // we are at the base patch so skip all subpatches...
    // only compile gl subpatches
    for (const node of objectNodes) {
      if (node.subpatch && node.subpatch.patchType === OperatorContextType.GL) {
        node.subpatch.recompileGraph(true);
      }
    }
  }

  const matricesAndBuffers = patch.objectNodes.filter(
    (x) => x.name === "matrix" || x.name === "buffer",
  );
  mapReceive(matricesAndBuffers);

  const sliderKnobNodes = objectNodes.filter(
    (node) => node.name === "slider" || node.name === "knob",
  );
  mapReceive(sliderKnobNodes);

  if (patch.isZenBase()) {
    const audioInputs = patch
      .getAllNodes()
      .filter((node) => node.name === "in")
      .filter((node) => !(node.patch as SubPatch).parentPatch.isZen);
    mapReceive(audioInputs);

    const parent = (patch as Patch as SubPatch).parentPatch;
    if (parent && (patch as SubPatch).patchType === OperatorContextType.ZEN) {
      const functions = parent.getAllNodes().filter((x) => x.name === "function");
      mapReceive(functions);
    }

    const histories = patch.getAllNodes().filter((node) => node.name === "history");
    dlog("sending histories", histories);
    mapReceive(histories);

    const args = patch
      .getAllNodes()
      .filter((node) => node.name === "argument" || node.name === "invocation");

    dlog("sending args", args);
    mapReceive(args);

    //const dataNodes = patch.getAllNodes().filter((node) => node.name === "data");
    //mapReceive(dataNodes, [0]);

    const bufferNodes = patch.getAllNodes().filter((node) => node.name === "buffer");
    dlog("sending bufferNodes", bufferNodes);
    mapReceive(bufferNodes, [0]);

    const paramNodes = patch.getAllNodes().filter((node) => node.name === "param");
    dlog("sending bufferNodes", paramNodes);
    mapReceive(paramNodes);
  }

  if (patch.name === undefined) {
    const uniformNodes = patch.getAllNodes().filter((node) => node.name === "uniform");
    dlog("sending uniformNodes", uniformNodes);
    mapReceive(uniformNodes, "bang");
  }

  patch.waiting = false;

  const dataNodes = objectNodes.filter((node) => node.name === "data");
  dlog("sending data nodes ", dataNodes);
  mapReceive(dataNodes, "bang");

  //const topNodesNoLoad = (patch.isZenBase() ? _objectNodes : objectNodes).filter(
  //  (node) => node.inlets.length === 0 && !node.needsLoad,
  //);
  const topNodesNoLoad = objectNodes.filter((node) => node.inlets.length === 0 && !node.needsLoad);
  dlog("sending topNodesNoLoad", topNodesNoLoad);
  const a1 = new Date().getTime();
  executeAndSend(topNodesNoLoad);
  const b1 = new Date().getTime();
  dlog("topNodesNoLoad took %s ms", b1 - a1);

  const sourceNodes = objectNodes.filter(
    (node) =>
      node.needsLoad &&
      node.name !== "in" &&
      node.inlets[0] &&
      node.inlets[0].connections.length === 0,
  );

  dlog("sending sourceNodes", sourceNodes);
  mapReceive(sourceNodes);

  const topNodes = objectNodes.filter(
    (node) =>
      node.needsLoad &&
      node.name !== "in" &&
      !(node.inlets[0] && node.inlets[0].connections.length === 0),
  );

  dlog("sending topNodes", topNodes);
  executeAndSend(topNodes);

  // NOTE - might need to bring this back but this was not allowing me to have functions in base
  if (patch.isZenBase() && (patch as SubPatch).parentPatch) {
    const inputs = patch
      .getAllNodes()
      .filter((node) => node.name === "in")
      .filter((node) => node.patch !== this);

    dlog("sending inputs bc has a parent patch", inputs);
    for (const input of inputs) {
      // get the patch
      const p = input.patch as SubPatch;
      const inletNumber = (input.arguments[0] as number) - 1;

      if (p.parentNode) {
        if (p.parentNode.inlets[inletNumber].connections.length === 0) {
          // send a 0 then
          for (const c of input.outlets[0].connections) {
            const { destinationInlet, destination } = c;
            const value = (input.attributes.default as number) || 0;
            destination.receive(destinationInlet, value, input);
          }
        }
      }
    }

    if (
      (patch as SubPatch).patchType === OperatorContextType.ZEN &&
      (patch as SubPatch).parentPatch
    ) {
      console.log("checking for polycalls cuz were in ZEN and parentPatch exists", patch);
      const calls = patch
        .getAllNodes()
        .filter(
          (node) =>
            node.operatorContextType === OperatorContextType.ZEN &&
            (node.name === "call" ||
              node.name === "latchcall" ||
              node.name === "polycall" ||
              node.name === "polytrig"),
        );

      console.log("sending calls bc zen and has parent patch", calls);
      for (const call of calls) {
        if (call.name === "polytrig") {
          call.receive(call.inlets[0], "bang");
        } else {
          if (call.fn && call.inlets[0] && call.inlets[0].lastMessage !== undefined) {
            call.receive(call.inlets[0], call.inlets[0].lastMessage);
          }
        }
      }
    }
  }

  if (patch.storedStatement) {
    patch.compile(patch.storedStatement);
  }
};

export const mapReceive = (nodes: ObjectNode[], message: Message = "bang") => {
  for (const node of nodes) {
    if (node.fn) {
      node.receive(node.inlets[0], message);
    }
  }
};

const executeAndSend = (nodes: ObjectNode[], message: Message = "bang") => {
  for (const sourceNode of nodes) {
    if (sourceNode.fn) {
      const ret: Message[] = sourceNode.fn(message);
      for (let i = 0; i < ret.length; i++) {
        if (sourceNode.outlets[i]) {
          sourceNode.send(sourceNode.outlets[i], ret[i]);
        }
      }
    }
  }
};
