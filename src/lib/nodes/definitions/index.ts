import { Lazy, Message, ObjectNode, NodeFunction } from '../types';
import { Statement, Operator } from './zen/types';
import { doc } from './doc';
import { zen_history } from './history';
import {math} from './math';
import {zen_delay} from './delay';
import {filters} from './filters';
import { core } from './core';
import { data_index } from './data';

type API = {
    [x: string]: NodeFunction;
}

doc(
    'phasor',
    {
        description: "phasor",
        numberOfInlets: 2,
        numberOfOutlets: 1,
        defaultValue: 0
    });
const phasor: NodeFunction = (_node: ObjectNode, ...args: Lazy[]) => {
    return (message: Message) => {
        let statement: Statement = [{ name: "phasor" } as Operator, message as Statement, args[0]() as Statement]
        statement.node = _node;
        return [statement];
    };
};

doc(
    'out',
    {
        description: "output of patch",
        numberOfInlets: 1,
        numberOfOutlets: 0,
    });

const out: NodeFunction = (_node: ObjectNode, ...args: Lazy[]) => {
    return (message: Message) => {
        console.log("output of graph=", message)
        _node.patch.compile(message as Statement);
        return [1];
    };
};

export const api: API = {
    ... math,
    ... filters,
    ... core,
    ... data_index,
    'delay': zen_delay,
    'phasor': phasor,
    'out': out,
    'history': zen_history
};
