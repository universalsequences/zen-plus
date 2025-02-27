import { doc } from "./doc";
import type {
  SignalOption,
  ObjectNode,
  IO,
  Message,
  Lazy,
  SubPatch,
  ModuleType,
} from "../../types";
import { publish, subscribe, unsubscribe } from "@/lib/messaging/queue";

doc("send~", {
  inletNames: ["signal", "name"],
  numberOfInlets: 2,
  aliases: ["s~"],
  numberOfOutlets: 0,
  description: "publishes signal to registry",
});

export const send = (node: ObjectNode, name: Lazy) => {
  // this is a node that has a name
  // any "receives" can simply look for this name in the graph and find it

  if (!node.audioNode && node.patch.audioContext) {
    const gainNode = node.patch.audioContext.createGain();
    node.audioNode = gainNode;
    gainNode.gain.value = 1;
  }
  publish("send~", name());
  return (message: Message) => {
    return [];
  };
};

doc("receive~", {
  inletNames: ["none", "name", "number (optional)"],
  numberOfInlets: 3,
  numberOfOutlets: 1,
  aliases: ["r~"],
  defaultValue: "",
  description: "publishes signal to registry",
});

export const receive = (node: ObjectNode, name: Lazy, num: Lazy) => {
  node.needsLoad = true;

  let oldNum: string | number | undefined = num() as number;
  let oldNodes: AudioNode[] = [];
  let oldName: string | undefined;

  const findSends = (name: string, num: number | null): AudioNode[] => {
    let patch = node.patch;
    while ((patch as SubPatch).parentPatch) {
      patch = (patch as SubPatch).parentPatch;
    }

    // find all publishPatchSignal nodes... and find the write one
    const allNodes = patch.getAllNodes();

    const patchPublisher = allNodes.find(
      (x) => x.name === "publishPatchSignals" && x.arguments[2] === name,
    );

    if (patchPublisher?.audioNode) {
      return [patchPublisher.audioNode];
    }

    return allNodes
      .filter((x) => x.name === "send~" && x.arguments[0] === name)
      .map((x) => x.audioNode as AudioNode);
  };

  const init = () => {
    const _name = name();

    // need some sort of "publish message" when a new publish is received so it can re=look for connections

    if (!node.audioNode) {
      const gainNode = node.patch.audioContext!.createGain();
      node.audioNode = gainNode;
      gainNode.gain.value = 1;
    }

    oldName = _name as string;
    oldNodes = [];
    if (node.merger && oldNum !== undefined) {
      if (oldNum !== undefined) {
        let _num = num() as number;
        node.merger.disconnect(node.audioNode, oldNum as number);
      } else {
        node.merger.disconnect(node.audioNode);
      }
      node.merger = undefined;
    }

    if (node.merger && oldNum === undefined) {
      node.merger.disconnect(node.audioNode);
    }

    if (_name) {
      const _nodes = findSends(_name as string, num() === "" ? null : (num() as number));

      oldNodes = _nodes;
      for (const _node of _nodes) {
        node.merger = _node;
        if (num() !== "") {
          _node.connect(node.audioNode, num() as number);
          oldNum = num() as number;
        } else {
          _node.connect(node.audioNode);
          oldNum = undefined;
        }
      }
    }
  };

  subscribe("send~", init);

  let oldId = node.id;
  subscribe("send." + node.id, init);

  init();

  return (_message: Message) => {
    init();
    /*
        let _name = name();
        if (_name !== oldName || oldNum !== num()) {
            // switch
            if (oldNode && node.audioNode) {
                if (oldNum !== "") {
                    oldNode.disconnect(node.audioNode, oldNum as number);
                } else {
                    oldNode.disconnect(node.audioNode);
                }
            }
            oldNum = num() as string | number;
            let n = num() === "" ? null : num() as number;
            oldNode = findSend(_name as string, n);
            if (oldNode && node.audioNode) {
                if (num() !== "") {
                    oldNode.connect(node.audioNode, num() as number);
                } else {
                    oldNode.connect(node.audioNode);
                }
            }
            oldName = _name;

        }
        */
    return [];
  };
};

// publish patch signals...
// publishPatch sequencer trig drumTrig -> publish the sequencer module in the channels trig outputs
// publishes them as drumTrig1/2/3/4 etc "name" + "number", loooking at the sequencer trig outputs and publishes them one by one

doc("publishPatchSignals", {
  inletNames: ["none", "moduleType", "io", "name"],
  numberOfInlets: 4,
  numberOfOutlets: 0,
  description: "publishes signal to registry",
});
export const publishPatchSignals = (
  objectNode: ObjectNode,
  moduleType: Lazy,
  io: Lazy,
  name: Lazy,
) => {
  // look thru the patch signals

  const init = () => {
    for (let node of objectNode.patch.objectNodes) {
      if (node.subpatch && node.attributes.moduleType === moduleType()) {
        let outputNumbers: number[] = [];
        let signalOptions: SignalOption[] = [];
        let c = 0;
        for (let _node of node.subpatch.objectNodes) {
          if (_node.name === "out" && _node.attributes.io === io()) {
            let outputNumber = (_node.arguments[0] as number) - 1;
            outputNumbers.push(outputNumber);
            signalOptions.push({
              io: io() as IO,
              node: node,
              name: name() as string,
              outlet: node.outlets[outputNumber],
              moduleType: moduleType() as ModuleType,
              signalNumber: c++,
              moduleName: node.subpatch.name,
            });
            // should this handle it here...
            // what does it mean to publish it?
            // 1.create a merger and connect these to here
          }
        }
        objectNode.signalOptions = signalOptions;
        let outputs = outputNumbers.length;
        let merger = objectNode.patch.audioContext!.createChannelMerger(outputs);
        let mergeSplitter = objectNode.patch.audioContext!.createChannelSplitter(outputs);
        merger.connect(mergeSplitter);
        objectNode.audioNode = mergeSplitter;
        let i = 0;
        if (node.audioNode) {
          let splitter = node.patch.audioContext!.createChannelSplitter(
            node.audioNode.channelCount,
          );
          node.audioNode.connect(splitter);
          for (let outputNumber of outputNumbers) {
            splitter.connect(merger, outputNumber, i);
            i++;
          }
        }

        // so were left with a "merger" that has all the subpatch tagged outputs piped into it, ordered
        // thus when we get a "receive~ drumTrig 1" it will connect the 1st channel of that merger to there
      }
    }
    publish("send~", name());
  };

  init();

  return () => {
    init();
    return [];
  };
};
