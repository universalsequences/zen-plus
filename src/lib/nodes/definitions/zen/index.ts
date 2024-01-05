import { Lazy, Message, ObjectNode, NodeFunction } from '../../types';
import { membraneAPI } from './physical-modeling/membrane';
import { gate } from './gate';
import { message } from './message';
import { API } from '@/lib/nodes/context';
import { functions } from './functions';
//import { speakers, scope_tilde, number_tilde } from './audio/index';
//import { comment } from './comment';
//import { matrix } from './matrix';
import { Statement, Operator } from './types';
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
        if ((_node.patch as SubPatch).parentNode) {
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
    let parentNode = (node.patch as SubPatch).parentNode;
    while (parentNode && parentNode.inlets.length < inputNumber) {
        parentNode.newInlet();
    }
    let name: string | undefined = args[1] ? args[1]() as string : undefined;
    parentNode.inlets[inputNumber - 1].name = name;
    return (message: Message) => {
        return [];
    };
};


doc(
    'zen',
    {
        description: "subpatch of patch",
        numberOfInlets: 1,
        numberOfOutlets: 1,
    });

const zen: NodeFunction = (node: ObjectNode, ...args: Lazy[]) => {
    let subpatch = node.subpatch || new SubpatchImpl(node.patch, node);
    node.subpatch = subpatch;
    subpatch.clearState();

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
