import { doc } from './doc';
import { API } from '@/lib/nodes/context';
import { Message, Lazy, ObjectNode } from '../../types';
import { Operator, Statement, CompoundOperator } from './types';
import { traverseBackwards } from '@/lib/nodes/traverse';

doc(
    'defun',
    {
        description: "defines a function ",
        numberOfInlets: (x: number) => x,
        numberOfOutlets: 1,
    });
const defun = (node: ObjectNode, name: Lazy, ...bodies: Lazy[]) => {
    node.inlets[0].lastMessage = 0;
    return (_message: Message): Statement[] => {
        let backwards = traverseBackwards(node).filter(x => x !== node);
        let numOutbound = node.outlets.flatMap(x => x.connections).length;
        let _bodies = bodies.map(x => x()).filter(x => x);
        if (_bodies.length === 0) {
            return [];
        }

        // history dependencies...
        let deps = [];
        for (let dep of node.patch.historyDependencies) {
            if (dep.node && backwards.includes(dep.node)) {
                deps.push(dep);
            }
        }


        let __bodies = [];
        for (let x of _bodies) {
            if (deps.length > 0) {
                __bodies.push(["s" as Operator, ...deps, x as unknown as Statement]);
            } else {
                __bodies.push(x);
            }
        }
        let ret = [
            { name: "defun", value: numOutbound, variableName: name() },
            ...__bodies,
        ];
        (ret as Statement).node = node;
        console.log("ret = ", ret);
        return [ret as Statement];
    };
};

doc(
    'call',
    {
        description: "defines a function ",
        numberOfInlets: (x: number) => x,
        numberOfOutlets: 1,
    });
const call = (node: ObjectNode, ...args: Lazy[]) => {
    return (message: Message) => {
        let backwards = traverseBackwards(node);
        let defuns = backwards.filter(x => (x as ObjectNode).name === "defun");
        let _node = defuns[0];
        if (!_node) {
            return [];
        }
        let outbound = _node.outlets.flatMap(x => x.connections.map(x => x.destination));
        if (outbound.length === 0) {
            return [];
        }

        let invocationNumber = outbound.indexOf(node);
        let _args = args.map(x => x()).filter(x => x !== undefined);
        let ret = [
            { name: "call", value: invocationNumber },
            message,
            ..._args,
        ];
        (ret as Statement).node = node;

        let numBodies = (message as Statement[]).length - 1;
        let rets: Statement[] = [];
        for (let i = 0; i < numBodies; i++) {
            let nth: Statement = ["nth" as Operator, ret as Statement, i];
            if (!node.outlets[i]) {
                node.newOutlet();
            }
            rets.push(nth);
        }
        return rets;
    }
}

doc(
    'argument',
    {
        description: "defines an argument for a function ",
        numberOfInlets: 3,
        numberOfOutlets: 1,
    });
const argument = (node: ObjectNode, num: Lazy, name: Lazy) => {
    return (message: Message) => {
        if (name()) {
            let ret: Statement = [{ name: "argument", value: num() as number, variableName: name() as string }]
            ret.node = node;

            return [ret] as Statement[];
        }
        return [];
    }
}

export const functions: API = {
    defun,
    call,
    argument
}
