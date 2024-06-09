import { doc } from './doc';
import { getDefunBodies } from './defun-utils';
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
        inletNames: ["arg1", "arg2", "arg2"],
        attributeOptions: {
            "mode": ["sum", "pipe", "inputs"]
        }
    });

type Mode = "pipe" | "sum" | "inputs";

export const polycall = (node: ObjectNode, ...args: Lazy[]) => {
    if (!node.attributes.voices) {
        node.attributes.voices = 6;
    }

    if (!node.attributes["mode"]) {
        node.attributes["mode"] = "sum" as Mode;
    }

    return (message: Message) => {
        /*
        let name = node.attributes["name"];
        let upstream = getUpstreamNodes(node.patch);
        let defuns = upstream.filter(x => x.name === "defun" &&
            x.attributes["name"] === name);

        let defun = defuns[0];
        if (!defun) {
            return [];
        }
        */

        let body = getDefunBodies(node); //defun.storedMessage;
        console.log("BODY FOR POLY=", body);

        if (!body || body.length === 0) {
            return [];
        }

        let _args = args.map(x => x()).filter(x => x !== undefined);
        let voices = node.attributes.voices as number;

        let numBodies = (body as Statement[]).length - 1;

        let mode = node.attributes["mode"];
        let outputs = mode !== "pipe" ? new Array(numBodies).fill(0) :
            new Array(numBodies * voices).fill(0);

        if (outputs.length < node.outlets.length) {
            node.outlets = node.outlets.slice(0, outputs.length);
        }

        let connect: number[] | undefined = node.attributes["connect"] as number[] | undefined;

        let previous = Array.isArray(connect) ? _args[connect[1]] : null;

        let indexCounter = 0;
        let _voices = mode === "inputs" ? voices : 1;
        let numArgs = 0;
        for (let i = 0; i < _voices; i++) {
            let ARGS: number[] = [];
            for (let _body of body as Statement[]) {
                let a = parseArguments(_body);
                let _numArgs = Array.from(new Set(a.map(b => ((b as Statement[])[0] as CompoundOperator).value))).length;
                for (let arg of a) {
                    let op = (arg as Statement[])[0] as CompoundOperator;
                    let num = op.value as number;
                    let argumentNumber = num;
                    let name = op.variableName;
                    let ii = i * _numArgs;
                    if (mode !== "inputs") {
                        ii = 0;
                    }
                    if (!ARGS.includes(argumentNumber)) {
                        if (!node.inlets[ii + num - 1]) {
                            node.newInlet();
                        }
                    }

                    if (!ARGS.includes(argumentNumber) && i === 0) {
                        numArgs++;
                    }
                    ARGS.push(argumentNumber);
                    let inlet = node.inlets[ii + num - 1];
                    if (inlet) {
                        if (mode === "inputs") {
                            inlet.name = name + ' (voice ' + (i + 1) + ')';
                        } else {
                            inlet.name = name;
                        }
                    }
                }
                indexCounter++;
            }
        }

        for (let invocation = 0; invocation < voices; invocation++) {
            let __args = [message, ..._args];
            if (Array.isArray(connect) && invocation > 0) {
                __args[connect[0]] = previous as any;
            }
            if (node.attributes["inputs"] !== undefined) {
                let inputs = Array.isArray(node.attributes["inputs"]) ? node.attributes["inputs"] as number[] : [node.attributes["inputs"] as number];
                if (!inputs.includes(invocation)) {
                    __args = __args.fill(0);
                }
            }
            for (let i = 0; i < __args.length; i++) {
                if (node.attributes[`in${i + 1}`] !== undefined) {
                    let inputs = Array.isArray(node.attributes[`in${i + 1}`]) ? node.attributes[`in${i + 1}`] as number[] : [node.attributes[`in${i + 1}`] as number];
                    if (!inputs.includes(invocation)) {
                        __args[i] = 0;
                    }
                }
            }
            if (node.attributes["mode"] === "inputs") {
                __args = __args.slice(invocation * numArgs, (invocation + 1) * numArgs);
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
                let outletIndex = mode !== "pipe" ? i : invocation * numBodies + i;
                if (!node.outlets[outletIndex]) {
                    node.newOutlet();
                }
                // nth.node = { ...node, id: node.id + '_' + invocation + '_nth' };
                rets.push(nth);
            }

            if (Array.isArray(connect)) {
                previous = rets[connect[0]];
            }

            // now go thru the rets and add to outputs
            if (mode !== "pipe") {
                for (let i = 0; i < rets.length; i++) {
                    let addition: Statement = ["add" as Operator, outputs[i], rets[i]];
                    // addition.node = { ...node, id: node.id + '_addition_' + i };
                    outputs[i] = addition;
                }
            } else {
                // otherwise we're just piping
                for (let i = 0; i < rets.length; i++) {
                    outputs[invocation * numBodies + i] = rets[i];
                }
            }
        }

        return outputs;
    }
}

