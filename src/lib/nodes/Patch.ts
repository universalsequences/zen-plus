import { Patch, SubPatch, PatchType, SerializedPatch, ObjectNode, MessageType, MessageNode, Message, SerializedConnection } from './types';
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
    missedConnections: [SerializedConnection, ObjectNode, ObjectNode, number][];
    historyNodes: Set<ObjectNode>;
    setAudioWorklet?: (x: AudioWorkletNode | null) => void;
    outputStatements: Statement[];
    presentationMode: boolean;
    skipRecompile: boolean;
    skipRecompile2: boolean;
    setZenCode?: (x: string | null) => void;
    setVisualsCode?: (x: string | null) => void;
    previousSerializedPatch?: SerializedPatch;
    previousDocId?: string;

    constructor() {
        this.id = uuid();
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
        this.audioContext = new AudioContext({ sampleRate: 44100 });
        this.worklets = [];
        this.waiting = false;
        this.storedStatement = undefined;
        this.missedConnections = [];
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

    recompileGraph(recompileGraph?: boolean) {
        console.log("recompileGraph(%s)", recompileGraph, this.name);
        let startTime = new Date().getTime();
        if (this.skipRecompile || this.skipRecompile2) {
            console.log("SKIP RECOMPILE");
            return;
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
        let _objectNodes = objectNodes;
        if (true) { //this.name === undefined) {
            for (let node of _objectNodes) {
                if (node.operatorContextType !== OperatorContextType.ZEN &&
                    node.operatorContextType !== OperatorContextType.GL) {
                    continue;
                }
                if (node.subpatch) {
                    continue;
                }
                node.inlets.forEach(
                    n => {
                        n.lastMessage = undefined;
                    });
                node.lastSentMessage = undefined;
                if ((node as ObjectNode).name !== "param" && (node as ObjectNode).name !== "uniform") {
                    node.storedMessage = undefined;
                }
            }

            console.log('node');
            for (let node of _objectNodes) {
                if (node.operatorContextType !== OperatorContextType.ZEN &&
                    node.operatorContextType !== OperatorContextType.GL) {
                    continue;
                }
                if (node.subpatch) {
                    continue;
                }
                node.inlets.forEach(
                    n => {
                        n.lastMessage = undefined;
                    });
                node.parse(node.text, node.operatorContextType, false);
            }
        }

        for (let node of objectNodes) {
            if (node.subpatch) {
                node.subpatch.recompileGraph(true);
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

        sourceNodes = objectNodes.filter(node => node.name === "history" || node.name === "param" || node.name === "argument" || node.name === "uniform");
        sourceNodes.forEach(
            sourceNode => {
                if (sourceNode.fn) {
                    sourceNode.receive(sourceNode.inlets[0], "bang");
                }
            });

        let c = new Date().getTime();
        if (c - b > 10) {
        }

        //this.sendNumberMessages()

        this.waiting = false;

        sourceNodes = objectNodes.filter(node => (node.inlets.length === 0 && !node.needsLoad));
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

        sourceNodes = objectNodes.filter(node => node.needsLoad && node.inlets[0] && node.inlets[0].connections.length === 0);
        sourceNodes.forEach(
            sourceNode => {
                if (sourceNode.fn) {
                    sourceNode.receive(sourceNode.inlets[0], "bang");
                    /*
                    let ret: Message[] = sourceNode.fn("bang");
                    for (let i = 0; i < ret.length; i++) {
                        if (sourceNode.outlets[i]) {
                            sourceNode.send(sourceNode.outlets[i], ret[i]);
                        }
                    }
                    */
                }
            });

        sourceNodes = objectNodes.filter(node => node.needsLoad && !(node.inlets[0] && node.inlets[0].connections.length === 0));
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


        if (this.name === undefined) {
            console.log("name was undefined");
            let calls = _objectNodes.filter(node => node.name === "call" || node.name === "latchcall");
            calls.forEach(
                call => {
                    if (call.fn && call.inlets[0] && call.inlets[0].lastMessage) {
                        call.receive(call.inlets[0], call.inlets[0].lastMessage);
                    }
                    return;
                });

            let inputs = this.getAllNodes().filter(node => node.name === "in");
            console.log("inputs to fetch ", inputs);
            inputs.forEach(
                input => {
                    // get the patch
                    let p = input.patch as SubPatch;
                    let inletNumber = (input.arguments[0] as number) - 1;

                    if (p.parentNode) {
                        if (p.parentNode.inlets[inletNumber].connections.length === 0) {
                            // send a 0 then
                            console.log("no connections so sending via outlets of input", input.outlets[0].connections);
                            for (let c of input.outlets[0].connections) {
                                let { destinationInlet, destination } = c;
                                let value = (input.attributes["default"] as number) || 0;
                                console.log('sending value =%s to dest=', value, destination, destinationInlet);
                                destination.receive(destinationInlet, value);
                            }
                        }
                    }
                });
        }


        let d = new Date().getTime();
        if (d - c > 10) {
        }

        //this.startParameterNumberMessages()
        //this.sendAttributeMessages()

        if (this.storedStatement) {
            this.compile(this.storedStatement);
        }

        /*
        let matricesAndBuffers = this.objectNodes.filter(x => x.name === "matrix" || x.name === "buffer");
        matricesAndBuffers.forEach(
            matrix => matrix.receive(matrix.inlets[0], "bang"));
            */

        this.skipRecompile2 = false;

        if (true) {
            //console.log("recompile ended =", this.name || this.id, new Date().getTime());
        }
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

        if (this.name === undefined) {
        }
        setTimeout(() => {
            if (id !== this.counter) {
                return
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
                        /*
                        // make sure the hist is somewhere in the statement
                        if (param) {
                            if (containsSameHistory(hist, statement, false)) {
                                console.log("hist contained in statement", dependency);
                                _statement.push(dependency as any);
                            } else {
                                console.log("hist not contained in statement", dependency);
                            }
                        }
                        */
                    }
                }
                _statement.push(statement as any);
                //statement = _statement as Statement;
                statement = ["s" as Operator, _statement as Statement];
            }
            let ast = compileStatement(statement);
            let inputFile = printStatement(statement);
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

            if (this.setZenCode) {
                this.setZenCode(inputFile);
            }

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
                            publish(e.data.type, [e.data.subType, e.data.body]);
                        };

                        console.log('received audio worklet now trying to connect to destination');
                        if (ret.workletNode.channelCount <= 1) {
                            console.log('channel count is 1 or less so connecting directly to dest', this.audioContext);
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
                        this.skipRecompile = true;
                        this.sendNumberMessages();
                        this.sendAttributeMessages();
                        let matricesAndBuffers = this.objectNodes.filter(x => x.name === "matrix" || x.name === "buffer");
                        matricesAndBuffers.forEach(
                            matrix => matrix.receive(matrix.inlets[0], "bang"));

                        this.skipRecompile = false;

                    })
                .catch(e => {
                });
        }, 50);
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
            this.recompileGraph();
        }
        return _connections;
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

const getFunctionNames = (dslCode: string) => {
    const funcRegex = /\b(\w+)\(/g;

    // Object to store unique function names
    const functions: any = {};

    // Find all matches
    let match;
    while ((match = funcRegex.exec(dslCode)) !== null) {
        functions[match[1]] = true; // Store the function name
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
    Object.entries(shorthands).forEach(([original, shorthand], i) => {
        if (!original.includes("hist")) {
            shorthandDefinitions += `${shorthand}=${original}`;
            if (i < Object.values(shorthands).length - 1) {
                shorthandDefinitions += ',';
            }
            outDSL = outDSL.replaceAll('=' + original + '(', '=' + shorthand + '(');
        }
    });
    shorthandDefinitions = replaceAll(shorthandDefinitions, "\n", "");

    outDSL = shorthandDefinitions + ';\n' + "let " + outDSL.replaceAll("let ", ",").replaceAll(";", "").replaceAll("\n", "").slice(1);
    let retIndex = outDSL.indexOf("return");
    outDSL = outDSL.slice(0, retIndex) + ';\n' + outDSL.slice(retIndex);

    return outDSL;

};

