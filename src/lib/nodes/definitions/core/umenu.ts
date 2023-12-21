import { doc } from './doc';
import { ObjectNode, Message } from '../../types';

doc(
    'umenu',
    {
        numberOfInlets: 1,
        numberOfOutlets: 2,
        description: "umenu",
        outletNames: ["selected value", "selected index"]
    });

export const umenu = (node: ObjectNode) => {
    node.needsLoad = true;
    if (!node.attributes["options"]) {
        node.attributes["options"] = "";
    }
    return (message: Message) => {
        if (message === "bang") {
            if (!node.storedMessage) {
                if (node.attributes["options"]) {
                    let options = (node.attributes["options"] as string).split(",")
                    if (!options[0]) {
                        return [];
                    }
                    node.storedMessage = options[0];
                } else {
                    return [];
                }
            }
            message = node.storedMessage;
        }
        node.storedMessage = message;
        let options = (node.attributes["options"] as string).split(",")
        let index = options.indexOf(message as string);
        return [message, index];
    };
};
