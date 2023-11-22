import { Patch, SubPatch, PatchType, SerializedPatch, ObjectNode, MessageNode, Message, IOConnection } from './types';
import { ZenWorklet, initMemory } from '@/lib/zen/worklet';
import { ZenGraph } from '@/lib/zen/zen'
import ObjectNodeImpl from './ObjectNode';
import { Connections } from '@/contexts/PatchContext';
import { zen, createWorklet, UGen } from '@/lib/zen/index';
import { currentUUID, uuid, plusUUID, registerUUID } from '@/lib/uuid/IDGenerator';
import { Operator, Statement } from './definitions/zen/types';
import { compileStatement } from './definitions/zen/AST';
import { register } from 'module';

interface GraphContext {
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

    constructor() {
        this.id = uuid();
        this.historyDependencies = [];
        this.counter = 0;
        this.type = PatchType.Zen;
        this.objectNodes = [];
        this.messageNodes = [];
        this.audioContext = new AudioContext();
        this.worklets = [];
        this.waiting = false;
        this.storedStatement = undefined;
    }

    getAllNodes(): ObjectNode[] {
        let nodes = [... this.objectNodes];
        let subpatches = nodes.filter(x => x.subpatch).map(x => x.subpatch);
        return [...nodes, ...subpatches.flatMap((x: Patch) => x.getAllNodes())];
    }

    getSourceNodes() {
        return this.objectNodes.filter(node => node.inlets.length === 0 && node.name !== "history");
    }

    recompileGraph(recompileGraph?: boolean) {
        console.log('recompile graph called with patch=', this, this.name);

        this.disconnectGraph();
        this.storedStatement = undefined;
        this.historyDependencies = [];
        this.waiting = true;

        // re-parse every node so that we "start from scratch"
        let objectNodes = this.getAllNodes();
        for (let node of objectNodes) {
            node.inlets.forEach(
                n => {
                    n.lastMessage = undefined;
                });
            node.parse(node.text, false);
        }

        for (let node of objectNodes) {
            if (node.subpatch) {
                console.log("recompling sub graph first...", node.subpatch.name);
                node.subpatch.recompileGraph(true);
            }
        }
        let sourceNodes = objectNodes.filter(node => node.name === "history");
        sourceNodes.forEach(
            sourceNode => {
                if (sourceNode.fn) {
                    sourceNode.receive(sourceNode.inlets[0], "bang");
                }
            });


        this.waiting = false;
        sourceNodes = objectNodes.filter(node => node.inlets.length === 0 && node.name !== "history");
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


        if (this.storedStatement) {
            this.compile(this.storedStatement);
        }

    }

    disconnectGraph() {
        this.worklets.forEach(({ workletNode, graph }) => {
            workletNode.port.postMessage({
                type: "dispose"
            });
            workletNode.disconnect();
            graph.context.disposed = true;
        });
        this.worklets.length = 0;
    }
    compile(statement: Statement) {
        if (this.waiting) {
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
                statement = ["s" as Operator, ... this.historyDependencies, statement]
            }
            console.log('statement to compile = ', statement);
            let ast = compileStatement(statement);

            this.disconnectGraph();

            let zenGraph: ZenGraph = Array.isArray(ast) ? zen(...ast) : zen(ast as UGen);

            createWorklet(
                this.audioContext,
                zenGraph,
                'zen' + id)
                .then(
                    (ret) => {
                        ret = ret as ZenWorklet;
                        this.audioNode = ret.workletNode;
                        this.worklets.push({ workletNode: ret.workletNode, graph: zenGraph });
                        ret.workletNode.connect(this.audioContext.destination);
                    })
                .catch(e => {
                });
        }, 250);
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
            objectNodes: this.objectNodes.map(x => x.getJSON())
        };
    }

    fromJSON(x: SerializedPatch): Connections {

        this.name = x.name;

        let currentId = currentUUID();
        this.id = x.id;
        if ((this as Patch as SubPatch).parentNode) {
            let node = (this as Patch as SubPatch).parentNode;
            node.inlets = [];
        }

        let ids: any = {};
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
                objectNode.fromJSON(serializedNode);
            }

            this.objectNodes.push(objectNode);
            ids[objectNode.id] = objectNode;
        }

        // now that we have added all the nodes time to patch them up
        let i = 0;
        let connections: Connections = {};
        for (let serializedNode of x.objectNodes) {
            let node = ids[serializedNode.id];
            if (node) {
                let nodeConnections = [];
                for (let outlet of serializedNode.outlets) {
                    let { outletNumber, connections } = outlet;
                    for (let connection of connections) {
                        let { destinationId, destinationInlet } = connection;
                        let destination: ObjectNode = ids[destinationId];
                        if (destination) {
                            let inlet = destination.inlets[destinationInlet];
                            let outlet = node.outlets[outletNumber];
                            if (inlet && outlet) {
                                nodeConnections.push(node.connect(destination, inlet, outlet, false));
                            }
                        }
                    }
                }
                connections[node.id] = nodeConnections;
            }
            i++;
        }
        this.recompileGraph();

        let _connections: Connections = {};
        for (let node of this.objectNodes) {
            let oldId = node.id;
            let newId = plusUUID(oldId, currentId);
            registerUUID(newId);
            _connections[newId] = connections[oldId];
            node.id = newId;
        }
        return _connections;
    }
}
