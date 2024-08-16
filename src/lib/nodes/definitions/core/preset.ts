import { doc } from './doc';
import { subscribe } from '@/lib/messaging/queue';
import { Node, ObjectNode, Message, Patch, SubPatch } from '../../types';

doc(
    'preset',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "preset system"
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
}

export type Preset = {
    [x: string]: StateChange;
}

export class PresetManager {
    objectNode: ObjectNode;
    presets: Preset[];
    serializedPresets?: SerializedPreset[];
    currentPreset: number;
    value: Message;

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
        let oldPreset = { ... this.presets[this.currentPreset] };
        this.currentPreset++;
        this.presets[this.currentPreset] = { ...oldPreset };
    }

    switchToPreset(presetNumber: number) {
        let old = this.presets[this.currentPreset];
        let preset = this.presets[presetNumber];
        if (Object.keys(old).length > 0 && Object.keys(preset).length === 0) {
            // old preset had a preset & new one is empty so lets copy it over
            this.presets[presetNumber] = {
                ...old
            };
            preset = this.presets[presetNumber];
        }
        if (preset) {
            this.currentPreset = presetNumber;
            for (let id in preset) {
                let { node, state } = preset[id];

                // lets assume all are simply SerializableCustom
                // except messages...
                if ((node as ObjectNode).custom) {
                    (node as ObjectNode).custom!.fromJSON(state);
                }
            }
        }
    }

    listen() {
        subscribe("statechanged", (stateChange: Message) => {
            let _stateChange = stateChange as StateChange;

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
            currentPreset: this.currentPreset
        };
    }

    fromJSON(x: any) {
        if (x.presets) {
            this.serializedPresets = x.presets;
        }
        if (x.currentPreset) {
            this.currentPreset = x.currentPreset;
        }
        console.log('preset from json', x, this);
    }

    hydrateSerializedPresets(allNodes: Node[]) {
        if (this.serializedPresets) {
            for (let i = 0; i < this.serializedPresets.length; i++) {
                let preset = this.serializedPresets[i];
                for (let id in preset) {
                    let { state } = preset[id];
                    let node = allNodes.find(x => x.id === id);
                    if (node) {
                        this.presets[i][id] = {
                            node,
                            state
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
            (object.custom as PresetManager).switchToPreset(x as number);
        }
        return [];
    };
};



const isPatchBelow = (a: Patch, b: Patch): boolean => {
    if (b === a) {
        return true;
    }

    while ((b as SubPatch).parentPatch) {
        if (b === a) {
            return true;
        }
        b = (b as SubPatch).parentPatch;
    }

    return false;
};
