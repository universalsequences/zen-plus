import type { OperatorContextType } from "@/lib/nodes/context";

type OperationType =
  | "newObjectNode"
  | "newMessageNode"
  | "editObjectNode"
  | "connectNode";

export interface NewObjectNode {
  id: string;
  name: string;
  type: OperatorContextType;
}

export interface EditObjectNode {
  id: string;
  text: string; // to parse
  type: OperatorContextType;
}

export interface ConnectNode {
  fromId: string;
  toId: string;
  inlet: number;
  outlet: number;
  compile: boolean;
}

export interface NewMessageNode {
  id: string;
}

export interface WorkerOperation {
  type: OperationType;
  body: EditObjectNode | NewObjectNode | NewMessageNode | ConnectNode;
}
