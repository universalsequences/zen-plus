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
} from "./types";
import type { BaseNode } from "./BaseNode";
import type { PresetManager } from "@/lib/nodes/definitions/core/preset";
import Assistant from "@/lib/openai/assistant";
import type { ZenGraph } from "@/lib/zen/zen";
import { OperatorContextType } from "./context";
import ObjectNodeImpl from "./ObjectNode";
import MessageNodeImpl from "./MessageNode";
import type { Connections } from "@/contexts/PatchContext";
import {
  currentUUID,
  uuid,
  plusUUID,
  registerUUID,
} from "@/lib/uuid/IDGenerator";
import type { Statement } from "./definitions/zen/types";
import { recompileGraph } from "./compilation/recompileGraph";
import { mergeAndExportToWav } from "@/utils/wav";
import { onCompile, sleep } from "./compilation/onCompile";
import type { ExportedAudioUnit, ParameterData } from "./compilation/export";

interface GraphContext {
  splitter?: ChannelSplitterNode;
  merger?: ChannelMergerNode;
  graph: ZenGraph;
  workletNode: AudioWorkletNode;
}

export class PatchImpl implements Patch {
  type: PatchType;
  id: string;
  objectNodes: ObjectNode[];
  messageNodes: MessageNode[];
  audioContext: AudioContext;
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
  assistant: Assistant;
  isSelected?: boolean;
  registerNewNode?: (node: BaseNode) => void;
  recorderWorklet?: AudioWorkletNode;
  isRecording: boolean;
  recordingStartedAt?: Date;
  exportedAudioUnit?: ExportedAudioUnit;
  lockedMode: boolean;

  constructor(audioContext: AudioContext, isZen = false, isSubPatch = false) {
    this.isZen = isZen;
    this.isRecording = false;
    this.id = uuid();
    this.assistant = new Assistant(this);
    this.presentationMode = false;
    this.historyNodes = new Set<ObjectNode>();
    this.skipRecompile = false;
    this.historyDependencies = [];
    this.counter = 0;
    this.type = PatchType.Zen;
    this.objectNodes = [];
    this.messageNodes = [];
    this.lockedMode = true;

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

  async initializeRecorderWorklet() {
    const audioContext = this.audioContext;
    const processor = "recorder-processor";
    await audioContext.audioWorklet.addModule("/RecorderWorklet.js");
    this.recorderWorklet = new AudioWorkletNode(audioContext, processor);
    this.recorderWorklet.port.onmessage = async (e: MessageEvent) => {
      const { type, data } = e.data.message;
      if (type === "flush") {
        const chunk = { recLength: data.recLength, buffers: data.buffers };
        const blob = await mergeAndExportToWav(
          [chunk],
          this.audioContext.sampleRate,
        );
        if (!blob) return;
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d*/, "");
        const filename = `zen-plus-${timestamp}.wav`;

        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = filename;

        // Simulate click to trigger download
        a.click();

        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    };
  }

  startRecording() {
    this.recorderWorklet?.port.postMessage({ message: "clear" });
    this.recorderWorklet?.port.postMessage({ message: "record" });
    this.isRecording = true;
    this.recordingStartedAt = new Date();
  }

  stopRecording() {
    this.recorderWorklet?.port.postMessage({ message: "stop" });
    this.isRecording = false;
  }

  getBuffer() {
    this.recorderWorklet?.port.postMessage({ message: "flush" });
  }

  /**
   * Gets all object nodes within a patch (including sub-patches)
   * @return {ObjectNode[]} list of objectNodes
   */
  getAllNodes(): ObjectNode[] {
    const nodes = [...this.objectNodes];
    const subpatches = nodes
      .filter((x) => x.subpatch)
      .map((x) => x.subpatch) as Patch[];
    return [...nodes, ...subpatches.flatMap((x: Patch) => x.getAllNodes())];
  }

  getAllMessageNodes(): MessageNode[] {
    const nodes = [...this.objectNodes];
    const subpatches = nodes
      .filter((x) => x.subpatch)
      .map((x) => x.subpatch) as Patch[];
    return [
      ...this.messageNodes,
      ...subpatches.flatMap((x: Patch) => x.getAllMessageNodes()),
    ];
  }

  getSourceNodes() {
    return this.objectNodes.filter(
      (node) => node.inlets.length === 0 && node.name !== "history",
    );
  }

  // isZenBase tells us whether we are at the "base" of a "zen patch", i.e. the node that is considered
  // the "audio worklet"
  isZenBase() {
    if (!(this as Patch as SubPatch).parentPatch) {
      return false;
    }
    if (!(this as Patch as SubPatch).parentPatch.isZen) {
      return true;
    }
    return false;
  }

  getZenBase() {
    if (this.isZenBase()) {
      return this;
    }

    const parentPatch = (this as Patch as SubPatch).parentPatch;
    if (!parentPatch) {
      return null;
    }

    return parentPatch.getZenBase();
  }

  recompileGraph() {
    recompileGraph(this);
  }

  disconnectGraph() {
    for (const { workletNode, splitter, graph, merger } of this.worklets) {
      console.log("disconnecting worklet", workletNode);
      for (const connection of this.getAudioConnections()) {
        connection.source.disconnectAudioNode(connection);
      }

      workletNode.disconnect();
      if (splitter) {
        splitter.disconnect();
      }
      if (merger) {
        merger.disconnect();
      }

      workletNode.port.postMessage({
        type: "dispose",
      });
      graph.context.disposed = true;
      workletNode.port.onmessage = null;
    }
    this.worklets.length = 0;
  }

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
    const attruis = nodes.filter((x) => x.name === "attrui");
    for (const attrui of attruis) {
      attrui.receive(attrui.inlets[0], "bang");
    }
  }

  compile(statement: Statement, outputNumber?: number) {
    onCompile(this, statement, outputNumber);
  }

  getAudioConnections() {
    const parentNode = (this as Patch as SubPatch).parentNode;
    const connections: IOConnection[] = [];
    for (const outlet of parentNode.outlets) {
      outlet.connections.forEach((c) => connections.push(c));
    }
    for (const inlet of parentNode.inlets) {
      inlet.connections.forEach((c) => connections.push(c));
    }
    return connections;
  }

  setupAudioNode(audioNode: AudioNode) {
    const parentNode = (this as Patch as SubPatch).parentNode;
    if (parentNode) {
      for (const outlet of parentNode.outlets) {
        outlet.connections.forEach((c) => parentNode.connectAudioNode(c));
      }
      for (const inlet of parentNode.inlets) {
        inlet.connections.forEach((c) => c.source.connectAudioNode(c));
      }
    }

    const nodes = this.getAllNodes();
    const speakerNodes = nodes.filter((x) => x.name === "speakers~");
    for (const node of speakerNodes) {
      node.useAudioNode(audioNode);
      for (const outlet of node.outlets) {
        for (const connection of outlet.connections) {
          node.connectAudioNode(connection);
        }
      }
      // reconnect any connections
    }
    this.resolveMissedConnections();

    if (parentNode) {
      if (parentNode.parentSlots) {
        parentNode.parentSlots.receive(
          parentNode.parentSlots.inlets[0],
          "reconnect",
        );
      }
    }
  }

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
    };
    const parentNode = (this as any as SubPatch).parentNode;
    if (parentNode) {
      if (parentNode.attributes["Custom Presentation"]) {
        json.isCustomView = parentNode.attributes["Custom Presentation"]
          ? true
          : false;
        json.size = parentNode.size;
      }
      json.attributes = parentNode.attributes;
    }
    return json;
  }

  fromJSON(x: SerializedPatch, isPreset?: boolean): Connections {
    this.skipRecompile = true;
    this.name = x.name;

    this.objectNodes = [];
    this.messageNodes = [];
    this.presentationMode =
      x.presentationMode === undefined ? false : x.presentationMode;

    const parentNode = (this as any as SubPatch).parentNode;
    if (parentNode) {
      if (x.isCustomView) {
        parentNode.attributes["Custom Presentation"] = x.isCustomView;
        parentNode.size = x.size;
      }
    }

    this.id = x.id;
    if ((this as Patch as SubPatch).parentNode) {
      const node = (this as Patch as SubPatch).parentNode;
      node.inlets = [];
    }

    const ids: any = {};
    if (x.messageNodes) {
      for (const serializedNode of x.messageNodes) {
        const messageNode = new MessageNodeImpl(
          this,
          serializedNode.messageType,
        );
        messageNode.fromJSON(serializedNode);
        this.messageNodes.push(messageNode);
        ids[messageNode.id] = messageNode;
      }
    }

    for (const serializedNode of x.objectNodes) {
      let objectNode = new ObjectNodeImpl(this);
      const tokens = serializedNode.text.split(" ");
      const name = tokens[0];
      let found = false;
      if (name === "in" || name === "out") {
        const arg = Number.parseInt(tokens[1]);
        const _objectNode = this.objectNodes.find(
          (x) => x.name === name && x.arguments[0] === arg,
        );
        if (_objectNode) {
          objectNode = _objectNode as ObjectNodeImpl;
          objectNode.id = serializedNode.id;
          objectNode.position = serializedNode.position;
          for (const outlet of objectNode.outlets) {
            outlet.connections = [];
          }
          for (const inlet of objectNode.inlets) {
            inlet.connections = [];
          }
          found = true;
        }
      }

      if (!found) {
        objectNode.fromJSON(serializedNode, isPreset);
      }

      this.objectNodes.push(objectNode);
      ids[objectNode.id] = objectNode;
    }

    // now that we have added all the nodes time to patch them up
    let i = 0;
    const connections: Connections = {};

    const currentId = currentUUID();
    const missedConnections: [
      SerializedConnection,
      ObjectNode,
      ObjectNode,
      number,
    ][] = [];
    for (const serializedNode of [
      ...x.objectNodes,
      ...(x.messageNodes || []),
    ]) {
      const node = ids[serializedNode.id];
      if (node) {
        const nodeConnections = [];
        for (const outlet of serializedNode.outlets) {
          let { outletNumber, connections } = outlet;
          if (!outletNumber) {
            outletNumber = 0;
          }
          for (const connection of connections) {
            let { destinationId, destinationInlet, segmentation } = connection;
            if (!destinationInlet) {
              destinationInlet = 0;
            }
            const destination: ObjectNode = ids[destinationId];
            if (destination) {
              const inlet = destination.inlets[destinationInlet];
              const outlet = node.outlets[outletNumber];
              if (inlet && outlet) {
                const _connection = node.connect(
                  destination,
                  inlet,
                  outlet,
                  false,
                );
                _connection.segmentation = segmentation;
                nodeConnections.push(_connection);
              } else {
                missedConnections.push([
                  connection,
                  node,
                  destination,
                  outletNumber,
                ]);
              }
            }
          }
        }
        connections[node.id] = nodeConnections;
      }
      i++;
    }

    this.missedConnections = missedConnections;
    const _connections: Connections = { ...connections };
    let num = 1;
    if (isPreset) {
      for (const node of [...this.objectNodes, ...this.messageNodes]) {
        const oldId = node.id;
        const newId = plusUUID(num.toString(36), currentId);
        registerUUID(newId);
        _connections[newId] = connections[oldId];
        delete _connections[oldId];
        node.id = newId;
        num++;
      }
    }
    for (const messageNode of this.messageNodes) {
      if (messageNode.message) {
        messageNode.receive(messageNode.inlets[1], messageNode.message);
      }
    }
    this.skipRecompile = false;

    if (!(this as Patch as SubPatch).parentNode) {
      this.initialLoadCompile();
      /*
           for (let node of this.objectNodes) {
               if (node.subpatch && node.subpatch.isZenBase()) {
                   for (let outlet of node.outlets) {
                       for (let c of outlet.connections) {
                           if (c.splitter) {
                               node.disconnectAudioNode(c);
                           }
                           node.connectAudioNode(c);
                       }
                   }
               }
           }
           */
    }

    // now hydrate all presets
    const nodes = this.getAllNodes();
    const presets = nodes.filter((x) => x.name === "preset");
    for (const preset of presets) {
      const custom = preset.custom as any as PresetManager;
      if (custom) {
        custom.hydrateSerializedPresets(nodes);
      }
    }

    const loadBangs = this.objectNodes.filter(
      (x) => x.operatorContextType === OperatorContextType.CORE && x.needsLoad,
    );
    loadBangs.forEach((x) => x.receive(x.inlets[0], "bang"));

    return _connections;
  }

  async initialLoadCompile() {
    this.recompileGraph();

    const compiled: Patch[] = [];
    for (const node of this.objectNodes) {
      if (
        node.subpatch?.isZenBase() &&
        node.subpatch.patchType !== OperatorContextType.AUDIO &&
        node.subpatch.patchType !== OperatorContextType.CORE
      ) {
        if (
          this.isZenBase() &&
          (this as Patch as SubPatch).patchType === OperatorContextType.ZEN
        ) {
          continue;
        }
        node.subpatch.recompileGraph();
        let i = 0;
        while (!node.audioNode) {
          await sleep(10);
          i++;
          if (i > 50) {
            // max wwait time of 500 ms
            break;
          }
        }
        compiled.push(node.subpatch);
      } else if (
        node.subpatch &&
        (node.subpatch.patchType === OperatorContextType.AUDIO ||
          node.subpatch.patchType === OperatorContextType.CORE)
      ) {
        await node.subpatch.initialLoadCompile();
      }
    }

    this.setupPostCompile();
  }

  setupPostCompile(useDeep = false) {
    for (const node of this.getAllNodes()) {
      if (node.name === "send~" || node.name === "publishPatchSignals") {
        node.parse(node.text);
      }
      for (const outlet of node.outlets) {
        if (outlet.connectionType === ConnectionType.AUDIO) {
          // reconnect...
          for (const connection of outlet.connections) {
            node.disconnectAudioNode(connection);
            node.connectAudioNode(connection);
          }
        }
      }
    }

    this.sendAttributeMessages();

    const o = useDeep ? this.getAllNodes() : this.objectNodes;
    const loadBangs = o.filter(
      (x) => x.operatorContextType === OperatorContextType.CORE && x.needsLoad,
    );
    loadBangs.forEach((x) => x.receive(x.inlets[0], "bang"));
  }

  resolveMissedConnections() {
    for (const [connection, source, dest, outletNumber] of this
      .missedConnections) {
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
