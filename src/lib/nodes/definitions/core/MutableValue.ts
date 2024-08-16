import type { ObjectNode, Message } from "@/lib/nodes/types";
import { publish } from "@/lib/messaging/queue";

export class MutableValue {
  objectNode: ObjectNode;
  _value: Message;
  index?: number;
  useOnNewValue: boolean;
  constructor(node: ObjectNode, index?: number, useOnNewValue = true) {
    this.useOnNewValue = useOnNewValue;
    this.objectNode = node;
    this._value = 0;
    this.index = index;
  }

  set value(x) {
    if (typeof x === "number" && Number.isNaN(x as number)) {
      return;
    }
    publish("statechanged", {
      node: this.objectNode,
      state: x,
    });
    this._value = x;
    if (this.objectNode.onNewValue && this.useOnNewValue) {
      this.objectNode.onNewValue(x);
    }
  }

  get value() {
    return this._value;
  }

  fromJSON(x: any) {
    this._value = x;
    if (this.index !== undefined) {
      this.objectNode.arguments[this.index] = x;
      this.objectNode.receive(this.objectNode.inlets[0], x);
    }
    if (this.objectNode.onNewValue && this.useOnNewValue) {
      this.objectNode.onNewValue(x);
    }
  }

  getJSON() {
    return this.value;
  }
}
