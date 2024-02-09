import { ConnectionType, Lazy, Message, ObjectNode, NodeFunction } from '../../types';
import { loop, loopVariable } from './loop';
import { z_click } from './click';
import { PatchImpl } from '@/lib/nodes/Patch';
import { membraneAPI } from './physical-modeling/membrane';
import { gate } from './gate';
import { condMessage, message } from './message';
import { toConnectionType, API, OperatorContextType } from '@/lib/nodes/context';
import { functions } from './functions';
import { Statement, Operator, CompoundOperator } from './types';
import { doc } from './doc';
import { zen_history } from './history';
import { math } from './math';
import { zen_delay } from './delay';
import { filters } from './filters';
import { core } from './core';
import { data_index } from './data';
import SubpatchImpl from '../../Subpatch';
import { SubPatch } from '../../types';


doc(
    'out',
    {
        description: "output of patch",
        numberOfInlets: 3,
        numberOfOutlets: 0,
    });

const out: NodeFunction = (_node: ObjectNode, ...args: Lazy[]) => {

    let parentNode = (_node.patch as SubPatch).parentNode;
    if (parentNode) {
        let outputNumber = args[0]() as number;
        let name: string | undefined = args[1] ? args[1]() as string : undefined;

        while (parentNode && parentNode.outlets.length < outputNumber) {
            parentNode.newOutlet();
        }
        parentNode.outlets[outputNumber - 1].name = name;
    }

    return (message: Message) => {
        let outputNumber = args[0]() as number;

        let outMessage: Statement = [
            {
                name: "output", outputNumber: outputNumber - 1
            },
            message as Statement
        ];

        // whether this is in a subpatch (zen object) or main patch, we
        // simply tell the patcher to "compile" at this outputnumber
        // in the subpatch case, that will handle piping it out of the patch
        // in the base patch, it will kick off the ZEN compilation
        if (!_node.patch.isZenBase() || (_node.patch as SubPatch).patchType !== OperatorContextType.ZEN) {
            _node.patch.compile(message as Statement, outputNumber);
        } else {
            _node.patch.compile(outMessage as Statement, outputNumber);
        }
        return [];
    };
};


doc(
    'in',
    {
        description: "output of patch",
        numberOfInlets: 3,
        numberOfOutlets: 1,
    });

const input: NodeFunction = (node: ObjectNode, ...args: Lazy[]) => {
    let inputNumber = args[0]() as number;
    let subpatch = (node.patch as SubPatch);
    let parentNode = (node.patch as SubPatch).parentNode;
    let isCore = node.attributes["type"] === "core";
    while (parentNode && parentNode.inlets.length < inputNumber) {
        console.log('doin');
        parentNode.newInlet();
    }
    if (isCore) {
        console.log("Is core");
        parentNode.inlets[inputNumber - 1].connectionType = ConnectionType.CORE;
        console.log("CORE = ", parentNode.inlets[inputNumber - 1].connectionType);
    }
    node.attributeOptions["type"] = ["core", "audio", "zen", "gl"];
    let name: string | undefined = args[1] ? args[1]() as string : undefined;
    parentNode.inlets[inputNumber - 1].name = name;
    if (!subpatch.parentPatch.isZen) {
        node.needsLoad = true;
    }
    console.log('inputNumber=%s', inputNumber - 1, parentNode.inlets[inputNumber - 1].connectionType, parentNode.inlets);
    parentNode.inlets[inputNumber - 1].node = node;

    return (message: Message) => {
        if (!subpatch.parentPatch.isZen && subpatch.patchType === OperatorContextType.ZEN) {
            if (node.attributes["type"] === "core") {
                return [];
            }
            console.log("patch type was zen...");
            let statement: Statement = [{ name: "input", value: (args[0]() as number) - 1 } as CompoundOperator];
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


doc(
    'zen',
    {
        description: "subpatch of patch",
        numberOfInlets: 1,
        numberOfOutlets: 1,
        attributeOptions: { type: ["zen", "gl"] }
    });

const zen: NodeFunction = (node: ObjectNode, ...args: Lazy[]) => {
    let subpatch = node.subpatch || (new SubpatchImpl(node.patch, node));
    node.subpatch = subpatch;
    subpatch.clearState();
    if (!node.attributes["type"]) {
        node.attributes["type"] = "zen";
        node.attributeCallbacks["type"] = (type) => {
            console.log('type changed =', type);
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
        "type": ["zen", "gl", "core", "audio"]
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
    'in': input,
    'zen': zen,
    'delay': zen_delay,
    'out': out,
    gate,
    'history': zen_history,
    message,
    condMessage,
    "click": z_click,
    loopVariable,
    loop,
    ...membraneAPI
};
