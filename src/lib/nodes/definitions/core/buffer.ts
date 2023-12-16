
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
    if (!node.attributes["external-URL"]) {
        node.attributes["external-URL"] = "";
    }

    node.attributeCallbacks["external-URL"] = (message: string | number | boolean) => {
        if (lastDownload !== message) {
            console.log('last download didnt equal', lastDownload, message);
            node.buffer = undefined;
            node.receive(node.inlets[0], "bang");
        }
    };

    node.attributeOptions = {
        "data format": ["byte", "int32"]
    };

    let lastDownload: string = "";
    return (message: Message): Message[] => {
        // receives an array outputs data with it
        if (node.attributes["external-URL"] !== "") {
            // download
            if (node.buffer) {
                return [node.buffer, node.buffer.length]
            }

            if (lastDownload === message) {
                return [];
            }

            fetch(node.attributes["external-URL"] as string).then(
                async r => {
                    lastDownload = node.attributes["external-URL"] as string;
                    if (r.status !== 200) {
                        return;
                    }
                    try {
                        console.log('grabbing external link...');
                        let arrayBuffer = await r.arrayBuffer();
                        let buffer = await arrayBufferToArray(arrayBuffer, node.patch.audioContext, node.attributes["data format"] as string);
                        console.log("BUFFER downlaoded =", node.attributes["external-URL"], buffer);
                        node.buffer = buffer;
                        node.send(node.outlets[0], buffer);
                        node.send(node.outlets[1], buffer.length);
                    } catch (e) {
                        console.log("error downloading...");
                    }
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

