import { ObjectNode, Message, Lazy } from '@/lib/nodes/types';
import { doc } from './doc';

doc(
    'attrui',
    {
        description: "control parameters/attribitues with ui",
        numberOfInlets: 3,
        numberOfOutlets: 1
    });

export const attrui = (node: ObjectNode, name: Lazy, value: Lazy) => {
    node.needsLoad = true;
    node.inlets.forEach(x => x.hidden = true);
    return (_message: Message) => {
        if (name() && value() !== undefined) {
            let msg = `${name()} ${value()}`;
            return [msg];
        }
        return [];
    };
};
