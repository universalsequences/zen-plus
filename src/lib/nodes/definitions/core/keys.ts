import { doc } from './doc';
import { NumberOfInlets } from '@/lib/docs/docs';
import { ObjectNode, Lazy, Message } from '../../types';

doc(
    'key.down',
    {
        numberOfInlets: 2,
        numberOfOutlets: (x) => x,
        inletNames: ["none", "key"],
        description: "outputs bang if key matches"
    });

export const keydown = (node: ObjectNode, key: Lazy) => {

    window.addEventListener("keydown", (e: KeyboardEvent) => {
        if (node.patch.isSelected) {
            if (e.key === key()) {
                node.send(node.outlets[0], "bang");
            }
        }
    });

    return (message: Message) => {
        return [];
    };
}

