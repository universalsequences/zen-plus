
import { doc } from './doc';
import { ObjectNode, Message, NodeFunction, AttributeOptions } from '../../types';


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
    node.attributeOptions = {
        "data format": ["byte", "int32"]
    };
    return (message: Message): Message[] => {
        // receives an array outputs data with it
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

