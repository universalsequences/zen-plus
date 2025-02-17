import type { Statement } from "./definitions/zen/types";
import { toConnectionType, OperatorContextType } from "./context";
import { PatchImpl } from "./Patch";
import { type ObjectNode, type Message, type Patch, type SubPatch, PatchType } from "./types";
//import ObjectNodeImpl from "./ObjectNode";
import { MutableValue } from "./definitions/core/MutableValue";

/**
 * The way sub-patches work is there is an ObjectNode that defines a subpatch object
 * which then instantiates this class for that node-- passing itself and the parent patcher
 * whenever that parent node gets a message it looks for objects inside this patch called "in 1/2/3"
 * depending on the inlet received on, and sends it to there
 * this patch will work just as the other patch, and end at an "out 1" which will trigger
 * a compile() call, which we will simply pass out the outlet of the parent node
 */
export default class Subpatch extends PatchImpl implements SubPatch {
  parentPatch: Patch;
  parentNode: ObjectNode;
  patchType: OperatorContextType;

  constructor(parentPatch: Patch, parentNode: ObjectNode) {
    const parentNodeType = parentNode.attributes.type as string;
    super(parentPatch.audioContext!, parentNodeType === "zen", true);

    this.sendWorkerMessage = parentPatch.sendWorkerMessage;

    this.parentPatch = parentPatch;
    this.parentNode = parentNode;
    this.parentNode.newAttribute("Custom Presentation", false);

    this.patchType = OperatorContextType.ZEN;

    const patchType = this.determinePatchType(parentNodeType);
    this.setupConnectionTypes();

    if (patchType === OperatorContextType.AUDIO) {
      this.setupAudioPatch();
    } else {
      this._setupInitialNodes();
    }
  }

  private determinePatchType(parentNodeType: string) {
    if (typeof parentNodeType === "string") {
      this.setupPatchType(parentNodeType);
    } else {
      const parentSubPatch = this.parentPatch as SubPatch;
      if (
        parentSubPatch.parentPatch &&
        (parentSubPatch.patchType === OperatorContextType.ZEN ||
          parentSubPatch.patchType === OperatorContextType.GL)
      ) {
        this.patchType =
          parentNodeType === "zen" ? OperatorContextType.ZEN : parentSubPatch.patchType;
      }
    }
    return this.patchType;
  }

  private setupConnectionTypes() {
    if (this.patchType !== OperatorContextType.ZEN) {
      this.parentNode.operatorContextType = this.patchType;
      const connectionType = toConnectionType(this.patchType);
      this.parentNode.inlets.forEach((inlet) => (inlet.connectionType = connectionType));
      this.parentNode.outlets.forEach((outlet) => (outlet.connectionType = connectionType));
    }
  }

  setupPatchType(_type: string) {
    let types: any = {
      gl: OperatorContextType.GL,
      zen: OperatorContextType.ZEN,
      audio: OperatorContextType.AUDIO,
      core: OperatorContextType.CORE,
    };
    if (_type in types) {
      this.patchType = types[_type];
    }
  }

  clearPatch() {
    this.name = undefined;
    this.disconnectGraph();
    this._setupInitialNodes();
    this.recompileGraph();
    this.docId = undefined;
    this.doc = undefined;
    this.parentNode.attributes["Custom Presentation"] = false;
  }

  _setupInitialNodes() {
    /*
    const ZEN = OperatorContextType.ZEN;
    let in1 = new ObjectNodeImpl(this as Patch);
    in1.parse("in 1", ZEN, false);

    let in2 = new ObjectNodeImpl(this as Patch);
    in2.parse("in 2", ZEN, false);

    let out1 = new ObjectNodeImpl(this as Patch);
    out1.parse("out 1", ZEN, false);

    let out2 = new ObjectNodeImpl(this as Patch);
    out2.parse("out 2", ZEN, false);

    in1.connect(out1, out1.inlets[0], in1.outlets[0], false);
    in2.connect(out2, out2.inlets[0], in2.outlets[0], false);

    in1.position = { x: 100, y: 100 };
    in2.position = { x: 300, y: 100 };
    out1.position = { x: 100, y: 300 };
    out2.position = { x: 300, y: 300 };

    this.objectNodes = [in1, out1, in2, out2];
    this.messageNodes = [];
    */
  }

  recompileGraph(force?: boolean): void {
    // when recompile graph is called from the UI, we want to go up the tree of patches
    // until we reach the top of the Zen Node this represents
    if (this.patchType === OperatorContextType.CORE) {
      return;
    }
    if (force) {
      super.recompileGraph();
      return;
    }

    // NOTE: THIS MIGHT BE WRONG! (I HAVE NO IDEA WHAT IM DOING)
    if (this.isZenBase() && this.patchType !== OperatorContextType.GL) {
      super.recompileGraph();
      return;
    }

    if (!this.parentPatch.isZen) {
      if (this.patchType !== OperatorContextType.ZEN) {
        this.parentPatch.recompileGraph();
      } else {
        console.log("is zen so super.recompile", this);
        super.recompileGraph();
      }
    } else {
      this.parentPatch.recompileGraph();
    }
  }

  compile(statement: Statement | Message, outputNumber?: number) {
    // this will get called for any "out" nodes that get called...
    // this should look at the node
    if (!this.parentPatch.isZen && this.patchType === OperatorContextType.ZEN) {
      // then we are actually in at the top of a Zen Patch and thus should compile properly
      if (
        (typeof statement === "string" || typeof statement === "object") &&
        !Array.isArray(statement)
      ) {
      } else {
        super.compile(statement as Statement, outputNumber);
        return;
      }
    }

    if (outputNumber === undefined) {
      return;
    }

    let outlet = this.parentNode.outlets[outputNumber - 1];
    this.parentNode.send(outlet, statement);
    if (outlet && outlet.callback) {
      outlet.callback(statement);
    }
  }

  // Cache for parameter nodes
  paramNodesCache: {
    params: ObjectNode[];
    tagParams: ObjectNode[];
    attruis: ObjectNode[];
  } | null = null;

  private buildParamNodesCache() {
    const nodes = this.getAllNodes();
    this.paramNodesCache = {
      params: nodes.filter((x) => x.name === "param" || x.name === "uniform"),
      tagParams: nodes.filter(
        (x) => (x.name === "param" || x.name === "uniform") && x.attributes.tag,
      ),
      attruis: nodes.filter((x) => x.name === "attrui"),
    };
  }

  processMessageForParam(message: Message) {
    if (typeof message !== "string") {
      return false;
    }

    const tokens = message.split(" ").filter((x) => x.length > 0);
    const paramName = tokens[0];
    const paramValue: number = Number.parseFloat(tokens[1]);
    if (Number.isNaN(paramValue)) {
      return false;
    }

    const time: number | undefined =
      tokens[2] !== undefined ? Number.parseFloat(tokens[2]) : undefined;

    // Build cache if needed
    if (!this.paramNodesCache) {
      this.buildParamNodesCache();
    }

    // Use cached nodes
    const { params, tagParams, attruis } = this.paramNodesCache!;
    let found = false;

    // Handle params with matching name
    for (const param of params) {
      if (param.arguments[0] === paramName) {
        param.receive(param.inlets[0], time !== undefined ? [paramValue, time] : paramValue);
        found = true;
      }
    }

    // Handle params with matching tag
    for (const param of tagParams) {
      if (param.attributes.tag === paramName) {
        const max = param.attributes.max as number;
        const min = param.attributes.min as number;
        const val = min + (max - min) * paramValue;
        param.receive(param.inlets[0], time !== undefined ? [val, time] : val);
        found = true;
      }
    }

    // Handle attruis with matching name
    for (const attrui of attruis) {
      if (attrui.arguments[0] === paramName) {
        const text = attrui.text.split(" ");
        text[2] = paramValue.toString();
        attrui.text = text.join(" ");
        attrui.arguments[1] = paramValue;
        (attrui.custom as MutableValue).value = paramValue;
      }
    }

    return found;
  }

  clearState() {
    // re-parse every node so that we "start from scratch"
    for (const node of this.objectNodes) {
      for (const n of node.inlets) {
        n.lastMessage = undefined;
      }
      node.parse(node.text, OperatorContextType.ZEN, false);
    }
  }

  newHistoryDependency(newHistory: Statement, object: ObjectNode) {
    if (!this.parentPatch.isZen) {
      // then we are actually in at the top of a Zen Patch and thus should compile properly
      super.newHistoryDependency(newHistory, object);
      return;
    }
    this.parentPatch.newHistoryDependency(newHistory, object);
  }

  setupAudioPatch() {
    const inputMerger = this.audioContext.createChannelMerger(16);
    const outputMerger = this.audioContext.createChannelMerger(16);
    const parentNode = (this as SubPatch).parentNode;
    if (parentNode) {
      parentNode.merger = inputMerger;
      //merger.connect(ret.workletNode);
    }

    this.audioNode = outputMerger;
    if (parentNode) {
      parentNode.useAudioNode(this.audioNode);
      //this.audioNode.connect(this.audioContext.destination);
    }
  }
}
