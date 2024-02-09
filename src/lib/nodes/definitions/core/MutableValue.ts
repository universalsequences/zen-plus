import { ObjectNode, Message, Lazy } from '@/lib/nodes/types';
import { publish } from '@/lib/messaging/queue';

export class MutableValue {
    objectNode: ObjectNode;
    _value: Message;
    index: number;
    constructor(node: ObjectNode, index: number) {
        this.objectNode = node;
        this._value = 0;
        this.index = index;
    }

    set value(x) {
        if (typeof x === "number" && isNaN(x as number)) {
            return;
        }
        publish("statechanged", {
            node: this.objectNode,
            state: x
        });
        this._value = x;
        if (this.objectNode.patch.onNewMessage) {
            this.objectNode.patch.onNewMessage(
                this.objectNode.id,
                x);
        }
    }

    get value() {
        return this._value;
    }

    fromJSON(x: any) {
        this._value = x;
        this.objectNode.arguments[this.index] = x;
        this.objectNode.receive(this.objectNode.inlets[0], x);
        if (this.objectNode.patch.onNewMessage) {
            this.objectNode.patch.onNewMessage(
                this.objectNode.id,
                x);
        }
    }

    getJSON() {
        return this.value;
    }
}
