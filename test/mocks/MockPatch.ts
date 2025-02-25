import { toConnectionType, OperatorContextType } from "@/lib/nodes/context";
import { MutableValue } from "@/lib/nodes/definitions/core/MutableValue";
import {
  type IOConnection,
  type Patch,
  type SubPatch,
  PatchType,
  type SerializedPatch,
  type ObjectNode,
  MessageType,
  type MessageNode,
  type SerializedConnection,
} from "@/lib/nodes/types";
import type { MockBaseNode } from "./MockBaseNode";
import type { ZenGraph } from "@/lib/zen/zen";
import type { Connections } from "@/contexts/PatchContext";
import { uuid } from "@/lib/uuid/IDGenerator";
import type { Statement } from "@/lib/nodes/definitions/zen/types";
import type { ExportedAudioUnit } from "@/lib/nodes/compilation/export";
import type { PatchDoc } from "@/lib/org/types";
import Subpatch from "@/lib/nodes/Subpatch";
import { VM } from "@/workers/vm/VM";
import { MockObjectNode } from "./MockObjectNode";

interface GraphContext {
  splitter?: ChannelSplitterNode;
  merger?: ChannelMergerNode;
  graph: ZenGraph;
  workletNode: AudioWorkletNode;
}

export class MockPatch implements Patch {
  type: PatchType;
  statementToExport?: Statement;
  id: string;
  objectNodes: ObjectNode[];
  messageNodes: MessageNode[];
  audioContext?: AudioContext;
  audioNode?: AudioNode;
  worklets: GraphContext[];
  counter: number;
  historyDependencies: Statement[];
  waiting: boolean;
  storedStatement?: Statement;
  name?: string;
  isCompiling: boolean;
  missedConnections: [SerializedConnection, ObjectNode, ObjectNode, number][];
  historyNodes: Set<ObjectNode>;
  setAudioWorklet?: (x: AudioWorkletNode | null) => void;
  outputStatements: Statement[];
  presentationMode: boolean;
  skipRecompile: boolean;
  setZenCode?: (x: string | null) => void;
  setVisualsCode?: (x: string | null) => void;
  zenCode?: string;
  wasmCode?: string;
  previousSerializedPatch?: SerializedPatch;
  previousDocId?: string;
  zenGraph?: ZenGraph;
  isZen: boolean;
  merger?: ChannelMergerNode;
  isSelected?: boolean;
  registerNewNode?: (node: MockBaseNode) => void;
  recorderWorklet?: AudioWorkletNode;
  isRecording: boolean;
  recordingStartedAt?: Date;
  exportedAudioUnit?: ExportedAudioUnit;
  lockedMode: boolean;
  docId?: string | undefined;
  doc?: PatchDoc | undefined;
  justExpanded?: boolean;
  viewed?: boolean;
  isInsideSlot?: boolean;
  scriptingNameToNodes: Record<string, ObjectNode[]> = {};
  setPatchWindows?: React.Dispatch<React.SetStateAction<Patch[]>>;
  setSideNodeWindow?: React.Dispatch<React.SetStateAction<ObjectNode | null>>;
  workletCode?: string;
  finishedInitialCompile: boolean;
  vm?: VM;

  constructor(audioContext: AudioContext | undefined, isZen = false, isSubPatch = false) {
    this.isZen = isZen;
    this.finishedInitialCompile = true;
    this.isRecording = false;
    this.id = uuid();
    this.presentationMode = false;
    this.historyNodes = new Set<ObjectNode>();
    this.skipRecompile = false;
    this.historyDependencies = [];
    this.counter = 0;
    this.type = PatchType.Zen;
    this.objectNodes = [];
    this.messageNodes = [];
    this.lockedMode = false;

    // TODO: ensure that this is base patch...
    this.audioContext = audioContext; //new AudioContext({ sampleRate: 44100 });
    this.worklets = [];
    this.waiting = false;
    this.storedStatement = undefined;
    this.missedConnections = [];
    this.isCompiling = false;
    this.outputStatements = [];

    if (!isSubPatch) {
      this.initializeRecorderWorklet();
    }
  }

  async initializeRecorderWorklet() {}

  startRecording() {}

  stopRecording() {}

  getBuffer() {}

  newObjectNode(): ObjectNode {
    return new MockObjectNode(this);
  }

  newSubPatch(parentPatch: Patch, parentNode: ObjectNode) {
    return new MockSubPatch(parentPatch, parentNode);
  }

  /**
   * Gets all object nodes within a patch (including sub-patches)
   * @return {ObjectNode[]} list of objectNodes
   */
  getAllNodes(visited = new Set<Patch>()): ObjectNode[] {
    if (visited.has(this as unknown as Patch)) {
      return [];
    }
    visited.add(this as unknown as Patch);
    const nodes = [...this.objectNodes];
    const subpatches = nodes.filter((x) => x.subpatch).map((x) => x.subpatch) as Patch[];
    const xyz = [...nodes, ...subpatches.flatMap((x: Patch) => x.getAllNodes(visited))];
    const slots = nodes.filter((x) => x.name === "slots~");
    for (const slotNode of slots) {
      if (slotNode.slots) {
        for (const slot of slotNode.slots) {
          xyz.push(...(slot.subpatch?.getAllNodes(visited) || []));
        }
      }
    }
    return xyz;
  }

  getAllMessageNodes(): MessageNode[] {
    const nodes = [...this.objectNodes];
    const subpatches = nodes.filter((x) => x.subpatch).map((x) => x.subpatch) as Patch[];
    const xyz = [...this.messageNodes, ...subpatches.flatMap((x: Patch) => x.getAllMessageNodes())];
    const slots = this.objectNodes.filter((x) => x.name === "slots~");
    for (const slotNode of slots) {
      if (slotNode.slots) {
        for (const slot of slotNode.slots) {
          xyz.push(...(slot.subpatch?.getAllMessageNodes() || []));
        }
      }
    }
    return xyz;
  }

  sendNumberNodes() {
    for (const node of this.getAllMessageNodes()) {
      if (node.messageType === MessageType.Number) {
        if (node.message !== undefined) {
          node.send(node.outlets[0], node.message);
        }
      }
    }
  }

  getSourceNodes() {
    return this.objectNodes.filter((node) => node.inlets.length === 0 && node.name !== "history");
  }

  // isZenBase tells us whether we are at the "base" of a "zen patch", i.e. the node that is considered
  // the "audio worklet"
  isZenBase() {
    const subpatch = this as unknown as Patch as SubPatch;
    if (!subpatch.parentPatch) {
      // were at the very base patch so cant be a zen base
      return false;
    }
    if (!subpatch.parentPatch.isZen) {
      return true;
    }
    return false;
  }

  getZenBase() {
    if (this.isZenBase()) {
      return this;
    }

    const parentPatch = (this as unknown as Patch as SubPatch).parentPatch;
    if (!parentPatch) {
      return null;
    }

    return parentPatch.getZenBase();
  }

  // mocked
  recompileGraph() {}

  // mocked
  disconnectGraph() {}

  startParameterNumberMessages() {
    const messageNodes = this.getAllMessageNodes();
    for (const messageNode of messageNodes) {
      if (messageNode.messageType === MessageType.Number) {
        if (messageNode.attributes["is parameter"]) {
          messageNode.receive(messageNode.inlets[0], "bang");
        }
      }
    }
  }

  sendNumberMessages(filterParameters = false) {
    const messageNodes = this.getAllMessageNodes();
    for (const messageNode of messageNodes) {
      if (messageNode.messageType === MessageType.Number) {
        if (filterParameters && !messageNode.attributes["is parameter"]) {
          continue;
        }
        if (!messageNode.attributes["is parameter"]) {
          messageNode.receive(messageNode.inlets[0], "bang");
        }
        if (messageNode.message !== undefined) {
          messageNode.receive(messageNode.inlets[1], messageNode.message);
        }
      }
    }
  }

  sendAttributeMessages() {
    const nodes = this.getAllNodes();
    const attruis = nodes.filter((x) => x.name === "attrui" || x.name === "color");
    for (const attrui of attruis) {
      attrui.receive(attrui.inlets[0], "bang");
    }
  }

  compile(statement: Statement, outputNumber?: number) {}

  getAudioConnections() {
    const parentNode = (this as unknown as Patch as SubPatch).parentNode;
    const connections: IOConnection[] = [];
    for (const outlet of parentNode.outlets) {
      outlet.connections.forEach((c) => connections.push(c));
    }
    for (const inlet of parentNode.inlets) {
      inlet.connections.forEach((c) => connections.push(c));
    }
    return connections;
  }

  setupAudioNode(audioNode: AudioNode) {}

  // re-parse every nodeo so that we "start from scratch"
  newHistoryDependency(newHistory: Statement, object: ObjectNode) {
    if (!this.historyDependencies.some((x) => x.node === object)) {
      this.historyDependencies = [newHistory, ...this.historyDependencies];
      this.historyNodes.add(object);
    }
  }

  getJSON(): SerializedPatch {
    const json: SerializedPatch = {
      id: this.id,
      name: this.name,
      objectNodes: this.objectNodes.map((x) => x.getJSON()),
      messageNodes: this.messageNodes.map((x) => x.getJSON()),
      presentationMode: this.presentationMode,
      doc: this.doc,
      docId: this.docId,
    };
    const parentNode = (this as Patch as SubPatch).parentNode;
    if (parentNode) {
      if (parentNode.attributes["Custom Presentation"]) {
        json.isCustomView = parentNode.attributes["Custom Presentation"] ? true : false;
        json.size = parentNode.size;
      }
      json.attributes = parentNode.attributes;
    }
    json.patchType = (this as Patch as SubPatch).patchType;
    return json;
  }

  fromJSON(x: SerializedPatch, isPreset?: boolean): Connections {
    return {};
  }

  clearCache() {
    if ((this as unknown as Subpatch).paramNodesCache) {
      (this as unknown as Subpatch).paramNodesCache = null;
    }
    for (const node of this.objectNodes) {
      node.clearCache();
      if (node.subpatch) {
        node.subpatch.clearCache();
      }
    }
  }

  async initialLoadCompile(base = true) {}

  setupPostCompile(useDeep = false) {}

  resolveMissedConnections() {
    for (const [connection, source, dest, outletNumber] of this.missedConnections) {
      let { destinationInlet } = connection;
      if (!destinationInlet) {
        destinationInlet = 0;
      }
      const inlet = dest.inlets[destinationInlet];
      const outlet = source.outlets[outletNumber];
      if (inlet && outlet) {
        source.connect(dest, inlet, outlet, false);
      }
    }

    this.missedConnections = [];
  }
}

export class MockSubPatch extends MockPatch implements SubPatch {
  parentPatch: Patch;
  parentNode: ObjectNode;
  patchType: OperatorContextType;

  constructor(parentPatch: Patch, parentNode: ObjectNode) {
    const parentNodeType = parentNode.attributes.type as string;
    super(parentPatch.audioContext!, parentNodeType === "zen", true);

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

    this.vm = parentPatch.vm;
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

  setupAudioPatch() {}
}
