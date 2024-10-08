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
import Subpatch from "../../Subpatch";
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

  // note: what the fuck is a "hijack" lol.
  const getHijacks = (x: AttributeValue) => {
    const nums = Array.isArray(x)
      ? x
      : typeof x === "string"
        ? x.split(",").map((x) => Number.parseInt(x))
        : typeof x === "number"
          ? [x]
          : [];
    return nums;
  };

  const handleHijack = (x: AttributeValue) => {
    const nums = getHijacks(x);
    for (let i = node.outlets.length; i < 2 + nums.length; i++) {
      node.newOutlet(`slot #${nums[i - 2]} messages`, ConnectionType.CORE);
    }
  };

  if (node.attributes.hijack !== undefined) {
    handleHijack(node.attributes.hijack as AttributeValue);
  }

  node.newAttribute("hijack", "", (x: AttributeValue) => {
    handleHijack(x);
    reconnect();
  });

  node.newAttribute("size", (node.attributes.size as number) || 6);
  node.attributeCallbacks.size = (size) => {
    if (node.slots) {
      const _size = size as number;
      if (_size > node.slots.length) {
        for (let i = node.slots.length; i < _size; i++) {
          node.slots.push(newPatch(node));
        }
      } else if (_size < node.slots.length) {
        node.slots = node.slots.slice(0, _size);
      }
    }
    reconnect();
  };

  if (!node.slots) {
    node.slots = [];
    for (let i = 0; i < (node.attributes.size! as number); i++) {
      node.slots.push(newPatch(node));
    }
  }

  if (!node.size) {
    node.size = {
      width: SLOT_VIEW_WIDTH,
      height: SLOT_VIEW_HEIGHT * 6,
    };
  }

  const ctxt = node.patch.audioContext;
  if (!node.audioNode) {
    // need to create an audio node that connects to speakers
    const splitter = ctxt.createChannelMerger(2);
    node.audioNode = splitter; //node.patch.audioContext.destination;
  }

  if (!node.merger) {
    const merger = ctxt.createChannelMerger(2);
    node.merger = merger;
  }

  const splitter = node.patch.audioContext.createChannelSplitter(2);

  let counter = 0;

  const reconnect = () => {
    if (!node.slots) {
      return;
    }
    // then we need to connect each slot
    for (const slot of node.slots) {
      slot.disconnectAll();
    }

    for (const slot of node.slots) {
      if (slot.audioNode) {
        slot.audioNode.disconnect();
      }
    }

    for (let i = 0; i < node.slots.length - 1; i++) {
      const a = node.slots[i];
      const b = node.slots[i + 1];

      for (let j = 0; j < a.outlets.length; j++) {
        if (b.inlets[j]) {
          if (
            true ||
            !(a.audioNode as ChannelMergerNode)?.channelCount ||
            (a.audioNode as ChannelMergerNode)?.channelCount >= j + 1
          ) {
            if ((b.merger as ChannelMergerNode)?.numberOfInputs < j + 1) {
              continue;
            }
            a.connect(b, b.inlets[j], a.outlets[j], false);
          } else {
          }
        }
      }
    }
    const last: ObjectNode = node.slots[node.slots.length - 1];
    last.audioNode?.connect(splitter); //(node.audioNode!);
    if (node.audioNode) {
      splitter.connect(node.audioNode, 0, 0);
      splitter.connect(node.audioNode, 1, 1);
    }

    const first: ObjectNode = node.slots[0];
    if (node.merger && first.merger) {
      node.merger.disconnect();
      const _splitter = node.patch.audioContext.createChannelSplitter(2);
      node.merger.connect(_splitter);
      _splitter.connect(first.merger, 0, 0);
      _splitter.connect(first.merger, 1, 1);
      // first.merger.connect(node.patch.audioContext.destination);
    }

    last.outlets[0].callback = (message: Message) => {
      node.send(node.outlets[0], message);
    };

    const hijacks = getHijacks(node.attributes.hijack as AttributeValue);
    let i = 0;
    for (let hijack of hijacks) {
      let _i = i;
      if (node.slots[hijack]) {
        node.slots[hijack].outlets[0].callback = (message: Message) => {
          node.send(node.outlets[_i + 2], message);
        };
      }
      i++;
    }

    // hijack any hijacking

    // we want all messages coming out of the "last" slot to be piped thru
    // the inlets

    if (node.onNewValue) {
      node.onNewValue(counter++);
    }
  };

  reconnect();

  return (_message: Message) => {
    if (_message === "bang") {
      compileSlots(node);
      return [];
    }
    if (_message === "reconnect" && node.slots) {
      reconnect();
    } else {
      // pipe this message to first
      if (node.slots && node.slots[0]) {
        node.slots[0].receive(node.slots[0].inlets[0], _message);
      }
    }
    return [];
  };
};

const newPatch = (node: ObjectNode): ObjectNode => {
  let fakeNode: ObjectNode = new ObjectNodeImpl(node.patch);
  fakeNode.parse("zen @type audio");
  if (fakeNode.subpatch) {
    //const subpatch = new Subpatch(node.patch, node);
    const subpatch = fakeNode.subpatch;
    subpatch.isZen = false;
    let objectNode: ObjectNode = new ObjectNodeImpl(subpatch);
    subpatch.objectNodes.push(objectNode);
    objectNode.parse("zen");
    objectNode.setAttribute("slotview", true);
    if (objectNode.subpatch) {
      objectNode.subpatch.name = "";
      objectNode.subpatch.isInsideSlot = true;
    }
    objectNode.parentSlots = node;
    return objectNode;
  }
  return fakeNode;
};

export const deserializedSlots = async (node: ObjectNode, y: SerializedObjectNode[]) => {
  const slots: Slot[] = [];
  for (const serialized of y) {
    const _node = newPatch(node);
    _node.fromJSON(serialized);
    if (_node.subpatch?.patchType !== OperatorContextType.ZEN) {
      if (_node.subpatch) _node.subpatch.isZen = false;
    }
    slots.push(_node);
  }
  node.slots = slots;
  await compileSlots(node);
};

const compileSlots = async (node: ObjectNode) => {
  let slots = node.slots;
  if (!slots) {
    return;
  }
  for (let slot of slots) {
    if (slot.subpatch?.patchType === OperatorContextType.ZEN) {
      slot.subpatch?.recompileGraph();
    } else {
      slot.subpatch?.initialLoadCompile();
    }
  }

  let i = 0;
  while (slots.some((x) => !x.audioNode || x.subpatch?.skipRecompile)) {
    await sleep(50);
    i++;
    if (i > 150) {
      // max wwait time of 500 ms
      break;
    }
  }

  await sleep(200);

  for (const slot of slots) {
    slot.subpatch?.setupPostCompile(true);
  }
  // wait for completion
  node.receive(node.inlets[0], "reconnect");

  // reconnect each of the connections out from the slots node
  for (const outlet of node.outlets) {
    for (const connection of outlet.connections) {
      if (outlet.connectionType === ConnectionType.AUDIO) {
        node.disconnectAudioNode(connection);
        node.connectAudioNode(connection);
      }
    }
  }
};
