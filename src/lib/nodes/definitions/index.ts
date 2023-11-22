import { Lazy, Message, ObjectNode, NodeFunction } from '../types';
import { Statement, Operator } from './zen/types';
import { doc } from './doc';
import { zen_history } from './history';
import { math } from './math';
import { zen_delay } from './delay';
import { filters } from './filters';
import { core } from './core';
import { data_index } from './data';
import SubpatchImpl from '../Subpatch';
import { SubPatch } from '../types';

type API = {
    [x: string]: NodeFunction;
}

doc(
    'out',
    {
        description: "output of patch",
        numberOfInlets: 2,
        numberOfOutlets: 0,
    });

const out: NodeFunction = (_node: ObjectNode, ...args: Lazy[]) => {

    let parentNode = (_node.patch as SubPatch).parentNode;
    if (parentNode) {
        let outputNumber = args[0]() as number;
        let name: string | undefined = args[1] ? args[1]() as string : undefined;
        parentNode.outlets[outputNumber - 1].name = name;
    }

    return (message: Message) => {
        _node.patch.compile(message as Statement);
        return [1];
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
    ...core,
    ...data_index,
    'in': input,
    'zen': zen,
    'delay': zen_delay,
    'out': out,
    'history': zen_history
};
