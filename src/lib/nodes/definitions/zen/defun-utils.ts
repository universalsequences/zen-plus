import { getUpstreamNodes } from './functions';
import { ObjectNode } from '@/lib/nodes/types';
import { Operator, Statement, CompoundOperator } from './types';

export const getDefunBodies = (node: ObjectNode): Statement[] => {
    let name = node.attributes["name"];
    let upstream = getUpstreamNodes(node.patch);
    let defuns = upstream.filter(x => x.name === "defun" &&
        x.attributes["name"] === name);

    let defun = defuns[0];
    if (!defun) {
        return [];
    }

    let body = defun.storedMessage;
    if (!body) {
        return [];
    }

    return body as Statement[];
};
