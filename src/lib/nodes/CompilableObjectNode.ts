import { ObjectNode, Patch } from "./types";

class CompilableObjectNode extends ObjectNode {
  constructor(patch: Patch, id?: string) {
    super(patch, id);
  }
}

export default CompilableObjectNode;
