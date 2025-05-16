import type { ObjectNode, Message, SerializableCustom } from "@/lib/nodes/types";
import { publish } from "@/lib/messaging/queue";
import { OnNewValues, VMEvaluation } from "@/workers/vm/VM";
import { OperatorContextType } from "../../context";

export class MutableValue implements SerializableCustom {
  objectNode: ObjectNode;
  _value: Message;
  index?: number;
  useOnNewValue: boolean;
  executing: boolean;
  constructor(node: ObjectNode, index?: number, useOnNewValue = true) {
    this.useOnNewValue = useOnNewValue;
    this.objectNode = node;
    this._value = 0;
    this.index = index;
    this.executing = false;
  }

  set value(x) {
    if (this.executing) return;
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

    this.updateMainThread();
  }

  get value() {
    return this._value;
  }

  fromJSON(x: any, empty?: boolean, voice?: number, time?: number) {
    if (voice === undefined) this.value = x;

    if (voice === undefined && this.objectNode.onNewValue && this.useOnNewValue) {
      this.objectNode.onNewValue(x);
    }

    if (this.objectNode.operatorContextType === OperatorContextType.AUDIO) {
      this.objectNode.receive(this.objectNode.inlets[0], this.value);
    }
    if (voice === undefined) {
      this.updateMainThread();
    }
    this.executing = true;
    const ret = this.execute(x, voice, time);
    this.executing = false;
    return ret;
  }

  getJSON() {
    return this.value;
  }

  execute(value?: any, voice?: number, time?: number) {
    const evaluation = this.objectNode.patch.vm?.evaluateNode(
      this.objectNode.id,
      value === undefined
        ? "bang"
        : voice !== undefined && time !== undefined
          ? { voice, value, time }
          : value,
    );
    if (evaluation) {
      if (voice === undefined) {
        this.objectNode.patch.vm?.sendEvaluationToMainThread?.(evaluation);
      } else {
        return evaluation;
      }
    }
  }

  updateMainThread(onNewValues?: OnNewValues[], onNewValue?: any, mutableValue = this.value) {
    const evaluation: VMEvaluation = {
      instructionsEvaluated: [],
      replaceMessages: [],
      objectsEvaluated: [],
      mainThreadInstructions: [],
      optimizedMainThreadInstructions: [],
      onNewValue: onNewValue
        ? [
            {
              nodeId: this.objectNode.id,
              value: onNewValue,
            },
          ]
        : [],
      onNewSharedBuffer: [],
      mutableValueChanged: [
        {
          nodeId: this.objectNode.id,
          value: mutableValue,
        },
      ],
      onNewValues: onNewValues || [],
      attributeUpdates: [],
      onNewStepSchema: [],
    };
    this.objectNode.patch.vm?.sendEvaluationToMainThread?.(evaluation, false);
  }
}
