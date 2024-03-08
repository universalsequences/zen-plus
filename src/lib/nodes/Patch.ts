import { IOConnection, Patch, SubPatch, PatchType, SerializedPatch, ConnectionType, ObjectNode, MessageType, MessageNode, Message, SerializedConnection } from './types';
import { PresetManager } from '@/lib/nodes/definitions/core/preset';
import Assistant from '@/lib/openai/assistant';
import { containsSameHistory } from './definitions/zen/history';
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
    isCompiling: boolean;
    missedConnections: [SerializedConnection, ObjectNode, ObjectNode, number][];
    historyNodes: Set<ObjectNode>;
    setAudioWorklet?: (x: AudioWorkletNode | null) => void;
    outputStatements: Statement[];
    presentationMode: boolean;
    skipRecompile: boolean;
    skipRecompile2: boolean;
    setZenCode?: (x: string | null) => void;
    setVisualsCode?: (x: string | null) => void;
    zenCode?: string;
    previousSerializedPatch?: SerializedPatch;
    previousDocId?: string;
    isZen: boolean;
    merger?: ChannelMergerNode;
    assistant: Assistant;

    constructor(audioContext: AudioContext, isZen: boolean = false) {
        this.isZen = isZen;
        this.id = uuid();
        this.assistant = new Assistant(this);
        this.presentationMode = false;
        this.historyNodes = new Set<ObjectNode>();
        this.skipRecompile = false;
        this.skipRecompile2 = false;
        this.historyDependencies = [];
        this.counter = 0;
        this.type = PatchType.Zen;
        this.objectNodes = [];
        this.messageNodes = [];

        // TODO: ensure that this is base patch...
        this.audioContext = audioContext; //new AudioContext({ sampleRate: 44100 });
        this.worklets = [];
        this.waiting = false;
        this.storedStatement = undefined;
        this.missedConnections = [];
        this.isCompiling = false;
        this.outputStatements = [];
    }

    getAllNodes(): ObjectNode[] {
        let nodes = [... this.objectNodes];
        let subpatches = nodes.filter(x => x.subpatch).map(x => x.subpatch) as Patch[];
        return [...nodes, ...subpatches.flatMap((x: Patch) => x.getAllNodes())];
    }

    getAllMessageNodes(): MessageNode[] {
        let nodes = [... this.objectNodes];
        let subpatches = nodes.filter(x => x.subpatch).map(x => x.subpatch) as Patch[];
        return [...this.messageNodes, ...subpatches.flatMap((x: Patch) => x.getAllMessageNodes())];
    }

    getSourceNodes() {
        return this.objectNodes.filter(node => node.inlets.length === 0 && node.name !== "history");
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

        let parentPatch = (this as Patch as SubPatch).parentPatch
        if (!parentPatch) {
            return null;
        }

        return parentPatch.getZenBase();
    }

    recompileGraph() {
        console.log("recompileGraph called at", this.name);
        if (this.skipRecompile || this.skipRecompile2) {
            return;
        }
        if (this.isZenBase()) {
            this.isCompiling = true;
        }
        this.skipRecompile2 = true;

        this.disconnectGraph();
        this.outputStatements = [];
        this.storedStatement = undefined;
        this.historyDependencies = [];
        this.historyNodes = new Set<ObjectNode>();
        this.waiting = true;

        // re-parse every node so that we "start from scratch"
        let objectNodes = this.objectNodes; //getAllNodes();
        let _objectNodes = this.name === undefined ? this.getAllNodes() : objectNodes; //objectNodes;
        if (this.name === undefined || this.isZenBase()) {
            let __o = this.getAllNodes();
            if (!(this as Patch as SubPatch).parentPatch) {
                // skip all zen nodes... (cuz we're compiling from base patch)
                __o = __o.filter(x => x.operatorContextType !== OperatorContextType.ZEN && x.operatorContextType !== OperatorContextType.NUMBER && x.operatorContextType !== OperatorContextType.CORE && x.name !== "zen");
                console.log("skipping all zen nodes...");
            }

            console.log('objects to process=', __o);
            for (let node of __o) {
                if (node.operatorContextType !== OperatorContextType.ZEN &&
                    node.operatorContextType !== OperatorContextType.GL) {
                    continue;
                }
                if (node.subpatch) {
                    node.inlets.forEach(x => {
                        if (x.connections.length > 0) {
                            x.messagesReceived = undefined;
                            x.lastMessage = undefined;
                            x.markedMessages = [];
                        }
                    });
                    continue;
                }
                node.inlets.forEach(
                    n => {
                        if (n.connections.length > 0) {
                            n.lastMessage = undefined;
                            n.messagesReceived = undefined;
                            n.markedMessages = [];
                        }
                    });
                node.lastSentMessage = undefined;
                let name = (node as ObjectNode).name;
                if (name === "call" || name === "defun" || name === "polycall") {
                    node.storedMessage = undefined;
                }
            }

            for (let node of __o) {
                if (node.operatorContextType !== OperatorContextType.ZEN &&
                    node.operatorContextType !== OperatorContextType.GL) {
                    continue;
                }
                if (node.subpatch) {
                    continue;
                }
                node.inlets.forEach(
                    n => {
                        if (n.connections.length > 0) {
                            n.lastMessage = undefined;
                            n.messagesReceived = undefined;
                            n.markedMessages = [];
                        }
                    });
                if (node.name !== "in") {
                    node.parse(node.text, node.operatorContextType, false);
                }
            }
        }

        if ((this as Patch as SubPatch).parentPatch) {
            // we are in a zen node so we proceed as usual
            for (let node of objectNodes) {
                if (node.subpatch && node.subpatch.patchType !== OperatorContextType.AUDIO) {
                    console.log("NODE.subpatch.recompileGraph from", this.name, node.subpatch);
                    node.subpatch.recompileGraph(true);
                }
            }
        } else {
            // we are at the base patch so skip all subpatches...
            // only compile gl subpatches
            for (let node of objectNodes) {
                if (node.subpatch && node.subpatch.patchType === OperatorContextType.GL) {
                    console.log("NODE.subpatch.recompileGraph from", this.name, node.subpatch);
                    node.subpatch.recompileGraph(true);
                }
            }
        }


        let a = new Date().getTime();
        let matricesAndBuffers = this.objectNodes.filter(x => x.name === "matrix" || x.name === "buffer");
        matricesAndBuffers.forEach(
            matrix => matrix.receive(matrix.inlets[0], "bang"));
        let b = new Date().getTime();
        if (b - a > 10) {
        }

        let sourceNodes = objectNodes.filter(node => node.name === "slider" || node.name === "knob");
        sourceNodes.forEach(
            sourceNode => {
                if (sourceNode.fn) {
                    sourceNode.receive(sourceNode.inlets[0], "bang");
                }
            });

        if (this.isZenBase()) {
            let audioInputs = this.getAllNodes().filter(node => node.name === "in").filter(node => !(node.patch as SubPatch).parentPatch.isZen);
            audioInputs.forEach(
                input => input.receive(input.inlets[0], "bang"));

            let parent = (this as Patch as SubPatch).parentPatch;
            if (parent) {
                let functions = parent.getAllNodes().filter(x => x.name === "function");
                functions.forEach(
                    x => x.receive(x.inlets[0], "bang"));

            }
        }

        // first do any entry-point components

        if (this.isZenBase()) { // || this.name === undefined) {
            let histories = this.getAllNodes().filter(node => node.name === "history");
            console.log("sourcenodes7=", sourceNodes);
            histories.forEach(
                sourceNode => {
                    if (sourceNode.fn) {
                        sourceNode.receive(sourceNode.inlets[0], "bang");
                    }
                });
            let args = this.getAllNodes().filter(node => node.name === "argument" || node.name === "invocation");
            console.log("sourcenodes6=", sourceNodes);

            args.forEach(
                sourceNode => {
                    if (sourceNode.fn) {
                        sourceNode.receive(sourceNode.inlets[0], "bang");
                    }
                });

            sourceNodes = this.getAllNodes().filter(node => node.name === "param");
            console.log("sourcenodes5=", sourceNodes);
            sourceNodes.forEach(
                sourceNode => {
                    if (sourceNode.fn) {
                        sourceNode.receive(sourceNode.inlets[0], "bang");
                    }
                });
        }

        if (this.name === undefined) {
            sourceNodes = this.getAllNodes().filter(node => node.name === "uniform");
            console.log("sourcenodes5=", sourceNodes);
            sourceNodes.forEach(
                sourceNode => {
                    if (sourceNode.fn) {
                        sourceNode.receive(sourceNode.inlets[0], "bang");
                    }
                });
        }

        sourceNodes = objectNodes.filter(node => node.name === "data" && node.inlets[0].connections.length === 0);
        console.log("sourcenodes4=", sourceNodes);
        sourceNodes.forEach(
            sourceNode => {
                if (sourceNode.fn) {
                    sourceNode.receive(sourceNode.inlets[0], [0]);
                }
            });

        let c = new Date().getTime();
        if (c - b > 10) {
        }

        //this.sendNumberMessages()

        this.waiting = false;

        sourceNodes = _objectNodes.filter(node => (node.inlets.length === 0 && !node.needsLoad));
        console.log("sourcenodes3=", sourceNodes);
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

        sourceNodes = objectNodes.filter(node => node.needsLoad && node.name !== "in" && node.inlets[0] && node.inlets[0].connections.length === 0);
        console.log("sourcenodes2=", sourceNodes);
        sourceNodes.forEach(
            sourceNode => {
                if (sourceNode.fn) {
                    sourceNode.receive(sourceNode.inlets[0], "bang");
                }
            });

        sourceNodes = objectNodes.filter(node => node.needsLoad && node.name !== "in" && !(node.inlets[0] && node.inlets[0].connections.length === 0));
        console.log("sourcenodes1=", sourceNodes);
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

        if (this.isZenBase()) {
            let inputs = this.getAllNodes().filter(node => node.name === "in").filter(node => node.patch !== this);
            console.log("inputs=", inputs);
            inputs.forEach(
                input => {
                    // get the patch
                    let p = input.patch as SubPatch;
                    let inletNumber = (input.arguments[0] as number) - 1;

                    if (p.parentNode) {
                        if (p.parentNode.inlets[inletNumber].connections.length === 0) {
                            // send a 0 then
                            for (let c of input.outlets[0].connections) {
                                let { destinationInlet, destination } = c;
                                let value = (input.attributes["default"] as number) || 0;
                                destination.receive(destinationInlet, value, input);
                            }
                        }
                    }
                });


            let calls = this.getAllNodes().filter(node => node.operatorContextType === OperatorContextType.ZEN && (node.name === "call" || node.name === "latchcall" || node.name === "polycall"));
            console.log("CALLS=", calls);
            calls.forEach(
                call => {
                    if (call.fn && call.inlets[0] && call.inlets[0].lastMessage !== undefined) {
                        call.receive(call.inlets[0], call.inlets[0].lastMessage);
                    }
                    return;
                });
        }


        if (this.storedStatement) {
            this.compile(this.storedStatement);
        }
        this.skipRecompile2 = false;
    }
    disconnectGraph() {
        this.worklets.forEach(({ workletNode, splitter, graph, merger }) => {
            workletNode.port.postMessage({
                type: "dispose"
            });
            for (let connection of this.getAudioConnections()) {
                connection.source.disconnectAudioNode(connection);
            }

            let subpatch = (this as Patch as SubPatch);
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

    startParameterNumberMessages() {
        let messageNodes = this.getAllMessageNodes();
        for (let messageNode of messageNodes) {
            if (messageNode.messageType === MessageType.Number) {
                if (messageNode.attributes["is parameter"]) {
                    messageNode.receive(messageNode.inlets[0], "bang");
                }
            }
        }
    }

    sendNumberMessages(filterParameters = false) {
        let messageNodes = this.getAllMessageNodes();
        for (let messageNode of messageNodes) {
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

            if (this.isZenBase()) {
                this.isCompiling = false;
            }
            if (this.historyDependencies.length > 0) {
                let historyDependencies = this.historyDependencies.filter(x => notInFunction(x))
                let _statement = ["s" as Operator];
                for (let dependency of historyDependencies) {
                    // make sure that statement contains the history
                    let hist = ((dependency as Statement[])[0] as any).history;
                    // make sure the hist is somewhere in the statement
                    if (hist) {
                        if (containsSameHistory(hist, statement, false)) {
                            _statement.push(dependency as any);
                        } else {
                        }
                    } else {
                        let param = ((dependency as Statement[])[0] as any).param;
                        _statement.push(dependency as any);
                    }
                }
                _statement.push(statement as any);
                statement = ["s" as Operator, _statement as Statement];
            }
            let ast = compileStatement(statement);
            this.disconnectGraph();

            let zenGraph: ZenGraph = Array.isArray(ast) ? zen(...ast) : zen(ast as UGen);
            let parentNode = (this as Patch as SubPatch).parentNode;
            let parentId = parentNode ? parentNode.id : this.id;
            let workletId = 'zen' + parentId + '_' + id + new Date().getTime();
            createWorklet(
                this.audioContext,
                zenGraph,
                workletId)
                .then(
                    (ret) => {

                        ret = ret as ZenWorklet;
                        this.audioNode = ret.workletNode;
                        let worklet = ret.workletNode;

                        ret.workletNode.port.onmessage = (e) => {
                            if (e.data.type === "wasm-ready") {
                                initMemory(zenGraph.context, worklet)
                                worklet.port.postMessage({ type: "ready" });
                                this.skipRecompile = true;
                                this.sendAttributeMessages();
                                this.sendNumberMessages(true);
                                let matricesAndBuffers = this.objectNodes.filter(x => x.name === "matrix" || x.name === "buffer");
                                matricesAndBuffers.forEach(
                                    matrix => matrix.receive(matrix.inlets[0], "bang"));

                                this.skipRecompile = false;


                            }
                            publish(e.data.type, [e.data.subType, e.data.body === true ? 1 : e.data.body === false ? 0 : e.data.body, this]);
                        };

                        let merger = this.audioContext.createChannelMerger(zenGraph.numberOfInputs);
                        let parentNode = (this as Patch as SubPatch).parentNode;
                        if (parentNode) {
                            parentNode.merger = merger;
                            merger.connect(ret.workletNode);

                            for (let i = 0; i < parentNode.outlets.length; i++) {
                                parentNode.outlets[i].connectionType = ConnectionType.AUDIO;
                            }

                        }
                        this.worklets.push({ workletNode: ret.workletNode, graph: zenGraph, merger: merger });

                        /*
                        if (ret.workletNode.channelCount <= 1) {
                            ret.workletNode.connect(this.audioContext.destination);
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
                            }
                        }
                        */

                        //let parentNode = (this as unknown as SubPatch).parentNode;

                        if (parentNode) {
                            parentNode.useAudioNode(this.audioNode);
                        }

                        this.setupAudioNode(this.audioNode);
                        let gain = this.audioContext.createGain();
                        ret.workletNode.connect(gain);

                        if (this.setAudioWorklet) {
                            this.setAudioWorklet(ret.workletNode);
                        }

                        for (let messageNode of this.messageNodes) {
                            if (messageNode.message) {
                                messageNode.receive(messageNode.inlets[1], messageNode.message);
                            }
                        }
                        this.skipRecompile = true;
                        this.sendNumberMessages();
                        this.sendAttributeMessages();
                        let matricesAndBuffers = this.objectNodes.filter(x => x.name === "matrix" || x.name === "buffer");
                        matricesAndBuffers.forEach(
                            matrix => matrix.receive(matrix.inlets[0], "bang"));

                        this.skipRecompile = false;

                        if (parentNode) {
                            let moduleType = parentNode.attributes.moduleType;
                            let publishers = parentNode.patch.objectNodes.filter(
                                x => x.name === "publishPatchSignals" &&
                                    x.arguments[0] === moduleType);

                            let root = parentNode.patch;
                            while ((root as SubPatch).parentPatch) {
                                root = (root as SubPatch).parentPatch;
                            }
                            let allReceives = root.getAllNodes().filter(x => x.name === "receive~");
                            publishers.forEach(
                                x => {
                                    let name = x.arguments[2] as string;
                                    let matches = allReceives.filter(x => x.arguments[0] === name);
                                    matches.forEach(x => {
                                        if (x.fn) {
                                            x.fn([]);
                                        }
                                    });

                                    if (x.fn) {
                                        x.fn([]);
                                    }

                                });

                        }

                        let inputFile = printStatement(statement);
                        console.log(inputFile);
                        inputFile = inputFile.replace(/zswitch(\d+)/g, (_, number) => `z${number}`);
                        inputFile = inputFile.replace(/add(\d+)/g, (_, number) => `a${number}`);
                        inputFile = inputFile.replace(/sub(\d+)/g, (_, number) => `q${number}`);
                        inputFile = inputFile.replace(/mult(\d+)/g, (_, number) => `m${number}`);
                        inputFile = inputFile.replace(/div(\d+)/g, (_, number) => `d${number}`);
                        inputFile = inputFile.replace(/history(\d+)/g, (_, number) => `hst${number}`);
                        inputFile = inputFile.replace(/rampToTrig(\d+)/g, (_, number) => `r${number}`);
                        inputFile = inputFile.replace(/phasor(\d+)/g, (_, number) => `p${number}`);
                        inputFile = inputFile.replace(/cycle(\d+)/g, (_, number) => `c${number}`);
                        inputFile = inputFile.replace(/floor(\d+)/g, (_, number) => `f${number}`);
                        inputFile = inputFile.replace(/and(\d+)/g, (_, number) => `an${number}`);
                        inputFile = inputFile.replace(/accum(\d+)/g, (_, number) => `ac${number}`);
                        inputFile = inputFile.replace(/mod(\d+)/g, (_, number) => `mo${number}`);
                        inputFile = inputFile.replace(/clamp(\d+)/g, (_, number) => `cl${number}`);
                        inputFile = inputFile.replace(/eq(\d+)/g, (_, number) => `E${number}`);
                        inputFile = inputFile.replace(/selector(\d+)/g, (_, number) => `S${number}`);
                        inputFile = inputFile.replace(/triangle(\d+)/g, (_, number) => `T${number}`);
                        inputFile = inputFile.replace(/mstosamps(\d+)/g, (_, number) => `ms${number}`);
                        inputFile = inputFile.replace(/round(\d+)/g, (_, number) => `ro${number}`);
                        inputFile = inputFile.replace(/compressor(\d+)/g, (_, number) => `co${number}`);
                        inputFile = inputFile.replace(/wrap(\d+)/g, (_, number) => `w${number}`);
                        inputFile = inputFile.replace(/argument(\d+)/g, (_, number) => `A${number}`);
                        inputFile = inputFile.replace(/onepole(\d+)/g, (_, number) => `o${number}`);
                        inputFile = inputFile.replace(/scale(\d+)/g, (_, number) => `sc${number}`);
                        inputFile = inputFile.replace(/vactrol(\d+)/g, (_, number) => `V${number}`);
                        inputFile = inputFile.replace(/param(\d+)/g, 'p$1');
                        inputFile = inputFile.replace(/latch(\d+)/g, 'L$1');
                        inputFile = inputFile.replace(/mix(\d+)/g, 'M$1');
                        inputFile = inputFile.replace(/delay(\d+)/g, 'D$1');
                        inputFile = inputFile.replace(/biquad(\d+)/g, 'B$1');
                        inputFile = replaceAll(inputFile, "  ", "");
                        inputFile = replaceAll(inputFile, "(\n", "(");
                        inputFile = replaceAll(inputFile, "( ", "(");
                        inputFile = replaceAll(inputFile, ",\n", ",");
                        inputFile = replaceAll(inputFile, " (", "(");
                        inputFile = replaceAll(inputFile, " )", ")");
                        inputFile = replaceAll(inputFile, ") ", ")");
                        inputFile = replaceAll(inputFile, " = ", "=");
                        inputFile = getFunctionNames(inputFile);
                        inputFile = replaceAll(inputFile, ", ", ",");
                        inputFile = replaceAll(inputFile, " ,", ",");

                        this.zenCode = inputFile;
                        if (this.setZenCode) {
                            this.setZenCode(inputFile);
                        }


                    })
                .catch(e => {
                });
        }, 50);
    }

    getAudioConnections() {
        let parentNode = (this as Patch as SubPatch).parentNode;
        let connections: IOConnection[] = [];
        for (let outlet of parentNode.outlets) {
            outlet.connections.forEach(
                c => connections.push(c));
        }
        for (let inlet of parentNode.inlets) {
            inlet.connections.forEach(
                c => connections.push(c));
        }
        return connections;
    }

    setupAudioNode(audioNode: AudioNode) {
        let parentNode = (this as Patch as SubPatch).parentNode;
        if (parentNode) {
            for (let outlet of parentNode.outlets) {
                outlet.connections.forEach(
                    c => parentNode.connectAudioNode(c));
            }
            for (let inlet of parentNode.inlets) {
                inlet.connections.forEach(
                    c => c.source.connectAudioNode(c));
            }
        }

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
            this.historyNodes.add(object);
        }
    }

    getJSON(): SerializedPatch {
        let json: SerializedPatch = {
            id: this.id,
            name: this.name,
            objectNodes: this.objectNodes.map(x => x.getJSON()),
            messageNodes: this.messageNodes.map(x => x.getJSON()),
            presentationMode: this.presentationMode
        };
        let parentNode = (this as any as SubPatch).parentNode;
        if (parentNode) {
            if (parentNode.attributes["Custom Presentation"]) {
                json.isCustomView = parentNode.attributes["Custom Presentation"] ? true : false;
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
        this.presentationMode = x.presentationMode === undefined ? false : x.presentationMode;

        let parentNode = (this as any as SubPatch).parentNode;
        if (parentNode) {
            if (x.isCustomView) {
                parentNode.attributes["Custom Presentation"] = x.isCustomView;
                parentNode.size = x.size;
            }
        }

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

        let currentId = currentUUID();
        let missedConnections: [SerializedConnection, ObjectNode, ObjectNode, number][] = [];
        for (let serializedNode of [...x.objectNodes, ... (x.messageNodes || [])]) {
            let node = ids[serializedNode.id];
            if (node) {
                let nodeConnections = [];
                for (let outlet of serializedNode.outlets) {
                    let { outletNumber, connections } = outlet;
                    if (!outletNumber) {
                        outletNumber = 0;
                    }
                    for (let connection of connections) {
                        let { destinationId, destinationInlet, segmentation } = connection;
                        if (!destinationInlet) {
                            destinationInlet = 0;
                        }
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
        let _connections: Connections = { ...connections };
        let num: number = 1;
        if (isPreset) {
            for (let node of [... this.objectNodes, ... this.messageNodes]) {
                let oldId = node.id;
                let newId = plusUUID(num.toString(36), currentId);
                registerUUID(newId);
                _connections[newId] = connections[oldId];
                delete _connections[oldId];
                node.id = newId;
                num++;
            }
        }
        for (let messageNode of this.messageNodes) {
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
        let nodes = this.getAllNodes();
        let presets = nodes.filter(x => x.name === "preset");
        for (let preset of presets) {
            let custom = preset.custom as PresetManager;
            if (custom) {
                custom.hydrateSerializedPresets(nodes);
            }
        }

        return _connections;
    }

    async initialLoadCompile() {
        console.log('initial load compile called');
        this.recompileGraph()

        let compiled: Patch[] = [];
        for (let node of this.objectNodes) {
            if (node.subpatch && node.subpatch.isZenBase() && node.subpatch.patchType !== OperatorContextType.AUDIO) {
                if (this.isZenBase() && (this as Patch as SubPatch).patchType === OperatorContextType.ZEN) {
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
            } else if (node.subpatch && node.subpatch.patchType === OperatorContextType.AUDIO) {
                await node.subpatch.initialLoadCompile();
            }
        }

        for (let node of this.getAllNodes()) {
            if (node.name === "send~" || node.name === "publishPatchSignals") {
                node.parse(node.text);
            }
            for (let outlet of node.outlets) {
                if (outlet.connectionType === ConnectionType.AUDIO) {
                    // reconnect...
                    for (let connection of outlet.connections) {
                        node.disconnectAudioNode(connection);
                        node.connectAudioNode(connection);
                    }
                }
            }
        }


        this.sendAttributeMessages();
    }

    resolveMissedConnections() {
        for (let [connection, source, dest, outletNumber] of this.missedConnections) {
            let { destinationId, destinationInlet } = connection;
            if (!destinationInlet) {
                destinationInlet = 0;
            }
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

        let debug = false;
        let _name = (x.node.patch as any).name;
        let forward = traverseForwards(x.node);
        if (forward && forward.some(x => (x as ObjectNode).name === "defun")) {
            return false;
        }
    }
    return true;
};

const replaceAll = (target: string, search: string, repl: string) => {
    return target.split(search).join(repl);
};

const getFunctionNames = (dslCode: string, ultraMinify = true) => {
    const funcRegex = /\b(\w+\.)?(\w+)\(/g;


    // Object to store unique function names
    const functions: any = {};

    // Find all matches
    let match;
    while ((match = funcRegex.exec(dslCode)) !== null) {
        if (match[1] && match[2]) {
            functions[match[1] + match[2]] = true; // Store the function name
        } else {
            if (ultraMinify) {
                functions[match[2]] = true; // Store the function name
            }
        }
    }

    const shorthands: any = {};
    // Generate shorthands
    /*
    let shorthandIndex = 0;

    let currentCharCode = 97; // ASCII code for 'a'
    let extraChar = -1;
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let currentCharIndex = 0;
    let prefixIndex = -1;
    */

    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let prefixIndex = 0;
    let suffixIndex = 0;



    Object.keys(functions).forEach(func => {

        // Generate a shorthand name, e.g., f1, f2, ...
        /*
        shorthands[func] = 'F' + shorthandIndex++;
        */
        let shorthand = alphabet[prefixIndex] + (suffixIndex > 0 ? alphabet[suffixIndex - 1] : '');

        if (shorthand === "do") {
            shorthand = "d000";
        }

        if (shorthand === "eq") {
            shorthand = "eq000";
        }

        shorthands[func] = shorthand;

        if (suffixIndex === alphabet.length) {
            suffixIndex = 0;
            prefixIndex++;
        } else {
            suffixIndex++;
        }

    });

    // Generate the shorthand definitions
    let shorthandDefinitions = 'let ';
    let outDSL = dslCode;

    ultraMinify = true;
    console.log("shorthands=", shorthands);
    if (ultraMinify) {
        Object.entries(shorthands).forEach(([original, shorthand], i) => {
            if (original.includes('connections') || original.includes('bidirectional') || original.includes('gen')) {
                return;
            }
            if (!original.includes("hst") || original === "history") {
                shorthandDefinitions += `${shorthand}=${original}`;
                if (i < Object.values(shorthands).length - 1) {
                    shorthandDefinitions += ',';
                }
                if (original === "history") {
                    console.log('replacing with shorthand=%s', shorthand, original);
                }
                outDSL = outDSL.replaceAll('= ' + original + '(', '=' + shorthand + '(');
                outDSL = outDSL.replaceAll('=' + original + '(', '=' + shorthand + '(');
            }
        });
        shorthandDefinitions = replaceAll(shorthandDefinitions, "\n", "");
    }

    if (!ultraMinify) {
        shorthandDefinitions = "";
    }
    outDSL = shorthandDefinitions + ';\n' + "let " + outDSL.replaceAll("let ", ",").replaceAll(";", "").replaceAll("\n", "").slice(1);
    let retIndex = outDSL.indexOf("return");
    outDSL = outDSL.slice(0, retIndex) + ';\n' + outDSL.slice(retIndex);

    return outDSL;

};


const sleep = (time: number): Promise<void> => {
    return new Promise((resolve: () => void) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
};

export const minify = (inputFile: string, ultraMinify = true): string => {
    inputFile = inputFile.replace(/zswitch(\d+)/g, (_, number) => `z${number}`);
    inputFile = inputFile.replace(/add(\d+)/g, (_, number) => `a${number}`);
    inputFile = inputFile.replace(/sub(\d+)/g, (_, number) => `q${number}`);
    inputFile = inputFile.replace(/mult(\d+)/g, (_, number) => `m${number}`);
    inputFile = inputFile.replace(/div(\d+)/g, (_, number) => `d${number}`);
    //inputFile = inputFile.replace(/history(\d+)/g, (_, number) => `h${number}`);
    inputFile = inputFile.replace(/rampToTrig(\d+)/g, (_, number) => `r${number}`);
    inputFile = inputFile.replace(/phasor(\d+)/g, (_, number) => `p${number}`);
    inputFile = inputFile.replace(/cycle(\d+)/g, (_, number) => `c${number}`);
    inputFile = inputFile.replace(/floor(\d+)/g, (_, number) => `f${number}`);
    inputFile = inputFile.replace(/and(\d+)/g, (_, number) => `an${number}`);
    inputFile = inputFile.replace(/accum(\d+)/g, (_, number) => `ac${number}`);
    inputFile = inputFile.replace(/mod(\d+)/g, (_, number) => `mo${number}`);
    inputFile = inputFile.replace(/clamp(\d+)/g, (_, number) => `cl${number}`);
    inputFile = inputFile.replace(/eq(\d+)/g, (_, number) => `E${number}`);
    inputFile = inputFile.replace(/selector(\d+)/g, (_, number) => `S${number}`);
    inputFile = inputFile.replace(/triangle(\d+)/g, (_, number) => `T${number}`);
    inputFile = inputFile.replace(/mstosamps(\d+)/g, (_, number) => `ms${number}`);
    inputFile = inputFile.replace(/round(\d+)/g, (_, number) => `ro${number}`);
    inputFile = inputFile.replace(/compressor(\d+)/g, (_, number) => `co${number}`);
    inputFile = inputFile.replace(/wrap(\d+)/g, (_, number) => `w${number}`);
    inputFile = inputFile.replace(/argument(\d+)/g, (_, number) => `A${number}`);
    inputFile = inputFile.replace(/onepole(\d+)/g, (_, number) => `o${number}`);
    inputFile = inputFile.replace(/scale(\d+)/g, (_, number) => `sc${number}`);
    inputFile = inputFile.replace(/vactrol(\d+)/g, (_, number) => `V${number}`);
    inputFile = replaceAll(inputFile, " ,", ",");
    inputFile = inputFile.replace(/param(\d+)/g, 'p$1');
    inputFile = inputFile.replace(/latch(\d+)/g, 'L$1');
    inputFile = inputFile.replace(/mix(\d+)/g, 'M$1');
    inputFile = inputFile.replace(/delay(\d+)/g, 'D$1');
    inputFile = inputFile.replace(/biquad(\d+)/g, 'B$1');
    inputFile = replaceAll(inputFile, "  ", "");
    inputFile = replaceAll(inputFile, "(\n", "(");
    inputFile = replaceAll(inputFile, "( ", "(");
    inputFile = replaceAll(inputFile, ",\n", ",");
    inputFile = replaceAll(inputFile, " (", "(");
    inputFile = replaceAll(inputFile, " )", ")");
    inputFile = replaceAll(inputFile, ") ", ")");
    inputFile = replaceAll(inputFile, " = ", "=");

    inputFile = getFunctionNames(inputFile, ultraMinify);

    return inputFile;

};
