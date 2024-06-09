import { doc } from './doc';
import { Message, ObjectNode } from '../../types';

doc(
    'wasmviewer',
    {
        inletNames: [],
        description: "shows wasm code",
        numberOfInlets: 0,
        numberOfOutlets: 0
    }
);

export const wasmviewer = (node: ObjectNode) => {

    if (!node.size) {
        node.size = { width: 25, height: 25 };
    }
    return (message: Message) => {
        return [];
    }
}

doc(
    'ast',
    {
        inletNames: [],
        description: "shows wasm code",
        numberOfInlets: 0,
        numberOfOutlets: 0
    }
);
export const ast = (node: ObjectNode) => {

    console.log("MY AST");
    if (!node.size) {
        node.size = { width: 25, height: 25 };
    }
    return (message: Message) => {
        return [];
    }
}
