import { SLOT_VIEW_HEIGHT, SLOT_VIEW_WIDTH } from "@/components/SlotView";
import {
  type AttributeValue,
  ConnectionType,
  type Message,
  type ObjectNode,
  type SerializedObjectNode,
} from "../../types";
import { doc } from "./doc";
import ObjectNodeImpl from "../../ObjectNode";
import { sleep } from "../../compilation/onCompile";
import { OperatorContextType } from "../../context";

doc("slots~", {
  description: "connect subpatches in series",
  numberOfInlets: 2,
  numberOfOutlets: 2,
  defaultValue: 0,
});

export type Slot = ObjectNode;

export const slots = (node: ObjectNode) => {
  node.needsLoad = true;

  node.newAttribute("size", (node.attributes.size as number) || 6);
  node.attributeCallbacks.size = (size) => {
    updateSlots(node, size as number);
    reconnect(node);
  };

  initializeSlots(node);
  initializeAudioNodes(node);
  compileSlots(node);

  return (message: Message) => handleMessage(node, message);
};

const initializeSlots = (node: ObjectNode) => {
  if (!node.slots) {
    node.slots = [];
    const size = node.attributes.size as number;
    for (let i = 0; i < size; i++) {
      node.slots.push(newPatch(node));
    }
  }

  if (!node.size) {
    node.size = {
      width: SLOT_VIEW_WIDTH,
      height: SLOT_VIEW_HEIGHT * 6,
    };
  }
};

const initializeAudioNodes = (node: ObjectNode) => {
  const ctxt = node.patch.audioContext;
  if (!node.audioNode) {
    node.audioNode = ctxt.createChannelMerger(2);
  }
  if (!node.merger) {
    node.merger = ctxt.createChannelMerger(2);
  }
};

const updateSlots = (node: ObjectNode, newSize: number) => {
  if (!node.slots) return;

  if (newSize > node.slots.length) {
    for (let i = node.slots.length; i < newSize; i++) {
      node.slots.push(newPatch(node));
    }
  } else if (newSize < node.slots.length) {
    node.slots = node.slots.slice(0, newSize);
  }
};

const reconnect = (node: ObjectNode) => {
  if (!node.slots) return;

  disconnectAllSlots(node);
  connectSlots(node);
  setupOutputs(node);
};

const disconnectAllSlots = (node: ObjectNode) => {
  for (const slot of node.slots!) {
    slot.disconnectAll();
    if (slot.audioNode) {
      slot.audioNode.disconnect();
    }
  }
};

const connectSlots = (node: ObjectNode) => {
  if (!node.slots) {
    return;
  }
  for (let i = 0; i < node.slots!.length - 1; i++) {
    const current = node.slots![i];
    const next = node.slots![i + 1];
    connectSlotPair(current, next);
  }

  connectInputs(node);
};

const connectInputs = (node: ObjectNode) => {
  if (!node.slots) return;
  const first: ObjectNode = node.slots[0];
  if (node.merger && first.merger) {
    node.merger.disconnect();
    const _splitter = node.patch.audioContext.createChannelSplitter(2);
    node.merger.connect(_splitter);
    _splitter.connect(first.merger, 0, 0);
    _splitter.connect(first.merger, 1, 1);
  }
}

const connectSlotPair = (current: ObjectNode, next: ObjectNode) => {
  for (let j = 0; j < current.outlets.length; j++) {
    if (next.inlets[j]) {
      current.connect(next, next.inlets[j], current.outlets[j], false);
    }
  }
};

const setupOutputs = (node: ObjectNode) => {
  const last = node.slots![node.slots!.length - 1];
  const splitter = node.patch.audioContext.createChannelSplitter(2);

  last.audioNode?.connect(splitter);
  if (node.audioNode) {
    splitter.connect(node.audioNode, 0, 0);
    splitter.connect(node.audioNode, 1, 1);
  } 

  last.outlets[0].callback = (message: Message) => {
    node.send(node.outlets[0], message);
  };
};

const handleMessage = (node: ObjectNode, message: Message) => {
  if (message === "bang") {
    compileSlots(node);
    return [];
  }
  if (message === "reconnect" && node.slots) {
    reconnect(node);
  } else if (node.slots && node.slots[0]) {
    node.slots[0].receive(node.slots[0].inlets[0], message);
  }
  return [];
};

const newPatch = (node: ObjectNode, patchType?: OperatorContextType): ObjectNode => {
  let wrapperNode: ObjectNode = new ObjectNodeImpl(node.patch);
  wrapperNode.parse("zen @type audio");
  if (wrapperNode.subpatch) {
    const subpatch = wrapperNode.subpatch;
    subpatch.isZen = false;
    let objectNode: ObjectNode = new ObjectNodeImpl(subpatch);
    subpatch.objectNodes.push(objectNode);
    if (patchType === OperatorContextType.AUDIO) {
      objectNode.parse("zen @type audio");
    } else {
      objectNode.parse("zen");
    }
    objectNode.setAttribute("slotview", true);
    if (objectNode.subpatch) {
      objectNode.subpatch.name = "";
      console.log("setting isInsideSlot", objectNode.subpatch, objectNode);
      objectNode.subpatch.isInsideSlot = true;
    }
    objectNode.parentSlots = node;
    return objectNode;
  }
  return wrapperNode;
};

export const deserializedSlots = async (node: ObjectNode, y: SerializedObjectNode[]) => {
  node.slots = y.map(serialized => {
    const _node = newPatch(node, serialized.subpatch?.patchType);
    _node.fromJSON(serialized);
    if (_node.subpatch && _node.subpatch.patchType !== OperatorContextType.ZEN) {
      _node.subpatch.isZen = false;
    }
    return _node;
  });
  await compileSlots(node);
};

const compileSlots = async (node: ObjectNode) => {
  if (!node.slots) return;

  for (let slot of node.slots) {
    if (slot.subpatch?.patchType === OperatorContextType.ZEN) {
      slot.subpatch?.recompileGraph();
    } else {
      slot.subpatch?.initialLoadCompile();
    }
  }

  await waitForCompilation(node.slots);

  for (const slot of node.slots) {
    slot.subpatch?.setupPostCompile(true);
  }

  node.receive(node.inlets[0], "reconnect");
  reconnectOutlets(node);
};

const waitForCompilation = async (slots: ObjectNode[]) => {
  let attempts = 0;
  while (slots.some((x) => !x.audioNode || x.subpatch?.skipRecompile)) {
    await sleep(50);
    if (++attempts > 150) break;
  }
  await sleep(200);
};

const reconnectOutlets = (node: ObjectNode) => {
  for (const outlet of node.outlets) {
    for (const connection of outlet.connections) {
      if (outlet.connectionType === ConnectionType.AUDIO) {
        node.disconnectAudioNode(connection);
        node.connectAudioNode(connection);
      }
    }
  }
};
