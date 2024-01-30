import { doc } from './doc';
import { parseArguments } from '@/lib/nodes/definitions/gl/index';
import { API } from '@/lib/nodes/context';
import { SubPatch, Message, Lazy, ObjectNode, Patch } from '../../types';
import { Operator, Statement, CompoundOperator } from './types';
import { traverseBackwards } from '@/lib/nodes/traverse';
import { getUpstreamNodes } from './functions';

doc(
    'polycall',
    {
        description: "calls a function multiple times ",
        numberOfInlets: (x: number) => x,
        numberOfOutlets: 1,
        inletNames: ["arg1", "arg2", "arg2"]
    });
export const polycall = (node: ObjectNode, ...args: Lazy[]) => {
    if (!node.attributes.voices) {
        node.attributes.voices = 6;
    }

    return (message: Message) => {
        let name = node.attributes["name"];

        let upstream = getUpstreamNodes(node.patch);
        let defuns = upstream.filter(x => x.name === "defun" &&
            x.attributes["name"] === name);

        let defun = defuns[0];
        if (!defun) {
            return [];
        }

        // defun needs a 
        let body = defun.storedMessage;
        if (!body) {
            return [];
        }

        let _args = args.map(x => x()).filter(x => x !== undefined);
        let voices = node.attributes.voices as number;

        let numBodies = (body as Statement[]).length - 1;
        let sums = new Array(numBodies).fill(0)

        let connect: number[] | undefined = node.attributes["connect"] as number[] | undefined;

        let previous = Array.isArray(connect) ? _args[connect[1]] : null;

        for (let _body of body as Statement[]) {
            let a = parseArguments(_body);
            for (let arg of a) {
                let op = (arg as Statement[])[0] as CompoundOperator;
                let num = op.value as number;
                let name = op.variableName;
                let inlet = node.inlets[num - 1];
                if (inlet) {
                    inlet.name = name;
                }
            }
        }

        for (let invocation = 0; invocation < voices; invocation++) {

            let __args = [message, ..._args];
            if (Array.isArray(connect) && invocation > 0) {
                __args[connect[0]] = previous as any;
            }
            let ret = [
                { name: "call", value: invocation },
                body,
                ...__args,
            ];
            (ret as Statement).node = {
                ...node,
                id: node.id + '_' + invocation
            };

            let rets: Statement[] = [];
            for (let i = 0; i < numBodies; i++) {
                let nth: Statement = ["nth" as Operator, ret as Statement, i];
                if (!node.outlets[i]) {
                    node.newOutlet();
                }
                // nth.node = { ...node, id: node.id + '_' + invocation + '_nth' };
                rets.push(nth);
            }

            if (Array.isArray(connect)) {
                previous = rets[connect[0]];

            }

            // now go thru the rets and add to sums
            for (let i = 0; i < rets.length; i++) {
                let addition: Statement = ["add" as Operator, sums[i], rets[i]];
                // addition.node = { ...node, id: node.id + '_addition_' + i };
                sums[i] = addition;
            }
        }

        return sums;
    }
}

