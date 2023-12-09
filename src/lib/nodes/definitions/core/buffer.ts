
import { doc } from './doc';
import { ObjectNode, Message, NodeFunction, AttributeOptions } from '../../types';
import { arrayBufferToArray } from '@/lib/audio/arrayBufferToArray';


doc(
    'buffer',
    {
        description: "drop a file into it and output typed array",
        numberOfInlets: 1,
        numberOfOutlets: 2,
    });

export const buffer = (node: ObjectNode) => {
    if (!node.attributes["data format"]) {
        node.attributes["data format"] = "byte";
    }
    if (!node.attributes["external URL"]) {
        node.attributes["external URL"] = "";
    }

    node.attributeOptions = {
        "data format": ["byte", "int32"]
    };

    return (message: Message): Message[] => {
        // receives an array outputs data with it
        if (node.attributes["external URL"] !== "") {
            // download
            if (node.buffer) {
                return [node.buffer, node.buffer.length]
            }
            fetch(node.attributes["external URL"] as string).then(
                async r => {
                    console.log('grabbing external link...');
                    let arrayBuffer = await r.arrayBuffer();
                    let buffer = await arrayBufferToArray(arrayBuffer, node.patch.audioContext, node.attributes["data format"] as string);
                    node.buffer = buffer;
                    node.send(node.outlets[0], buffer);
                    node.send(node.outlets[1], buffer.length);
                });
            return [];
        }
        if (ArrayBuffer.isView(message)) {
            //_size = message.length;
            if (!node.buffer) {
                node.buffer = message;
            }
            return [message as Float32Array, message.length];
        } else if (message === "bang" && node.buffer) {
            //_size = message.length;
            return [node.buffer, node.buffer.length];
        } else {
            return [];
        }
    };
};

