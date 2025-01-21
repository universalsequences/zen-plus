import {
  type IOConnection,
  type Patch,
  type SubPatch,
  PatchType,
  type SerializedPatch,
  ConnectionType,
  type ObjectNode,
  MessageType,
  type MessageNode,
  type SerializedConnection,
} from "@/lib/nodes/types";
import type { MockBaseNode } from "./MockBaseNode";
import type { PresetManager } from "@/lib/nodes/definitions/core/preset";
import type { ZenGraph } from "@/lib/zen/zen";
import { OperatorContextType } from "@/lib/nodes/context";
import { MockObjectNode } from "./MockObjectNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import type { Connections } from "@/contexts/PatchContext";
import { currentUUID, uuid, plusUUID, registerUUID } from "@/lib/uuid/IDGenerator";
import type { Statement } from "@/lib/nodes/definitions/zen/types";
import { recompileGraph } from "@/lib/nodes/compilation/recompileGraph";
import { onCompile, sleep } from "@/lib/nodes/compilation/onCompile";
import type { ExportedAudioUnit } from "@/lib/nodes/compilation/export";
import type { PatchDoc } from "@/lib/org/types";
import Subpatch from "@/lib/nodes/Subpatch";

interface GraphContext {
  splitter?: ChannelSplitterNode;
  merger?: ChannelMergerNode;
  graph: ZenGraph;
  workletNode: AudioWorkletNode;
}

let ID_COUNTER = 0;
export class Test implements Patch {
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

  constructor(audioContext: AudioContext | undefined, isZen = false, isSubPatch = false) {
    console.log("mock");
    this.isZen = isZen;
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

  recompileGraph() {
    recompileGraph(this);
  }

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
}
