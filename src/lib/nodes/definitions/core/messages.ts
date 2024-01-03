import { ObjectNode, Message, Lazy } from '../../types';
import * as queue from '@/lib/messaging/queue';
import { doc } from './doc';

doc(
    'subscribe',
    {
        numberOfOutlets: 1,
        numberOfInlets: 2,
        description: "comment your patch with this node"
    });

export const subscribe = (node: ObjectNode, name: Lazy) => {
    let initialized = false;
    let lastName = "";
    node.needsLoad = true;

    let lastMessage: Message | null = null;
    const onMessage = (message: Message) => {
        // received the message
        if (lastMessage === message) {
            return;
        }
        node.send(node.outlets[0], message);
        lastMessage = message;
    };

    return (x: Message) => {
        if (name() !== lastName) {
            queue.unsubscribe(lastName, onMessage);
            initialized = false;
        }
        if (!initialized) {
            queue.subscribe(name() as string, onMessage);
        }
        return [];
    }
}

