import type { Message, SerializedMessageNode, SerializedObjectNode } from "@/lib/nodes/types";
import type { SerializedInstruction } from "@/lib/nodes/vm/types";
import { VM, VMEvaluation } from "./vm/VM";
import { publish } from "@/lib/messaging/queue";

export interface NodeInstructions {
  nodeId: string;
  instructions: SerializedInstruction[];
}

export interface SetCompilation {
  // represent all the objects and messages in the instructions
  objects: SerializedObjectNode[];
  messages: SerializedMessageNode[];

  // instructions for each source node
  nodeInstructions: NodeInstructions[];
}

export interface SetCompilationBody {
  type: "setCompilation";
  body: SetCompilation;
}

export interface EvaluateNodeBody {
  type: "evaluateNode";
  body: {
    nodeId: string;
    message: Message;
  };
}

export interface AttrUIBody {
  type: "attrui";
  body: {
    nodeId: string;
    message: number;
  };
}

export interface PublishBody {
  type: "publish";
  body: {
    type: string;
    message: Message;
  };
}

export interface UpdateNodeBody {
  type: "updateObject";
  body: {
    nodeId: string;
    json: SerializedObjectNode;
  };
}

export interface UpdateMessageBody {
  type: "updateMessage";
  body: {
    nodeId: string;
    json: SerializedMessageNode;
  };
}

export interface LoadBangBody {
  type: "loadbang";
}

export type MessageBody =
  | SetCompilationBody
  | EvaluateNodeBody
  | UpdateNodeBody
  | UpdateMessageBody
  | LoadBangBody
  | PublishBody
  | AttrUIBody;

const vm = new VM();

// sends one round of instructions evaluation to the main thread
const sendEvaluationToMainThread = (data: VMEvaluation) => {
  const {
    mutableValueChanged,
    replaceMessages,
    onNewValue,
    onNewSharedBuffer,
    mainThreadInstructions,
    onNewValues,
    attributeUpdates,
  } = data;

  onNewSharedBuffer.push(...vm.newSharedBuffers);

  if (attributeUpdates.length > 0) {
    self.postMessage({
      type: "attributeUpdates",
      body: attributeUpdates,
    });
  }
  if (replaceMessages.length > 0)
    self.postMessage({
      type: "replaceMessages",
      body: replaceMessages,
    });

  if (mainThreadInstructions.length > 0)
    self.postMessage({
      type: "mainThreadInstructions",
      body: mainThreadInstructions,
    });

  if (onNewSharedBuffer.length > 0)
    self.postMessage({
      type: "onNewSharedBuffer",
      body: onNewSharedBuffer,
    });

  if (onNewValue.length > 0) {
    self.postMessage({
      type: "onNewValue",
      body: onNewValue,
    });
  }

  if (onNewValues.length > 0) {
    self.postMessage({
      type: "onNewValues",
      body: onNewValues,
    });
  }

  if (mutableValueChanged.length > 0) {
    self.postMessage({
      type: "mutableValueChanged",
      body: mutableValueChanged,
    });
  }

  vm.clear();
};

vm.sendEvaluationToMainThread = sendEvaluationToMainThread;

self.onmessage = async (e: MessageEvent) => {
  const data = e.data as MessageBody;

  if (data.type === "setCompilation") {
    //console.log("received worker message", data.body.objects);
    const { onNewSharedBuffer } = vm.setNodes(data.body.objects, data.body.messages);
    if (onNewSharedBuffer.length > 0) {
      self.postMessage({
        type: "onNewSharedBuffer",
        body: onNewSharedBuffer,
      });
    }
    vm.setNodeInstructions(data.body.nodeInstructions);
  } else if (data.type === "evaluateNode") {
    const vmEvaluation = vm.evaluateNode(data.body.nodeId, data.body.message);
    sendEvaluationToMainThread(vmEvaluation);
  } else if (data.type === "updateObject") {
    const { nodeId, json } = data.body;
    vm.updateObject(nodeId, json);
  } else if (data.type === "updateMessage") {
    const { nodeId, json } = data.body;
    vm.updateMessage(nodeId, json);
  } else if (data.type === "loadbang") {
    vm.loadBang();
  } else if (data.type === "attrui") {
    const vmEvaluation = vm.sendAttrUI(data.body.nodeId, data.body.message);
    if (vmEvaluation) {
      sendEvaluationToMainThread(vmEvaluation);
    }
  } else if (data.type === "publish") {
    // we wish to publish a message
    publish(data.body.type, data.body.message);
  }
};
