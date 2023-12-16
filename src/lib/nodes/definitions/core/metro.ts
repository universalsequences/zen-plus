import { Message, ObjectNode } from '@/lib/nodes/types';
import { doc } from './doc';

doc(
    'interval',
    {
        description: "sends bang in a timed interval",
        numberOfInlets: 1,
        numberOfOutlets: 1,
        inletNames: ["interval time ms"]
    });

export const interval = (node: ObjectNode) => {
    let timer: any;
    const tick = () => {
        node.send(node.outlets[0], "bang");
    };
    return (time: Message) => {
        if (timer) {
            clearInterval(timer);
        }
        timer = setInterval(tick, typeof time === "number" ? time : 100);
        return [];
    };
};
