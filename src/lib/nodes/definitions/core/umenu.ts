import { doc } from './doc';
import { ObjectNode, Message } from '../../types';

doc(
    'divider',
    {
        numberOfInlets: 0,
        numberOfOutlets: 0,
        description: "ux divider (line)"
    });

export const divider = (node: ObjectNode) => {
    if (!node.attributes["orientation"]) {
        node.attributes["orientation"] = "horizontal";
    }
    node.attributeOptions["orientation"] = ["horizontal", "vertical"];
    node.attributeCallbacks["orientation"] = (orientation: string | number | boolean): void => {
        if (orientation === "vertical") {
            console.log('updating orientation v');
            node.size = {
                height: 100,
                width: 1,
            };
        } else {
            console.log('updating orientation h');
            node.size = {
                width: 100,
                height: 1,
            };
        }
    };

    if (!node.size) {
        if (node.attributes["orientation"] === "vertical") {
            console.log('setting size vertically');
            node.size = {
                height: 100,
                width: 1,
            };
        } else {
            console.log('setting size horizontally');
            node.size = {
                width: 100,
                height: 1,
            };
        }
    }
    return () => [];
};

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
                    let options = Array.isArray(node.attributes["options"]) ? node.attributes["options"] : (node.attributes["options"] as string).split(",")
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
        node.saveData = message;
        let options = Array.isArray(node.attributes["options"]) ? node.attributes["options"] as number[] : (node.attributes["options"] as string).split(",") as string[];
        let indexOf = -1;
        let i = 0;
        for (let option of options) {
            if (message === option) {
                indexOf = i;
            }
            i++;
        }
        return [message, indexOf];
    };
};
