import { SubPatch, ObjectNode, Message, Lazy } from '../../types';
import { OperatorContextType } from '@/lib/nodes/context';
import * as queue from '@/lib/messaging/queue';
import { doc } from './doc';

doc(
    'send',
    {
        aliases: ["s"],
        numberOfOutlets: 1,
        numberOfInlets: 2,
        inletNames: ["message to send", "message name"],
        description: "comment your patch with this node"
    });

export const send = (node: ObjectNode, name: Lazy) => {
    return (message: Message) => {
        queue.publish(name() as string, message);
        return [];
    };
};

doc(
    'subscribe',
    {
        aliases: ["receive", "r"],
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
        let patchType = node.patch ? (node.patch as SubPatch).patchType : undefined;
        if (Array.isArray(message) && patchType === OperatorContextType.ZEN) {
            // we are in a zen patch so only subscribe to messages
            // from "this zen audio graph"
            let messagePatch = message[2];
            let zenBase = node.patch;
            while (!zenBase.isZenBase()) {
                zenBase = (zenBase as SubPatch).parentPatch;
            }
            if (zenBase !== messagePatch) {
                return;
            }
        }
        if (lastMessage === message) {
            return;
        }
        let second = (message as Message[])[2];
        if (second && ((message as Message[])[2] as unknown as SubPatch).patchType !== undefined) {
            (message as Message[]).splice(2, 1);
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

