import { doc } from './doc';
import { NumberOfInlets } from '@/lib/docs/docs';
import { ObjectNode, Lazy, Message } from '../../types';

doc(
    'select',
    {
        aliases: ["sel"],
        numberOfInlets: NumberOfInlets.Outlets,
        numberOfOutlets: (x) => x,
        inletNames: ["type", "type", "type"],
        description: "selectively outputs inputs based"
    });

export const select = (node: ObjectNode, ...types: Lazy[]) => {

    let outputs = new Array(types.length + 1).fill(undefined);
    return (message: Message) => {
        let matched = false;
        const bang = "bang";
        for (let i = 0; i < outputs.length - 1; i++) {
            if (message === types[i]()) {
                outputs[i] = bang;
                matched = true;
            } else {
                outputs[i] = undefined;
            }
        }
        if (!matched) {
            outputs[outputs.length - 1] = bang;
        }
        return outputs;
    }
};

doc(
    'route',
    {
        numberOfInlets: NumberOfInlets.Outlets,
        numberOfOutlets: (x) => x,
        inletNames: ["type", "type", "type"],
        description: "selectively routes inputs based on cond"
    });

export const route = (node: ObjectNode, ...types: Lazy[]) => {
    let outputs: Message[] = new Array(types.length + 1).fill(undefined);
    return (message: Message) => {
        let matched = false;
        if (typeof message === "string" && message.includes(" ")) {
            message = message.split(" ");
        }
        for (let i = 0; i < outputs.length - 1; i++) {

            if (Array.isArray(message) && message[0] === types[i]()) {
                outputs[i] = message[1] as Message;
                matched = true;
            } else if (message === types[i]()) {
                outputs[i] = message;
                matched = true;
            } else {
                outputs[i] = undefined as unknown as Message;
            }
        }
        if (Array.isArray(message)) {
            message = message[1] as Message;
        }
        if (!matched) {
            outputs[outputs.length - 1] = message;
        }
        return outputs;
    }
};

