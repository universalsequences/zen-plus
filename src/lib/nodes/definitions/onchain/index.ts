import { API } from '@/lib/nodes/context';
import { index } from '@/lib/onchain/index';
import { doc } from './doc';
import { Lazy, ObjectNode, Message } from '@/lib/nodes/types';
import { Statement, Operator } from '@/lib/nodes/definitions/zen/types';
import { compileStatement, printStatement } from '../zen/AST';

doc('color',
    {
        inletNames: ["text", "color"],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "yo"
    });

export const color = (node: ObjectNode, _color: Lazy) => {
    return (text: Message): Statement[] => {
        let x = ["color" as Operator, _color() as Statement, text as Statement];
        return [x as Statement];
    };
};

doc('backgroundColor',
    {
        inletNames: ["text", "color"],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "yo"
    });

export const backgroundColor = (node: ObjectNode, _color: Lazy) => {
    return (text: Message): Statement[] => {
        let x = ["backgroundColor" as Operator, _color() as Statement, text as Statement];
        return [x as Statement];
    };
};

doc('repeat',
    {
        inletNames: ["text", "repeats"],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "yo"
    });

export const repeat = (node: ObjectNode, repeats: Lazy) => {
    return (text: Message): Statement[] => {
        let x = ["repeat" as Operator, text as Statement, repeats() as Statement];
        return [x as Statement];
    };
};




doc('concat',
    {
        inletNames: ["a", "b"],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "yo"
    });

export const concat = (node: ObjectNode, b: Lazy) => {
    return (a: Message): Statement[] => {
        let x = ["concat" as Operator, a as Statement, b() as Statement];
        return [x as Statement];
    };
};



doc('html',
    {
        inletNames: ["body"],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "yo"
    });

export const html = (node: ObjectNode, _color: Lazy) => {
    return (body: Message): any[] => {
        let compiled = compileStatement(body as Statement, index, index);
        node.storedLazyMessage = compiled as Lazy;
        // now given this we need to compile 
        return [];
    };
};



export const api: API = {
    concat,
    repeat,
    backgroundColor,
    color,
    html
};
