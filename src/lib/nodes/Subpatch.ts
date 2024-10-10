import type { Statement } from "./definitions/zen/types";
import { toConnectionType, OperatorContextType } from "./context";
import { PatchImpl } from "./Patch";
import type { ObjectNode, Message, Patch, SubPatch } from "./types";
import ObjectNodeImpl from "./ObjectNode";
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
    super(parentPatch.audioContext, parentNodeType === "zen", true);

    this.parentPatch = parentPatch;
    this.parentNode = parentNode;
    this.parentNode.newAttribute("Custom Presentation", false);

    this.patchType = OperatorContextType.ZEN;

    const patchType = this.determinePatchType(parentNodeType);
    this.setupConnectionTypes();

    if (patchType === OperatorContextType.AUDIO) {
      console.log('setting up audio patch');
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
      if (parentSubPatch.parentPatch &&
          (parentSubPatch.patchType === OperatorContextType.ZEN ||
           parentSubPatch.patchType === OperatorContextType.GL)) {
        this.patchType = parentNodeType === "zen" ? OperatorContextType.ZEN : parentSubPatch.patchType;
      }
    }
    return this.patchType;
  }

  private setupConnectionTypes() {
    if (this.patchType !== OperatorContextType.ZEN) {
      this.parentNode.operatorContextType = this.patchType;
      const connectionType = toConnectionType(this.patchType);
      this.parentNode.inlets.forEach(inlet => inlet.connectionType = connectionType);
      this.parentNode.outlets.forEach(outlet => outlet.connectionType = connectionType);
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
    this.parentNode.attributes["Custom Presentation"] = false;
  }

  _setupInitialNodes() {
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
  }

  recompileGraph(force?: boolean): void {
    if (this.patchType === OperatorContextType.CORE) {
      return;
    }
    if (force) {
      super.recompileGraph();
      return;
    }

    // NOTE: THIS MIGHT BE WRONG! (I HAVE NO IDEA WHAT IM DOING)
    if (this.isZenBase()) {
      super.recompileGraph();
      return;
    }

    if (!this.parentPatch.isZen) {
      if (this.patchType !== OperatorContextType.ZEN) {
        this.parentPatch.recompileGraph();
      } else {
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

  /**
   * This is called when a parameter-setting message is received
   * @param message 
   * @returns 
   */
  processMessageForParam(message: Message) {
    if (typeof message === "string") {
      const tokens = message.split(" ").filter((x) => x.length > 0);
      const paramName = tokens[0];
      const paramValue: number = Number.parseFloat(tokens[1]);
      if (Number.isNaN(paramValue)) {
        return false;
      }

      const time: number | undefined =
        tokens[2] !== undefined ? Number.parseFloat(tokens[2]) : undefined;

      // look for parameters in this patch
      const nodes = this.getAllNodes().filter((x) => x.name === "param" || x.name === "uniform");
      const params = nodes.filter((x) => x.arguments[0] === paramName);
      for (const x of params) {
        x.receive(x.inlets[0], time !== undefined ? [paramValue, time] : paramValue);
      }
      const tagParams = nodes.filter((x) => x.attributes["tag"] === paramName);
      for (const param of tagParams) {
        const max = param.attributes["max"] as number;
        const min = param.attributes["min"] as number;
        const val = min + (max - min) * paramValue;
        param.receive(param.inlets[0], time !== undefined ? [val, time] : val);
      }

      const attriUIs = this.getAllNodes().filter(
        (x) => x.name === "attrui" && x.arguments[0] === paramName,
      );
      for (const attriUI of attriUIs) {
        let text = attriUI.text.split(" ");
        text[2] = paramValue.toString();
        attriUI.text = text.join(" ");
        attriUI.arguments[1] = paramValue;

        (attriUI.custom as MutableValue).value = paramValue;
      }
      if (params.length > 0) {
        return true;
      }
    }
    return false;
  }

  clearState() {
    // re-parse every node so that we "start from scratch"
    for (let node of this.objectNodes) {
      node.inlets.forEach((n) => {
        n.lastMessage = undefined;
      });
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
    console.log('setup audio patch called', this);
    let inputMerger = this.audioContext.createChannelMerger(16);
    let outputMerger = this.audioContext.createChannelMerger(16);
    let parentNode = (this as SubPatch).parentNode;
    if (parentNode) {
      parentNode.merger = inputMerger;
      //merger.connect(ret.workletNode);
    }

    this.audioNode = outputMerger;
    if (parentNode) {
      console.log('setting up audio patch', parentNode);
      parentNode.useAudioNode(this.audioNode);
      //this.audioNode.connect(this.audioContext.destination);
    }
  }
}
