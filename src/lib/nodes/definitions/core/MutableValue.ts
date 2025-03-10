import type { ObjectNode, Message, SerializableCustom } from "@/lib/nodes/types";
import { publish } from "@/lib/messaging/queue";
import { OnNewValues, VMEvaluation } from "@/workers/vm/VM";
import { OperatorContextType } from "../../context";

export class MutableValue implements SerializableCustom {
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

    /*
    this.objectNode.patch.vm?.mutableValueChanged.push({
      nodeId: this.objectNode.id,
      value: x as Message,
    });
    */
    this.updateMainThread();
  }

  get value() {
    return this._value;
  }

  fromJSON(x: any) {
    this._value = x;

    if (this.objectNode.onNewValue && this.useOnNewValue) {
      this.objectNode.onNewValue(x);
    }

    if (this.objectNode.operatorContextType === OperatorContextType.AUDIO) {
      this.objectNode.receive(this.objectNode.inlets[0], this.value);
    }
    this.updateMainThread();
  }

  getJSON() {
    return this.value;
  }

  execute(x?: number) {
    const evaluation = this.objectNode.patch.vm?.evaluateNode(
      this.objectNode.id,
      x === undefined ? "bang" : x,
    );
    if (evaluation) {
      this.objectNode.patch.vm?.sendEvaluationToMainThread?.(evaluation);
    }
  }

  updateMainThread(onNewValues?: OnNewValues[]) {
    const evaluation: VMEvaluation = {
      instructionsEvaluated: [],
      replaceMessages: [],
      objectsEvaluated: [],
      mainThreadInstructions: [],
      optimizedMainThreadInstructions: [],
      onNewValue: [],
      onNewSharedBuffer: [],
      mutableValueChanged: [
        {
          nodeId: this.objectNode.id,
          value: this.value,
        },
      ],
      onNewValues: onNewValues || [],
      attributeUpdates: [],
      onNewStepSchema: [],
    };
    this.objectNode.patch.vm?.sendEvaluationToMainThread?.(evaluation);
  }
}
