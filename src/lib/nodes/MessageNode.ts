import {
  ConnectionType,
  type SerializedMessageNode,
  MessageType,
  type Patch,
  type IOlet,
  type Coordinate,
  type MessageNode,
  type Node,
  type Message,
  type MessageObject,
} from "./types";
import { uuid } from "@/lib/uuid/IDGenerator";
import { isNumber } from "@/utils/isNumber";
import { parseLispExpression } from "./utils/lisp";
import { Instruction } from "./vm/types";
import { getRootPatch } from "./traverse";
import { MockBaseNode } from "../../../test/mocks/MockBaseNode";

const TRIGGER = "trigger";
const REPLACE = "replace";

export default class MessageNodeImpl extends MockBaseNode implements MessageNode {
  id: string;
  onNewValue?: (x: Message) => void;
  message?: Message;
  position: Coordinate;
  presentationPosition?: Coordinate;
  zIndex: number;
  messageType: MessageType;
  instructions?: Instruction[];

  constructor(patch: Patch, messageType: MessageType) {
    super(patch);
    this.id = uuid();
    this.position = { x: 0, y: 0 };
    this.zIndex = 0;
    this.newAttribute("min", 0);
    this.newAttribute("max", 1);
    this.newAttribute("number box", messageType === MessageType.Number);
    this.newAttribute("is parameter", false);

    this.newAttribute("scripting name", "");
    this.newAttribute("Include in Presentation", false, () => {
      this.patch.objectNodes = [...this.patch.objectNodes];
      if (this.patch.setObjectNodes) {
        this.patch.setObjectNodes(this.patch.objectNodes);
      }
    });

    this.newAttribute("hide data", false);

    this.message = "";

    this.newInlet(TRIGGER, ConnectionType.CORE);
    this.newInlet(REPLACE, ConnectionType.CORE);
    this.inlets[0].isHot = true;
    this.inlets[1].isHot = false;
    this.newOutlet("message result", ConnectionType.CORE);

    if (messageType === MessageType.Number) {
      for (const inlet of this.inlets) {
        inlet.hidden = true;
      }
    }

    this.messageType = messageType || MessageType.Number;

    if (this.patch.registerNewNode) {
      this.patch.registerNewNode(this);
    }
  }

  receive(inlet: IOlet, message: Message, fromNode?: Node) {
    if (this.instructions) {
      if (inlet.name === REPLACE) {
        this.message = message;
      }
      if (this.patch.sendWorkerMessage) {
        this.patch.sendWorkerMessage({
          type: "evaluateNode",
          body: {
            nodeId: this.id,
            message: message,
          },
        });
      }
      // evaluate(this.instructions, message);
      return;
    }
    switch (inlet.name) {
      case TRIGGER:
        if (
          this.attributes["number box"] &&
          !this.attributes["is parameter"] &&
          message !== "bang"
        ) {
          this.message = message;
          this.send(this.outlets[0], message);
        } else if (this.message !== undefined && message !== undefined) {
          this.send(this.outlets[0], this.pipeIfApplicable(message));
        }
        if (this.patch.registerReceive && !fromNode) {
          this.patch.registerReceive(this, "bang", inlet);
        }
        break;
      case REPLACE:
        this.message = message;
        if (this.patch.registerReceive && !fromNode) {
          this.patch.registerReceive(this, message, inlet);
        }
        break;
    }
    if (this.message !== undefined) {
      if (this.onNewValue) {
        this.onNewValue(this.message);
      }
    }
  }

  parse(text: string) {
    if (text.includes("(") && text.includes(")")) {
      const lisp = parseLispExpression(text);
      this.receive(this.inlets[1], lisp);
      this.message = lisp;
      this.updateWorkerState();
      return lisp;
    }
    if (text.includes("[") && text.includes("]")) {
      try {
        const list = JSON.parse(text);
        this.message = list;
        this.updateWorkerState();
        this.receive(this.inlets[1], list);
        return list;
      } catch (e) {
        console.log("error parsing text", text, e);
      }
    }
    const parsed: Message[] | Message = isNumber(text) ? Number.parseFloat(text) : text;
    this.message = parsed;
    this.updateWorkerState();
    this.receive(this.inlets[1], parsed as Message);
    return parsed;
  }

  updateWorkerState() {
    if (getRootPatch(this.patch).finishedInitialCompile) {
      this.patch.sendWorkerMessage?.({
        type: "updateMessage",
        body: {
          nodeId: this.id,
          json: this.getJSON(),
        },
      });
    }
  }

  pipeIfApplicable(incomingMessage: Message): Message {
    if (this.messageType === MessageType.Number) {
      return this.message as Message;
    }
    if (
      typeof incomingMessage === "object" &&
      !Array.isArray(incomingMessage) &&
      typeof this.message === "string"
    ) {
      const incoming: MessageObject = incomingMessage as MessageObject;
      let msg = this.message as string;
      for (const key in incoming) {
        msg = msg.replace(`$${key}`, incoming[key] as string);
      }
      return msg;
    }
    if (
      (typeof incomingMessage === "string" || typeof incomingMessage === "number") &&
      typeof this.message === "string" &&
      this.message.includes("$1")
    ) {
      return this.message.replaceAll("$1", incomingMessage.toString());
    }
    if (
      (ArrayBuffer.isView(incomingMessage) || Array.isArray(incomingMessage)) &&
      typeof this.message === "string"
    ) {
      let msg = this.message;
      for (let i = 0; i < incomingMessage.length; i++) {
        if (incomingMessage[i] !== undefined) {
          msg = msg.replaceAll(`\$${i + 1}`, incomingMessage[i].toString());
        }
      }
      return msg;
    }
    return this.message as Message;
  }

  getJSON(): SerializedMessageNode {
    let json: any = {
      id: this.id,
      message: this.message as Message,
      position: this.position,
      presentationPosition: this.presentationPosition,
      outlets: this.getConnectionsJSON(),
      messageType: this.messageType,
    };

    json.attributes = {};
    for (const name in this.attributes) {
      if (this.attributes[name] !== this.attributeDefaults[name]) {
        json.attributes[name] = this.attributes[name];
      }
    }
    return json;
  }

  fromJSON(json: SerializedMessageNode) {
    if (json.attributes) {
      this.attributes = {
        ...this.attributes,
        ...json.attributes,
      };
    }
    if (json.messageType) {
      this.messageType = json.messageType;
    }
    this.position = json.position;
    this.presentationPosition = json.presentationPosition;
    this.message = json.message;
    this.id = json.id;
  }
}
