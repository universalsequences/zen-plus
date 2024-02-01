import { doc } from './doc';
import { API } from '@/lib/nodes/context';
import { polycall } from './poly';
import { SubPatch, Message, Lazy, ObjectNode, Patch } from '../../types';
import { Operator, Statement, CompoundOperator } from './types';
import { traverseBackwards } from '@/lib/nodes/traverse';

doc(
    'defun',
    {
        description: "defines a function ",
        numberOfInlets: (x: number) => x - 1,
        numberOfOutlets: 1,
        inletNames: ["output1", "output2", "output3"]
    });
const defun = (node: ObjectNode, ...bodies: Lazy[]) => {
    return (_message: Message): Statement[] => {
        let backwards = traverseBackwards(node).filter(x => x !== node);
        //let numOutbound = node.outlets.flatMap(x => x.connections).length;
        let _bodies = bodies.map(x => x()).filter(x => x);

        // history dependencies...
        let deps = [];
        let basePatch = node.patch;
        while (!(basePatch as SubPatch).isZenBase()) {
            basePatch = (basePatch as SubPatch).parentPatch;
        }
        // we go to the base patch and find the dependencies
        for (let dep of basePatch.historyDependencies) {
            if (dep.node && backwards.includes(dep.node)) {
                deps.push(dep);
            }
        }
        _bodies = [_message, ..._bodies];
        if (_bodies.length === 0) {
            return [];
        }

        let __bodies = [];
        for (let x of _bodies) {
            if (deps.length > 0) {
                __bodies.push(["s" as Operator, ...deps, x as unknown as Statement]);
            } else {
                __bodies.push(x);
            }
        }
        let name = node.attributes["name"] || "test";

        let totalInvocations = 0;
        let downstream = node.patch.getAllNodes();
        for (let n of downstream) {
            let objectNode = n as ObjectNode;
            if ((objectNode.name === "call" || objectNode.name === "latchcall") &&
                n.attributes["name"] === name) {
                totalInvocations++;
            }
            if ((n as ObjectNode).name === "polycall" &&
                n.attributes["name"] === name) {
                totalInvocations += (n as ObjectNode).attributes.voices as number;
            }
        }
        let ret = [
            { name: "defun", value: totalInvocations, variableName: name + node.id },
            ...__bodies,
        ];
        (ret as Statement).node = node;
        node.storedMessage = ret as Statement;
        return [ret as Statement];
    };
};

doc(
    'call',
    {
        description: "defines a function ",
        numberOfInlets: (x: number) => x,
        numberOfOutlets: 1,
        inletNames: ["arg1", "arg2", "arg2"]
    });
const call = (node: ObjectNode, ...args: Lazy[]) => {
    return (message: Message) => {
        let name = node.attributes["name"] || "test";

        let upstream = getUpstreamNodes(node.patch);
        let backwards = upstream;
        let defuns = backwards.filter(x => x.name === "defun" &&
            x.attributes["name"] === name);
        let _node = defuns[0];
        if (!_node) {
            return [];
        }
        let callers = upstream.filter(x => x.name === "call" &&
            x.attributes["name"] == name);


        let invocationNumber = callers.indexOf(node);
        let _args = args.map(x => x()).filter(x => x !== undefined);
        let body = _node.storedMessage;
        if (!body) {
            return [];
        }
        let ret = [
            { name: "call", value: invocationNumber },
            body,
            message,
            ..._args,
        ];
        (ret as Statement).node = node;

        let numBodies = (body as Statement[]).length - 1;
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
    'latchcall',
    {
        description: "defines a function ",
        numberOfInlets: (x: number) => x + 1,
        numberOfOutlets: 1,
        inletNames: ["arg1", "arg2", "arg2"]
    });
const latchcall = (node: ObjectNode, ...args: Lazy[]) => {
    return (message: Message) => {
        let name = node.attributes["name"] || "test";

        let upstream = getUpstreamNodes(node.patch);
        let backwards = upstream;
        let defuns = backwards.filter(x => x.name === "defun" &&
            x.attributes["name"] === name);
        let _node = defuns[0];
        if (!_node) {
            return [];
        }
        let callers = upstream.filter(x => (x.name === "call" || x.name === "latchcall") &&
            x.attributes["name"] == name);


        let invocationNumber = callers.indexOf(node);
        let _args = args.map(x => x()).filter(x => x !== undefined);
        let body = _node.storedMessage;
        if (!body) {
            return [];
        }
        let ret = [
            { name: "latchcall", value: invocationNumber },
            body,
            message,
            ..._args,
        ];
        (ret as Statement).node = node;

        let numBodies = (body as Statement[]).length - 1;
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
        let _name = name() || ('arg_' + num());
        if (_name) {
            let ret: Statement = [{ name: "argument", value: num() as number, variableName: _name as string }]
            ret.node = node;

            return [ret] as Statement[];
        }
        return [];
    }
}

doc(
    'invocation',
    {
        description: "the # invocation of the function call ",
        numberOfInlets: 1,
        numberOfOutlets: 1,
    });
const invocation = (node: ObjectNode, num: Lazy, name: Lazy) => {
    return (message: Message) => {
        let ret: Statement = ["invocation" as Operator];
        ret.node = node;

        return [ret] as Statement[];
    }
}



export const functions: API = {
    defun,
    call,
    argument,
    polycall,
    latchcall,
    invocation
}

export const getUpstreamNodes = (patch: Patch): ObjectNode[] => {
    let nodes = [...patch.objectNodes];
    if ((patch as SubPatch).parentPatch) {
        return [...getUpstreamNodes((patch as SubPatch).parentPatch), ...nodes];
    }
    return nodes;
};
