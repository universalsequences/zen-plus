import type {
  Message,
  SerializedMessageNode,
  SerializedObjectNode,
  Node,
  Patch,
} from "@/lib/nodes/types";
import type { SerializedInstruction } from "@/lib/nodes/vm/types";
import { VM } from "./VM";

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

export type MessageBody = SetCompilationBody | EvaluateNodeBody;
const vm = new VM();

self.onmessage = async (e: MessageEvent) => {
  const data = e.data as MessageBody;

  if (data.type === "setCompilation") {
    console.log("received worker message");
    vm.setNodes(data.body.objects, data.body.messages);
    vm.setNodeInstructions(data.body.nodeInstructions);
  } else if (data.type === "evaluateNode") {
    const { replaceMessages } = vm.evaluateNode(data.body.nodeId, data.body.message);
    self.postMessage({
      type: "replaceMessages",
      body: replaceMessages,
    });
  }
};
