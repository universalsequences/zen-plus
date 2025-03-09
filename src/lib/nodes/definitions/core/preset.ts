import { doc } from "./doc";
import { subscribe } from "@/lib/messaging/queue";
import { Node, ObjectNode, Message, Patch, SubPatch, MessageNode } from "../../types";
import { compileVM } from "../../vm/forwardpass";
import { MockObjectNode } from "../../../../../test/mocks/MockObjectNode";
import { getRootPatch } from "../../traverse";
import ObjectNodeImpl from "../../ObjectNode";

doc("preset", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "preset system",
});

export interface StateChange {
  node: Node;
  state: any;
}

export interface SerializedStateChange {
  id: string;
  state: any;
}

export type SerializedPreset = {
  [x: string]: SerializedStateChange;
};

export type Preset = {
  [x: string]: StateChange;
};

export class PresetManager {
  objectNode: ObjectNode;
  presets: Preset[];
  serializedPresets?: SerializedPreset[];
  currentPreset: number;
  value: Message;
  switching = false;
  presetNodes?: Set<string>;
  sharedBuffer?: SharedArrayBuffer;
  buffer?: Uint8Array;
  hydrated = true;

  constructor(object: ObjectNode) {
    this.objectNode = object;

    this.presets = [];
    for (let i = 0; i < 64; i++) {
      this.presets[i] = {};
    }
    this.currentPreset = 0;
    this.value = 0;

    // use message passing
    this.listen();
    this.notifyVM();
  }

  notifyVM() {
    // register object in WorkerContext.ts (i.e. the main-thread)

    getRootPatch(this.objectNode.patch)?.registerNodes?.([this.objectNode], []);

    // register object in Worker itself, by sending a serialized version of itself there
    this.objectNode.updateWorkerState();

    setTimeout(() => {
      const objectNodes = this.objectNode.patch.getAllNodes();
      const messageNodes = this.objectNode.patch.getAllMessageNodes();
      const nodes = [...objectNodes, ...messageNodes];
      const nodeIds = nodes.map((x) => x.id);
      const nodeId = this.objectNode.id;
      this.objectNode.patch.sendWorkerMessage?.({
        type: "setPresetNodes",
        body: {
          nodeId,
          nodeIds,
        },
      });
    }, 100);

    // this occurs in the worker thread
    if (this.objectNode.onNewSharedBuffer) {
      // create the SharedArrayBuffer that will act as glue to UI
      const bytesPerElement = Uint8Array.BYTES_PER_ELEMENT;

      const size = 64;
      if (!this.sharedBuffer) {
        this.sharedBuffer = new SharedArrayBuffer(bytesPerElement * size);
        this.buffer = new Uint8Array(this.sharedBuffer);
        this.buffer[this.currentPreset] = 2;
      }
      this.objectNode.onNewSharedBuffer(this.sharedBuffer);
    }
  }

  newPreset() {
    let oldPreset = { ...this.presets[this.currentPreset] };
    this.currentPreset++;
    this.presets[this.currentPreset] = { ...oldPreset };
  }

  switchToPreset(presetNumber: number) {
    const oldPreset = this.currentPreset;
    if (oldPreset !== undefined && this.buffer) {
      const hadPresets = Object.keys(this.presets[oldPreset]).length > 0;
      this.buffer[oldPreset] = hadPresets ? 1 : 0;
      this.buffer[presetNumber] = 2;
    }
    this.switching = true;
    let old = this.presets[this.currentPreset];
    let preset = this.presets[presetNumber];
    if (Object.keys(old).length > 0 && Object.keys(preset).length === 0) {
      // old preset had a preset & new one is empty so lets copy it over
      this.presets[presetNumber] = {
        ...old,
      };
      preset = this.presets[presetNumber];
    }
    if (preset) {
      this.currentPreset = presetNumber;
      for (let id in preset) {
        let { node, state } = preset[id];

        const objectNode = node as ObjectNode;
        if (objectNode.custom) {
          if (
            (node as MessageNode | ObjectNode).attributes["scripting name"] !== "" ||
            (node as ObjectNode).name === "attrui"
          ) {
            // only nodes with scripting name or attrui
            // TODO
            objectNode.custom.fromJSON(state);

            try {
              objectNode.custom.execute?.(state);
            } catch (e) {
              // ignore error;
            }
          }
        } else {
          // todo -- handle other nodes other than number
          if (node.patch.vm) {
            try {
              const evaluation = node.patch.vm.evaluateNode(node.id, state);
              if (evaluation) {
                evaluation.replaceMessages.push({
                  messageId: node.id,
                  message: state,
                });
                node.patch.vm.sendEvaluationToMainThread?.(evaluation);
              }
            } catch (e) {
              // ignore error (if no instructions are found)
            }
          } else {
            node.receive(node.inlets[1], state);
            node.receive(node.inlets[0], "bang");
          }
        }
      }
    }
    this.switching = false;
  }

  listen() {
    subscribe("statechanged", (stateChange: Message) => {
      if (this.switching) {
        return;
      }
      let _stateChange = stateChange as StateChange;

      if (
        (_stateChange.node as MessageNode | ObjectNode).attributes["scripting name"] === "" &&
        (_stateChange.node as ObjectNode).name !== "attrui"
      ) {
        return;
      }

      // ensure that the preset is "above" the object emitting the message
      // in the patch hierarchy
      let nodeId = _stateChange.node.id;
      if (this.presetNodes?.has(nodeId)) {
        this.presets[this.currentPreset][_stateChange.node.id] = _stateChange;
        if (this.buffer && this.buffer[this.currentPreset] !== 2) {
          this.buffer[this.currentPreset] = 1;
        }
      }
    });
  }

  getJSON() {
    let p: SerializedPreset[] = [];
    for (let preset of this.presets) {
      let _p: SerializedPreset = {};
      for (let id in preset) {
        _p[id] = { id, state: preset[id].state };
      }
      p.push(_p);
    }
    const json = {
      presets: !this.hydrated ? this.serializedPresets || p : p,
      currentPreset: this.currentPreset,
    };
    return json;
  }

  fromJSON(x: any, force?: boolean) {
    if (x.presets) {
      this.serializedPresets = x.presets;
    }
    if (x.currentPreset) {
      this.currentPreset = x.currentPreset;
      if (this.buffer) {
        this.buffer[0] = 0;
        this.buffer[this.currentPreset] = 2;
      }
    }

    this.hydrated = false;
    if (this.objectNode instanceof ObjectNodeImpl && force) {
      const objects = this.objectNode.patch.getAllNodes();
      const messages = this.objectNode.patch.getAllMessageNodes();
      const allNodes = [...objects, ...messages];
      this.hydrateSerializedPresets(allNodes);
    }
  }

  hydrateSerializedPresets(allNodes: Node[]) {
    if (this.serializedPresets) {
      for (let i = 0; i < this.serializedPresets.length; i++) {
        let preset = this.serializedPresets[i];
        for (let id in preset) {
          let { state } = preset[id];
          let node = allNodes.find((x) => x.id === id);
          if (node) {
            this.presets[i][id] = {
              node,
              state,
            };

            if (this.buffer && this.buffer[i] !== 2) {
              this.buffer[i] = 1;
            } else {
            }
          } else {
          }
        }
      }
    }
    this.hydrated = true;
    this.objectNode.updateWorkerState();
  }

  deletePreset(presetNumber: number) {
    this.presets[presetNumber] = {};
    if (this.buffer) {
      this.buffer[presetNumber] = 0;
    }
  }

  execute() {}
}

export const preset = (object: ObjectNode) => {
  object.isResizable = true;
  if (!object.custom) {
    object.custom = new PresetManager(object);
  }
  return (x: Message) => {
    const mgmt = object.custom as PresetManager;
    if (mgmt) {
      if (typeof x === "number") {
        mgmt.switchToPreset(Math.round(x as number));
        if (object.onNewValue) {
          object.onNewValue(mgmt.currentPreset);
        }
      } else if (Array.isArray(x) && x[0] === "delete") {
        for (let i = 1; i < x.length; i++) {
          mgmt.deletePreset(i);
        }
      }
    }
    return [];
  };
};
