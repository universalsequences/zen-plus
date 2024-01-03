import { Attributes, ObjectNode, ConnectionType, SerializedMessageNode, MessageType, Patch, IOlet, Coordinate, MessageNode, Message } from './types';
import { BaseNode } from './BaseNode';
import { uuid } from '@/lib/uuid/IDGenerator';
import ObjectNodeImpl from './ObjectNode';

const TRIGGER = 'trigger';
const REPLACE = 'replace';

export default class MessageNodeImpl extends BaseNode implements MessageNode {
    id: string;
    message?: Message;
    position: Coordinate;
    presentationPosition?: Coordinate;
    zIndex: number;
    paramNode: ObjectNode;
    messageType: MessageType;

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
            this.patch.objectNodes = [... this.patch.objectNodes];
            if (this.patch.setObjectNodes) {
                this.patch.setObjectNodes(this.patch.objectNodes);
            }
        });


        this.message = 0;
        this.newInlet(TRIGGER, ConnectionType.CORE);
        this.newInlet(REPLACE, ConnectionType.CORE);
        this.newOutlet("message result", ConnectionType.CORE);

        if (messageType === MessageType.Number) {
            this.inlets.forEach(inlet => inlet.hidden = true);
        }

        this.paramNode = new ObjectNodeImpl(patch);
        this.paramNode.parse("param");

        this.messageType = messageType || MessageType.Number;
    }

    receive(inlet: IOlet, message: Message) {
        switch (inlet.name) {
            case TRIGGER:
                if (this.attributes["number box"] && !this.attributes["is parameter"] && message !== "bang") {
                    this.message = message;
                    this.send(this.outlets[0], message);
                } else if (this.attributes["is parameter"] && this.paramNode.fn) {
                    let result = this.paramNode.fn("bang");
                    this.send(this.outlets[0], result[0]);
                    if (this.message !== undefined) {
                        this.paramNode.fn(this.message);
                    }
                } else if (this.message !== undefined && message !== undefined) {
                    this.send(this.outlets[0], this.pipeIfApplicable(message));
                }
                break;
            case REPLACE:
                this.message = message;
                if (this.attributes["is parameter"] && this.paramNode.fn) {
                    this.paramNode.fn(this.message);
                }
                break;
        }
        if (this.message !== undefined) {
            if (this.patch.onNewMessage) {
                this.patch.onNewMessage(this.id, this.message);
            }
        }
    }

    parse(text: string) {
        if (text.includes("[") && text.includes("]")) {
            try {
                let list = JSON.parse(text);
                this.receive(this.inlets[1], list);
                return list;
            } catch (e) {
            }
        }
        this.receive(this.inlets[1], text);
    }

    pipeIfApplicable(incomingMessage: Message): Message {
        if (this.messageType === MessageType.Number) {
            return this.message as Message;
        }
        if ((typeof incomingMessage === "string" || typeof incomingMessage === "number") && typeof this.message === "string" && this.message.includes("$1")) {
            return this.message.replaceAll("$1", incomingMessage.toString());
        }
        if ((ArrayBuffer.isView(incomingMessage) || Array.isArray(incomingMessage)) && typeof this.message === "string") {
            let msg = this.message;
            for (let i = 0; i < incomingMessage.length; i++) {
                msg = msg.replaceAll("$" + (i + 1), incomingMessage[i].toString());
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
            messageType: this.messageType
        };

        json.attributes = {};
        for (let name in this.attributes) {
            if (this.attributes[name] !== this.attributeDefaults[name]) {
                json.attributes[name] = this.attributes[name];
            }
        }
        return json;

    }

    fromJSON(json: SerializedMessageNode) {
        if (json.attributes) {
            this.attributes = {
                ... this.attributes,
                ...json.attributes
            }
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
