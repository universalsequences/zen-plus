import { doc } from "./doc";
import { ObjectNode, Message, AttributeValue } from "../../types";
import { MutableValue } from "./MutableValue";

doc("divider", {
  numberOfInlets: 0,
  numberOfOutlets: 0,
  description: "ux divider (line)",
});

export const divider = (node: ObjectNode) => {
  if (!node.attributes["orientation"]) {
    node.attributes["orientation"] = "horizontal";
  }
  node.attributeOptions["orientation"] = ["horizontal", "vertical"];
  node.attributeCallbacks["orientation"] = (orientation: AttributeValue): void => {
    if (orientation === "vertical") {
      node.size = {
        height: 100,
        width: 1,
      };
    } else {
      node.size = {
        width: 100,
        height: 1,
      };
    }
  };

  if (!node.size) {
    if (node.attributes["orientation"] === "vertical") {
      node.size = {
        height: 100,
        width: 1,
      };
    } else {
      node.size = {
        width: 100,
        height: 1,
      };
    }
  }
  return () => [];
};

doc("umenu", {
  numberOfInlets: 1,
  numberOfOutlets: 2,
  description: "umenu",
  outletNames: ["selected value", "selected index"],
});

export const umenu = (node: ObjectNode) => {
  node.needsLoad = true;
  node.needsUX = true;
  if (!node.attributes["options"]) {
    node.attributes["options"] = "";
  }

  let custom: MutableValue;
  if (!node.custom) {
    custom = new MutableValue(node, 0);
    node.custom = custom;
  } else {
    custom = node.custom as MutableValue;
  }

  return (message: Message) => {
    if (message === "bang") {
      if (!node.storedMessage) {
        if (node.attributes["options"]) {
          let options = Array.isArray(node.attributes["options"])
            ? node.attributes["options"]
            : (node.attributes["options"] as string).split(",");
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
    const options = Array.isArray(node.attributes["options"])
      ? (node.attributes.options as number[])
      : typeof node.attributes.options === "number"
        ? [node.attributes.options]
        : ((node.attributes.options as string).split(",") as string[]);
    let indexOf = -1;
    let i = 0;
    for (const option of options) {
      if (message === option) {
        indexOf = i;
      }
      i++;
    }

    if (node.onNewValue) {
      node.onNewValue(message);
    }
    custom.value = message;
    return [message, indexOf];
  };
};

doc("buttonoptions", {
  numberOfInlets: 1,
  numberOfOutlets: 2,
  description: "umenu",
  outletNames: ["selected value", "selected index"],
});

// same implementation
export const buttonoptions = umenu;
