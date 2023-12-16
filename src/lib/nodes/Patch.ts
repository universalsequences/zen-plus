import { Patch, SubPatch, PatchType, SerializedPatch, ObjectNode, MessageType, MessageNode, Message, SerializedConnection } from './types';
import { initMemory, ZenWorklet } from '@/lib/zen/worklet';
import { traverseForwards } from './traverse';
import { ZenGraph } from '@/lib/zen/zen'
import { OperatorContextType } from './context';
import ObjectNodeImpl from './ObjectNode';
import MessageNodeImpl from './MessageNode';
import { Connections } from '@/contexts/PatchContext';
import { zen, createWorklet, UGen } from '@/lib/zen/index';
import { currentUUID, uuid, plusUUID, registerUUID } from '@/lib/uuid/IDGenerator';
import { Operator, Statement } from './definitions/zen/types';
import { compileStatement, printStatement } from './definitions/zen/AST';
import { publish } from '@/lib/messaging/queue';

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
    missedConnections: [SerializedConnection, ObjectNode, ObjectNode, number][];
    setAudioWorklet?: (x: AudioWorkletNode | null) => void;
    outputStatements: Statement[];
    skipRecompile: boolean;
    skipRecompile2: boolean;

    constructor() {
        this.id = uuid();
        this.skipRecompile = false;
        this.skipRecompile2 = false;
        this.historyDependencies = [];
        this.counter = 0;
        this.type = PatchType.Zen;
        this.objectNodes = [];
        this.messageNodes = [];
        this.audioContext = new AudioContext({ sampleRate: 44100 });
        this.worklets = [];
        this.waiting = false;
        this.storedStatement = undefined;
        this.missedConnections = [];
        this.outputStatements = [];
    }

    getAllNodes(): ObjectNode[] {
        let nodes = [... this.objectNodes];
        let subpatches = nodes.filter(x => x.subpatch).map(x => x.subpatch);
        return [...nodes, ...subpatches.flatMap((x: Patch) => x.getAllNodes())];
    }

    getAllMessageNodes(): MessageNode[] {
        let nodes = [... this.objectNodes];
        let subpatches = nodes.filter(x => x.subpatch).map(x => x.subpatch);
        return [...this.messageNodes, ...subpatches.flatMap((x: Patch) => x.getAllMessageNodes())];
    }

    getSourceNodes() {
        return this.objectNodes.filter(node => node.inlets.length === 0 && node.name !== "history");
    }

    recompileGraph(recompileGraph?: boolean) {
        if (this.name === undefined) {
            console.log("recompile started =", this.name || this.id, new Date().getTime());
        }
        let startTime = new Date().getTime();
        if (this.skipRecompile || this.skipRecompile2) {
            return;
        }
        this.skipRecompile2 = true;
        this.disconnectGraph();
        this.outputStatements = [];
        this.storedStatement = undefined;
        this.historyDependencies = [];
        this.waiting = true;

        // re-parse every node so that we "start from scratch"
        let objectNodes = this.objectNodes; //getAllNodes();
        for (let node of objectNodes) {
            if (node.operatorContextType !== OperatorContextType.ZEN) {
                continue;
            }
            if (node.name === "zen") {
                continue;
            }
            node.inlets.forEach(
                n => {
                    n.lastMessage = undefined;
                });
            node.parse(node.text, node.operatorContextType, false);
        }

        for (let node of objectNodes) {
            if (node.subpatch) {
                node.subpatch.recompileGraph(true);
            }
        }

        let sourceNodes = objectNodes.filter(node => node.name === "history" || node.name === "param");
        sourceNodes.forEach(
            sourceNode => {
                if (sourceNode.fn) {
                    sourceNode.receive(sourceNode.inlets[0], "bang");
                }
            });


        this.waiting = false;
        sourceNodes = objectNodes.filter(node => (node.inlets.length === 0 && node.name !== "param" && node.name !== "history") || node.name === "argument" || node.needsLoad);
        sourceNodes.forEach(
            sourceNode => {
                if (sourceNode.fn) {
                    let ret: Message[] = sourceNode.fn("bang");
                    for (let i = 0; i < ret.length; i++) {
                        if (sourceNode.outlets[i]) {
                            sourceNode.send(sourceNode.outlets[i], ret[i]);
                        }
                    }
                }
            });

        // this.sendNumberMessages()

        if (this.storedStatement) {
            this.compile(this.storedStatement);
        }

        let matricesAndBuffers = this.objectNodes.filter(x => x.name === "matrix" || x.name === "buffer");
        matricesAndBuffers.forEach(
            matrix => matrix.receive(matrix.inlets[0], "bang"));

        this.skipRecompile2 = false;
    }

    disconnectGraph() {
        this.worklets.forEach(({ workletNode, splitter, graph, merger }) => {
            workletNode.port.postMessage({
                type: "dispose"
            });
            workletNode.disconnect();
            graph.context.disposed = true;
            workletNode.port.onmessage = null;
            if (splitter) {
                splitter.disconnect();
            }
            if (merger) {
                merger.disconnect();
            }
        });
        this.worklets.length = 0;
    }

    sendNumberMessages() {
        let messageNodes = this.getAllMessageNodes();
        for (let messageNode of messageNodes) {
            if (messageNode.messageType === MessageType.Number) {
                messageNode.receive(messageNode.inlets[0], "bang");
                if (messageNode.message) {
                    messageNode.receive(messageNode.inlets[1], messageNode.message);
                }
            }
        }
        let nodes = this.getAllNodes();
        let attruis = nodes.filter(x => x.name === "attrui");
        for (let attrui of attruis) {
            attrui.receive(attrui.inlets[0], "bang");
        }
    }

    compile(statement: Statement, outputNumber?: number) {
        if (outputNumber !== undefined) {
            this.outputStatements[outputNumber - 1] = statement;
            let numOutputs = this.objectNodes.filter(x => x.name === "out").length;
            let numFound = this.outputStatements.filter(x => x !== undefined).length;
            if (numFound === numOutputs) {
                statement = ["s" as Operator, ... this.outputStatements];
            }
        }

        if (this.waiting) {
            this.storedStatement = statement;
            return;
        }
        if (this.skipRecompile) {
            this.storedStatement = statement;
            return;
        }

        this.storedStatement = undefined;
        this.counter++;
        let id = this.counter;

        setTimeout(() => {
            if (id !== this.counter) {
                return
            }
            if (this.historyDependencies.length > 0) {
                let historyDependencies = this.historyDependencies.filter(x => notInFunction(x))
                let _statement = ["s" as Operator];
                for (let dependency of historyDependencies) {
                    _statement.push(dependency as any);
                }
                _statement.push(statement as any);
                statement = _statement as Statement;
                //statement = ["s" as Operator, ...historyDependencies, statement]
            }
            console.log("statement to compile=", statement);
            let ast = compileStatement(statement);
            let printed = printStatement(statement);

            this.disconnectGraph();

            let zenGraph: ZenGraph = Array.isArray(ast) ? zen(...ast) : zen(ast as UGen);
            createWorklet(
                this.audioContext,
                zenGraph,
                'zen' + id)
                .then(
                    (ret) => {

                        console.log("worklet", new Date().getTime());
                        ret = ret as ZenWorklet;
                        this.audioNode = ret.workletNode;
                        let worklet = ret.workletNode;

                        ret.workletNode.port.onmessage = (e) => {
                            if (e.data.type === "wasm-ready") {
                                initMemory(zenGraph.context, worklet)
                                worklet.port.postMessage({ type: "ready" });
                                console.log('wasm ready');
                                this.skipRecompile = true;
                                this.sendNumberMessages();
                                let matricesAndBuffers = this.objectNodes.filter(x => x.name === "matrix" || x.name === "buffer");
                                matricesAndBuffers.forEach(
                                    matrix => matrix.receive(matrix.inlets[0], "bang"));

                                this.skipRecompile = false;


                            }
                            publish(e.data.type, [e.data.subType, e.data.body]);
                        };

                        console.log(ret.workletNode);
                        if (ret.workletNode.channelCount <= 1) {
                            ret.workletNode.connect(this.audioContext.destination);
                            this.worklets.push({ workletNode: ret.workletNode, graph: zenGraph });
                        } else {
                            let splitter = this.audioContext.createChannelSplitter(ret.workletNode.channelCount);
                            try {
                                ret.workletNode.connect(splitter);
                                let merger = this.audioContext.createChannelMerger(this.audioContext.destination.maxChannelCount);
                                splitter.connect(merger, 0, 0);
                                splitter.connect(merger, 1, 1);
                                merger.connect(this.audioContext.destination);
                                this.worklets.push({ workletNode: ret.workletNode, graph: zenGraph, splitter, merger });
                            } catch (E) {
                                console.log('error connecting', E);
                            }
                        }

                        this.setupAudioNode(this.audioNode);
                        if (this.setAudioWorklet) {
                            this.setAudioWorklet(ret.workletNode);
                        }

                        for (let messageNode of this.messageNodes) {
                            if (messageNode.message) {
                                messageNode.receive(messageNode.inlets[1], messageNode.message);
                            }
                        }
                        this.sendNumberMessages();
                        this.skipRecompile = true;
                        let matricesAndBuffers = this.objectNodes.filter(x => x.name === "matrix" || x.name === "buffer");
                        matricesAndBuffers.forEach(
                            matrix => matrix.receive(matrix.inlets[0], "bang"));

                        this.skipRecompile = false;

                    })
                .catch(e => {
                });
        }, 20);
    }

    setupAudioNode(audioNode: AudioNode) {
        let nodes = this.getAllNodes();
        let speakerNodes = nodes.filter(x => x.name === "speakers~");
        for (let node of speakerNodes) {
            node.useAudioNode(audioNode);
            for (let outlet of node.outlets) {
                for (let connection of outlet.connections) {
                    node.connectAudioNode(connection);
                }
            }
            // reconnect any connections
        }
        this.resolveMissedConnections();
    }

    // re-parse every nodeo so that we "start from scratch"
    newHistoryDependency(newHistory: Statement, object: ObjectNode) {
        if (!this.historyDependencies.some(x => x.node === object)) {
            this.historyDependencies = [newHistory, ... this.historyDependencies];
        }
    }

    getJSON(): SerializedPatch {
        return {
            id: this.id,
            name: this.name,
            objectNodes: this.objectNodes.map(x => x.getJSON()),
            messageNodes: this.messageNodes.map(x => x.getJSON()),
        };
    }

    fromJSON(x: SerializedPatch, isPreset?: boolean): Connections {
        this.skipRecompile = true;
        this.name = x.name;

        this.objectNodes = [];
        this.messageNodes = [];

        let currentId = currentUUID();
        this.id = x.id;
        if ((this as Patch as SubPatch).parentNode) {
            let node = (this as Patch as SubPatch).parentNode;
            node.inlets = [];
        }

        let ids: any = {};
        if (x.messageNodes) {
            for (let serializedNode of x.messageNodes) {
                let messageNode = new MessageNodeImpl(this, serializedNode.messageType);
                messageNode.fromJSON(serializedNode);
                this.messageNodes.push(messageNode);
                ids[messageNode.id] = messageNode;
            }
        }

        for (let serializedNode of x.objectNodes) {
            let objectNode = new ObjectNodeImpl(this);
            let tokens = serializedNode.text.split(" ");
            let name = tokens[0]
            let found = false;
            if (name === "in" || name === "out") {
                let arg = parseInt(tokens[1]);
                let _objectNode = this.objectNodes.find(x => x.name === name && x.arguments[0] === arg);
                if (_objectNode) {
                    objectNode = _objectNode as ObjectNodeImpl;
                    objectNode.id = serializedNode.id;
                    objectNode.position = serializedNode.position;
                    for (let outlet of objectNode.outlets) {
                        outlet.connections = [];
                    }
                    for (let inlet of objectNode.inlets) {
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
        let connections: Connections = {};

        let missedConnections: [SerializedConnection, ObjectNode, ObjectNode, number][] = [];
        for (let serializedNode of [...x.objectNodes, ... (x.messageNodes || [])]) {
            let node = ids[serializedNode.id];
            if (node) {
                let nodeConnections = [];
                for (let outlet of serializedNode.outlets) {
                    let { outletNumber, connections } = outlet;
                    for (let connection of connections) {
                        let { destinationId, destinationInlet, segmentation } = connection;
                        let destination: ObjectNode = ids[destinationId];
                        if (destination) {
                            let inlet = destination.inlets[destinationInlet];
                            let outlet = node.outlets[outletNumber];
                            if (inlet && outlet) {
                                let _connection = node.connect(destination, inlet, outlet, false);
                                _connection.segmentation = segmentation;
                                nodeConnections.push(_connection);
                            } else {
                                missedConnections.push([connection, node, destination, outletNumber]);
                            }
                        }
                    }
                }
                connections[node.id] = nodeConnections;
            }
            i++;
        }


        this.missedConnections = missedConnections;
        let _connections: Connections = {};
        if (isPreset) {
            for (let node of [... this.objectNodes, ... this.messageNodes]) {
                let oldId = node.id;
                let newId = plusUUID(oldId, currentId);
                registerUUID(newId);
                _connections[newId] = connections[oldId];
                node.id = newId;
            }
        }

        for (let messageNode of this.messageNodes) {
            if (messageNode.message) {
                messageNode.receive(messageNode.inlets[1], messageNode.message);
            }
        }
        this.skipRecompile = false;


        if (!(this as Patch as SubPatch).parentNode) {
            this.recompileGraph();
        }
        return _connections;
    }

    resolveMissedConnections() {
        for (let [connection, source, dest, outletNumber] of this.missedConnections) {
            let { destinationId, destinationInlet } = connection;
            let inlet = dest.inlets[destinationInlet];
            let outlet = source.outlets[outletNumber]
            if (inlet && outlet) {
                source.connect(dest, inlet, outlet, false);
            }
        }

        this.missedConnections = [];
    }
}

const notInFunction = (x: Statement) => {
    if (x.node) {
        let forward = traverseForwards(x.node);
        if (forward && forward.some(x => (x as ObjectNode).name === "defun")) {
            return false;
        }
    }
    return true;
};
