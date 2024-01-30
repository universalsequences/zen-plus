import { ObjectNode, Message } from '../../types';
import { doc } from './doc';

doc(
    'slider',
    {
        inletNames: ["operation"],
        numberOfOutlets: 1,
        numberOfInlets: 1,
        description: "slider ui element"
    });

export const slider = (_node: ObjectNode) => {
    _node.needsLoad = true;
    return (msg: Message) => {
        if (msg === "bang") {
            if (_node.arguments[0] !== undefined) {
                return [_node.arguments[0]];
            }
        }
        return [msg];
    };
}

doc(
    'knob',
    {
        inletNames: ["operation"],
        numberOfOutlets: 1,
        numberOfInlets: 1,
        description: "knob ui element"
    });

export const knob = (_node: ObjectNode) => {
    _node.needsLoad = true;
    return (msg: Message) => {
        if (msg === "bang") {
            if (_node.arguments[0] !== undefined) {
                console.log('sending arguments[0]', _node.arguments[0]);
                return [_node.arguments[0]];
            }
        }
        return [msg];
    };
}


