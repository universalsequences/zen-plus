import { ConnectionType, Lazy, Message, ObjectNode, NodeFunction } from '../../types';
import { PatchImpl } from '@/lib/nodes/Patch';
import { membraneAPI } from './physical-modeling/membrane';
import { gate } from './gate';
import { message } from './message';
import { API, OperatorContextType } from '@/lib/nodes/context';
import { functions } from './functions';
//import { speakers, scope_tilde, number_tilde } from './audio/index';
//import { comment } from './comment';
//import { matrix } from './matrix';
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
    while (parentNode && parentNode.inlets.length < inputNumber) {
        parentNode.newInlet();
    }
    let name: string | undefined = args[1] ? args[1]() as string : undefined;
    parentNode.inlets[inputNumber - 1].name = name;

    if (!subpatch.parentPatch.isZen) {
        node.needsLoad = true;
    }

    return (message: Message) => {
        if (!subpatch.parentPatch.isZen && subpatch.patchType === OperatorContextType.ZEN) {
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
            if (type === "gl") {
                node.operatorContextType = OperatorContextType.GL;
                subpatch.patchType = OperatorContextType.GL;
            } else {
                node.operatorContextType = OperatorContextType.ZEN;
                subpatch.patchType = OperatorContextType.ZEN;
            }
            for (let inlet of node.inlets) {
                inlet.connectionType = ConnectionType.GL;
            }
            for (let outlet of node.outlets) {
                outlet.connectionType = ConnectionType.GL;
            }
        };
    }


    node.attributeOptions = {
        "type": ["zen", "gl"]
    };

    return (message: Message) => {
        /*
        return [];
        */
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
    //matrix,
    //comment,
    //"speakers~": speakers,
    //"number~": number_tilde,
    //"scope~": scope_tilde,
    'history': zen_history,
    message,
    ...membraneAPI
};
