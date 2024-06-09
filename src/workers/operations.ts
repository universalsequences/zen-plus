import type { NewObjectNode, WorkerOperation } from "./types";

const newObjectNode = (body: NewObjectNode) => {};

export const handleWorkerOperation = (operation: WorkerOperation) => {
  switch (operation.type) {
    case "newObjectNode":
      newObjectNode(operation.body as NewObjectNode);
      break;
  }
};
