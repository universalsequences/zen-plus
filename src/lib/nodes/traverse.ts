import { Node, ObjectNode, Patch, SubPatch } from './types';

export const isForwardCycle = (node: Node, originalNode: Node = node, visited: Set<Node> = new Set<Node>()): boolean => {
    let ins: Node[] = [node];
    visited.add(node);
    for (let outlet of node.outlets) {
        for (let connection of outlet.connections) {
            let { destination } = connection;

            if (destination === originalNode) {
                return true;
            }
            if (visited.has(destination)) {
                continue;
            }
            if (isForwardCycle(destination, originalNode, visited)) {
                return true;
            }
        }
    }
    return false;
}

export const traverseBackwards = (node: Node, visited: Set<Node> = new Set<Node>()): Node[] => {
    if (visited.has(node)) {
        return [];
    }
    let ins: Node[] = [node];
    visited.add(node);
    for (let inlet of node.inlets) {
        for (let connection of inlet.connections) {
            let { source } = connection;
            let subpatch = (source as ObjectNode).subpatch;
            if (subpatch) {
                ins = [...ins, ...traverseBackwards(source, visited), ...subpatch.getAllNodes()];
            } else {
                ins = [...ins, ...traverseBackwards(source, visited)];
            }
        }
    }
    return ins;
};

export const traverseForwards = (node: Node, visited: Set<Node> = new Set<Node>()): Node[] => {
    let ins: Node[] = [node];
    visited.add(node);
    for (let outlet of node.outlets) {
        for (let connection of outlet.connections) {
            let { destination } = connection;

            if (visited.has(destination)) {
                continue;
            }
            let subpatch = (destination as ObjectNode).subpatch;
            if (subpatch) {
                ins = [...ins, ...traverseForwards(destination, visited), ...subpatch.getAllNodes()];
            } else {
                ins = [...ins, ...traverseForwards(destination, visited)];
            }
        }
    }
    return ins;
};

