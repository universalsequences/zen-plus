import { ZenWorklet } from "@/lib/zen/worklet";
import { ConnectionType, ObjectNode, Patch, SubPatch } from "../types";
import { ZenGraph, initMemory } from "@/lib/zen";
import { PatchImpl } from "../Patch";
import { getRootPatch } from "../traverse";
import { mapReceive } from "./recompileGraph";
import { bangModSelectors } from "../definitions/core/modselector";
import { setupMCNode } from "./mc";

export const onZenCompilation = (ret: ZenWorklet, patch: PatchImpl, zenGraph: ZenGraph) => {
  patch.audioNode = ret.workletNode;
  const worklet = ret.workletNode;
  if (ret.wasm) {
    patch.wasmCode = ret.wasm;
  }
  if ((patch as Patch as SubPatch).parentPatch?.isInsideSlot) {
    (patch as Patch as SubPatch).parentPatch.isCompiling = false;
  }

  patch.workletCode = ret.code;

  const parentNode = (patch as Patch as SubPatch).parentNode;

  if (!parentNode) {
    throw new Error("no parent node in subpatch");
  }

  ret.workletNode.port.onmessage = (e) => {
    if (e.data.type === "wasm-ready") {
      initMemory(zenGraph.context, worklet);
      worklet.port.postMessage({ type: "ready" });
      patch.skipRecompile = false;
      return;
    }

    /*
    // Send messages using the optimized format for better performance
    parentNode.send(parentNode.outlets[0], {
      type: e.data.type,
      subType: e.data.subType,
      data: e.data.body,
    });
    */
  };

  const root = getRootPatch(patch);
  root.sendWorkerMessage?.(
    {
      type: "shareMessagePort",
      port: ret.messageChannel.port2,
      nodeId: parentNode?.id,
    },
    [ret.messageChannel.port2],
  );

  patch.disconnectGraph();

  if (parentNode.attributes.mc) {
    // we are a multi-channel node
    setupMCNode(parentNode);
  }

  // take the outputs from the generated zen audio worklet, and map to a channel merger node
  // this allows us to then connect this "objectNode" to other "audio/zen" nodes
  const merger = patch.audioContext?.createChannelMerger(zenGraph.numberOfInputs);

  console.log("number of inputs=", zenGraph.numberOfInputs, zenGraph, parentNode, patch.audioNode);

  // note: for mc nodes this is unchanged ^^
  // upon connecting two nodes we will "do the right thing"

  parentNode.merger = merger;
  merger?.connect(ret.workletNode);

  for (let i = 0; i < parentNode.outlets.length; i++) {
    parentNode.outlets[i].connectionType = ConnectionType.AUDIO;
  }

  patch.worklets.push({
    workletNode: ret.workletNode,
    graph: zenGraph,
    merger: merger,
  });

  parentNode.useAudioNode(patch.audioNode);

  parentNode.setAttribute("messageRate", (parentNode.attributes.messageRate as number) || 32);

  if (!patch.silentGain) {
    patch.silentGain = patch.audioContext.createGain();
    patch.silentGain.gain.value = 0;
    patch.silentGain.connect(patch.audioContext.destination);
  }

  patch.audioNode.connect(patch.silentGain);
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

  patch.skipRecompile = false;

  if (parentNode) {
    handlePublishers(parentNode);
  }

  bangModSelectors(patch);

  /*
          patch.zenCode = printAndMinify(statement);
          if (patch.setZenCode) {
            console.log('setting zen code=', patch.zenCode);
            patch.setZenCode(patch.zenCode);
          }
          */
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
