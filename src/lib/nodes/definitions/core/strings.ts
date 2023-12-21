import { doc } from './doc';
import { Message, ObjectNode, Lazy } from '../../types';

doc(
    'string.replace',
    {
        description: "replaces string with replacement",
        numberOfInlets: 3,
        numberOfOutlets: 1,
        inletNames: ["string", "to replace", "to replace with"]
    });

export const string_replace = (object: ObjectNode, toReplace: Lazy, toReplaceWith: Lazy) => {
    return (message: Message) => {
        return [(message as string).replaceAll(toReplace() as string, toReplaceWith() as string)];
    };
};

doc(
    'string.split',
    {
        description: "splits string into list based on delimeter",
        numberOfInlets: 2,
        numberOfOutlets: 1,
        inletNames: ["string", "delimiter"],
        defaultValue: ""
    });

export const string_split = (object: ObjectNode, delimiter: Lazy) => {
    return (message: Message) => {
        return [(message as string).split(delimiter() as string)];
    };
};

doc(
    'string.parseFloat',
    {
        description: "parse to float",
        numberOfInlets: 1,
        numberOfOutlets: 1,
        inletNames: ["string or list"]
    });

export const string_parseFloat = (object: ObjectNode) => {
    return (message: Message) => {
        if (Array.isArray(message)) {
            return [(message as string[]).map((x: string) => parseFloat(x))];
        }
        return [parseFloat(message as string)];
    };
};



export const strings = {
    "string.split": string_split,
    "string.replace": string_replace,
    "string.parseFloat": string_parseFloat
};
