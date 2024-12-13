import {
  ConnectionType,
  type Lazy,
  type Message,
  type ObjectNode,
  type NodeFunction,
} from "../../types";
import { loop, loopVariable } from "./loop";
import { z_click } from "./click";
import { PatchImpl } from "@/lib/nodes/Patch";
import { membraneAPI } from "./physical-modeling/membrane";
import { zen_simdDotSum, zen_simdDot, zen_simdMatSum } from "./simd";
import { gate } from "./gate";
import { condMessage, message } from "./message";
import { toConnectionType, type API, OperatorContextType } from "@/lib/nodes/context";
import { functions } from "./functions";
import type { Statement, Operator, CompoundOperator } from "./types";
import { doc } from "./doc";
import { zen_history } from "./history";
import { math } from "./math";
import { zen_delay } from "./delay";
import { filters } from "./filters";
import { core } from "./core";
import { data_index } from "./data";
import SubpatchImpl from "../../Subpatch";
import type { AttributeValue, SubPatch } from "../../types";

doc("out", {
  description: "output of patch",
  numberOfInlets: 3,
  numberOfOutlets: 0,
});

const out: NodeFunction = (_node: ObjectNode, ...args: Lazy[]) => {
  const parentNode = (_node.patch as SubPatch).parentNode;
  const patchType = (_node.patch as SubPatch).patchType;
  const isAudio = patchType === OperatorContextType.AUDIO;
  if (parentNode) {
    const outputNumber = args[0]() as number;
    const name: string | undefined = args[1] ? (args[1]() as string) : undefined;

    while (parentNode && parentNode.outlets.length < outputNumber) {
      parentNode.newOutlet(
        undefined,
        isAudio || parentNode.audioNode ? ConnectionType.AUDIO : undefined,
      );
    }
    if (isAudio) {
      for (let i = 0; i < parentNode.outlets.length; i++) {
        parentNode.outlets[i].connectionType = ConnectionType.AUDIO;
      }
    }
    if (parentNode.outlets[outputNumber - 1]) {
      parentNode.outlets[outputNumber - 1].name = name;
    }
  }
  _node.attributeOptions.io = [
    "trig",
    "velocity",
    "duration",
    "gate",
    "control",
    "audio",
    "ramp",
    "other",
  ];
  if (!_node.attributes.io) {
    _node.attributes.io = isAudio ? "audio" : "other";
  }

  if (isAudio && !_node.audioNode) {
    // need to create an audio node that connects to speakers
    let ctxt = _node.patch.audioContext;
    let gain = ctxt.createGain();
    gain.gain.value = 1;
    _node.audioNode = gain;

    //gain.connect(ctxt.destination);

    let patchAudio = (_node.patch as SubPatch).parentNode.audioNode;
    if (patchAudio) {
      let outputNumber = args[0]() as number;
      gain.connect(patchAudio, 0, outputNumber - 1);
    }

    // connect this out of the patch...
  }

  if (isAudio) {
    _node.inlets[0].connectionType = ConnectionType.AUDIO;
  }

  return (message: Message) => {
    const outputNumber = args[0]() as number;

    let _parentNode = (_node.patch as SubPatch).parentNode;
    let patchType = (_node.patch as SubPatch).patchType;
    if (patchType !== OperatorContextType.ZEN && patchType !== OperatorContextType.GL) {
      let outlet = _parentNode.outlets[outputNumber - 1];
      _parentNode.send(outlet, message);
      if (outlet && outlet.callback) {
        outlet.callback(message);
      }

      return [];
    }
    if (
      ((typeof message === "string" || typeof message === "object") && !Array.isArray(message)) ||
      (Array.isArray(message) && !(message as Statement).node)
    ) {
      if ((message as Statement).node) {
      } else {
        let outlet = _parentNode.outlets[outputNumber - 1];
        _parentNode.send(_parentNode.outlets[outputNumber - 1], message);
        if (outlet && outlet.callback) {
          outlet.callback(message);
        }
        return [];
      }
    }

    let outMessage: Statement = [
      {
        name: "output",
        outputNumber: outputNumber - 1,
      },
      message as Statement,
    ];

    // whether this is in a subpatch (zen object) or main patch, we
    // simply tell the patcher to "compile" at this outputnumber
    // in the subpatch case, that will handle piping it out of the patch
    // in the base patch, it will kick off the ZEN compilation
    if (
      !_node.patch.isZenBase() ||
      (_node.patch as SubPatch).patchType !== OperatorContextType.ZEN
    ) {
      _node.patch.compile(message as Statement, outputNumber);
    } else {
      _node.patch.compile(outMessage as Statement, outputNumber);
    }
    return [];
  };
};

doc("in", {
  description: "output of patch",
  numberOfInlets: 3,
  numberOfOutlets: 1,
});

const input: NodeFunction = (node: ObjectNode, ...args: Lazy[]) => {
  let inputNumber = args[0]() as number;
  let subpatch = node.patch as SubPatch;
  let parentNode = (node.patch as SubPatch).parentNode;
  if (!parentNode) {
    return () => [];
  }
  let isCore = node.attributes["type"] === "core";
  let patchType = (node.patch as SubPatch).patchType;
  let isAudio = patchType === OperatorContextType.AUDIO;

  while (parentNode && parentNode.inlets.length < inputNumber) {
    parentNode.newInlet();
  }
  if (isCore) {
    parentNode.inlets[inputNumber - 1].connectionType = ConnectionType.CORE;
  }
  if (isAudio) {
    for (let i = 0; i < parentNode.inlets.length; i++) {
      parentNode.inlets[i].connectionType = ConnectionType.AUDIO;
    }
  }
  node.attributeOptions["type"] = ["core", "audio", "zen", "gl"];
  node.attributeOptions["io"] = [
    "trig",
    "velocity",
    "duration",
    "gate",
    "control",
    "audio",
    "ramp",
    "event",
    "time",
    "other",
  ];

  if (!node.attributes.io) {
    node.attributes.io = "other";
  }

  let name: string | undefined = args[1] ? (args[1]() as string) : undefined;
  parentNode.inlets[inputNumber - 1].name = name;
  if (!subpatch.parentPatch.isZen) {
    node.needsLoad = true;
  }
  parentNode.inlets[inputNumber - 1].node = node;

  if (isAudio && !node.audioNode) {
    // need to create an audio node that connects to speakers
    let ctxt = node.patch.audioContext;
    let gain = ctxt.createGain();
    gain.gain.value = 1;
    node.audioNode = gain;

    //gain.connect(ctxt.destination);

    let patchAudio = (node.patch as SubPatch).parentNode.merger;
    if (patchAudio) {
      let outputNumber = args[0]() as number;
      let splitter = ctxt.createChannelSplitter(16);
      patchAudio.connect(splitter);
      splitter.connect(gain, inputNumber - 1, 0);
    }
    // connect this out of the patch...
  }

  if (isAudio) {
    node.outlets[0].connectionType = ConnectionType.AUDIO;
  }

  return (message: Message) => {
    if (!subpatch.parentPatch.isZen && subpatch.patchType === OperatorContextType.ZEN) {
      if (node.attributes["type"] === "core") {
        return [];
      }
      let statement: Statement = [
        { name: "input", value: (args[0]() as number) - 1 } as CompoundOperator,
      ];
      let ogType = statement.type;
      if (node.attributes["min"] !== undefined) {
        statement = ["max" as Operator, node.attributes["min"] as number, statement];
      }
      if (node.attributes["max"] !== undefined) {
        statement = ["min" as Operator, node.attributes["max"] as number, statement];
      }
      statement.type = ogType;
      statement.node = node;
      return [statement];
    }
    return [];
  };
};

doc("zen", {
  description: "creates a new subpatch",
  numberOfInlets: 1,
  numberOfOutlets: 1,
  aliases: ["p"],
  attributeOptions: {
    type: ["zen", "gl"],
    target: ["C", "JS"],
    moduleType: ["sequencer", "generator", "effect", "other"],
  },
});

const zen: NodeFunction = (node: ObjectNode, ...args: Lazy[]) => {
  let noType = false;
  if (!node.attributes.type) {
    noType = true;
    node.attributes.type = "zen";
  }

  if (!node.attributes.target) {
    node.attributes.target = "JS";
    node.attributeOptions.target = ["C", "JS"];
  }
  node.attributeCallbacks.target = (opt: AttributeValue) => {
    if (node.subpatch?.isZenBase()) {
      node.subpatch?.recompileGraph();
    }
  };
  node.attributeCallbacks.SIMD = (opt: AttributeValue) => {
    if (node.subpatch?.isZenBase()) {
      node.subpatch?.recompileGraph();
    }
  };

  if (!node.attributes.SIMD) {
    node.attributes.SIMD = false;
  }

  const subpatch = node.subpatch || new SubpatchImpl(node.patch, node);
  node.subpatch = subpatch;
  subpatch.clearState();
  if (!node.attributes["moduleType"]) {
    node.attributes["moduleType"] = "other";
  }
  if (!node.attributes["slotview"]) {
    node.attributes["slotview"] = false;
  }
  if (noType) {
    node.attributeCallbacks["type"] = (type) => {
      if (type === "gl") {
        node.operatorContextType = OperatorContextType.GL;
        subpatch.patchType = OperatorContextType.GL;
      } else if (type === "core") {
        node.operatorContextType = OperatorContextType.CORE;
        subpatch.patchType = OperatorContextType.CORE;
      } else if (type === "audio") {
        node.operatorContextType = OperatorContextType.AUDIO;
        subpatch.patchType = OperatorContextType.AUDIO;
      } else {
        node.operatorContextType = OperatorContextType.ZEN;
        subpatch.patchType = OperatorContextType.ZEN;
      }
      let _type = subpatch.patchType;
      for (let inlet of node.inlets) {
        inlet.connectionType = toConnectionType(_type);
      }
      for (let outlet of node.outlets) {
        outlet.connectionType = toConnectionType(_type);
      }
    };
  }

  node.attributeOptions = {
    moduleType: ["sequencer", "generator", "effect", "other"],
    target: ["JS", "C"],
    type: ["zen", "gl", "core", "audio"],
  };

  return (message: Message) => {
    return [];
  };
};

export const api: API = {
  ...math,
  ...filters,
  ...functions,
  ...core,
  ...data_index,
  in: input,
  zen: zen,
  delay: zen_delay,
  out: out,
  gate,
  history: zen_history,
  message,
  condMessage,
  click: z_click,
  loopVariable,
  loop,
  simdMatSum: zen_simdMatSum,
  simdDotSum: zen_simdDotSum,
  simdDot: zen_simdDot,
  ...membraneAPI,
};
