import { doc } from "./doc";
import { subscribe } from "@/lib/messaging/queue";
import { Node, ObjectNode, Message, Patch, SubPatch, MessageNode } from "../../types";

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
  }

  newPreset() {
    let oldPreset = { ...this.presets[this.currentPreset] };
    this.currentPreset++;
    this.presets[this.currentPreset] = { ...oldPreset };
  }

  switchToPreset(presetNumber: number) {
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

        if ((node as ObjectNode).custom) {
          if (
            (node as MessageNode | ObjectNode).attributes["scripting name"] !== "" ||
            (node as ObjectNode).name === "attrui"
          ) {
            // only nodes with scripting name or attrui
            (node as ObjectNode).custom!.fromJSON(state);
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

      if ((_stateChange.node as MessageNode | ObjectNode).attributes["scripting name"] === "") {
        return;
      }

      // ensure that the preset is "above" the object emitting the message
      // in the patch hierarchy
      let stateChangePatch = _stateChange.node.patch;
      let presetPatch = this.objectNode.patch;
      if (isPatchBelow(presetPatch, stateChangePatch)) {
        this.presets[this.currentPreset][_stateChange.node.id] = _stateChange;
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
    return {
      presets: p,
      currentPreset: this.currentPreset,
    };
  }

  fromJSON(x: any) {
    if (x.presets) {
      this.serializedPresets = x.presets;
    }
    if (x.currentPreset) {
      this.currentPreset = x.currentPreset;
    }
    console.log("preset from json", x, this);
  }

  hydrateSerializedPresets(allNodes: Node[]) {
    if (this.serializedPresets) {
      for (let i = 0; i < this.serializedPresets.length; i++) {
        let preset = this.serializedPresets[i];
        for (let id in preset) {
          let { state } = preset[id];
          let presetPatch = this.objectNode.patch;
          let node = allNodes.find((x) => isPatchBelow(presetPatch, x.patch) && x.id === id);
          if (node) {
            this.presets[i][id] = {
              node,
              state,
            };
          }
        }
      }
    }
  }
}

export const preset = (object: ObjectNode) => {
  object.isResizable = true;
  if (!object.custom) {
    object.custom = new PresetManager(object);
  }
  return (x: Message) => {
    if (typeof x === "number" && object.custom) {
      const mgmt = object.custom as PresetManager;
      mgmt.switchToPreset(Math.round(x as number));
      if (object.onNewValue) {
        object.onNewValue(mgmt.currentPreset);
      }
    }
    return [];
  };
};

const cache: { [x: string]: boolean } = {};
/**
 * returns true if b is a descendent of a (or in the same patch)
 * */
const isPatchBelow = (a: Patch, b: Patch): boolean => {
  const key = `${a.id}.${b.id}`;
  if (cache[key]) {
    return cache[key];
  }
  if (b === a) {
    cache[key] = true;
    return true;
  }

  while ((b as SubPatch).parentPatch) {
    if (b === a) {
      cache[key] = true;
      return true;
    }
    b = (b as SubPatch).parentPatch;
  }

  cache[key] = false;
  return false;
};
