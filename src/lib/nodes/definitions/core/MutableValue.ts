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

  fromJSON(x: any) {
    this.value = x;

    if (this.objectNode.onNewValue && this.useOnNewValue) {
      this.objectNode.onNewValue(x);
    }

    if (this.objectNode.operatorContextType === OperatorContextType.AUDIO) {
      this.objectNode.receive(this.objectNode.inlets[0], this.value);
    }
    this.updateMainThread();
    this.executing = true;
    this.execute(x);
    this.executing = false;
  }

  getJSON() {
    return this.value;
  }

  execute(value?: number) {
    const evaluation = this.objectNode.patch.vm?.evaluateNode(
      this.objectNode.id,
      value === undefined ? "bang" : value,
    );
    if (evaluation) {
      this.objectNode.patch.vm?.sendEvaluationToMainThread?.(evaluation);
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
