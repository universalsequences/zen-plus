import { OperatorContextType, OperatorContext, getOperatorContext } from './context';
import { NumberOfInlets } from '@/lib/docs/docs';
import { DataType } from '@/lib/nodes/typechecker';
import { GLType } from '@/lib/gl/index';
import { createGLFunction } from './definitions/create';
import { Statement, Operator } from './definitions/zen/types';
import pako from 'pako';
import { Definition } from '../docs/docs';
import { BaseNode } from './BaseNode';
import { v4 as uuidv4 } from 'uuid';
import { uuid, registerUUID } from '@/lib/uuid/IDGenerator';
import { SerializableCustom, Node, SerializedPatch, Size } from './types';

import {
    ConnectionType,
    Lazy,
    Message,
    NodeFunction,
    InstanceFunction,
    Attributes,
    Coordinate,
    IOlet,
    Identifier,
    Patch,
    ObjectNode,
    SubPatch,
    SerializedObjectNode,
    SerializedOutlet
} from './types';

interface Constants {
    [x: string]: number;
}

const CONSTANTS: Constants = {
    "twopi": 2 * Math.PI,
    "halfpi": 0.5 * Math.PI,
    "pi": Math.PI
}

export default class ObjectNodeImpl extends BaseNode implements ObjectNode {
    id: Identifier;
    needsLoad?: boolean;
    inlets: IOlet[];
    outlets: IOlet[];
    lastSentMessage?: Message;
    isCycle?: boolean;
    position: Coordinate;
    presentationPosition?: Coordinate;
    zIndex: number;
    name?: string;
    fn?: InstanceFunction;
    text: string;
    arguments: Message[];
    subpatch?: SubPatch;
    buffer?: Float32Array | Uint8Array;
    size?: Size;
    audioNode?: AudioNode;
    operatorContextType: OperatorContextType;
    storedMessage?: Message;
    saveData?: any;
    custom?: SerializableCustom;

    constructor(patch: Patch) {
        super(patch);
        this.zIndex = 0;
        this.id = uuid();
        this.text = "";
        this.inlets = [];
        this.outlets = [];
        this.position = { x: 0, y: 0 };
        this.newAttribute("Include in Presentation", false, () => {
            this.patch.objectNodes = [... this.patch.objectNodes];
            if (this.patch.setObjectNodes) {
                this.patch.setObjectNodes(this.patch.objectNodes);
            }
        });
        this.newAttribute("font-size", 9);
        this.arguments = [];
        this.operatorContextType = OperatorContextType.ZEN;
    }


    /**
       * adds attributes to object and removes them from string
     */
    parseAttributes(text: string, context: OperatorContext): string {
        delete this.attributes["min"];
        delete this.attributes["max"];
        let tokens = text.split(" ").filter(x => x.length > 0);
        let name = tokens[0];
        let nonAttributeTokens = [name];
        let definition: Definition | null = context.lookupDoc(name);
        if (definition) {
            if (definition.attributes) {
                this.attributes = {
                    ...definition.attributes
                };
            }
        }

        for (let i = 1; i < tokens.length; i++) {
            let token = tokens[i];
            if (token[0] === '@') {
                let attributeName = token.slice(1);
                let attributeValue = tokens[i + 1];
                if (attributeValue.includes(",")) {
                    let splits = attributeValue.split(",");
                    let vals: (number[]) = [];
                    for (let sp of splits) {
                        vals.push(parseFloat(sp));
                    }
                    this.attributes[attributeName] = vals;
                } else if (isNaN(parseFloat(attributeValue))) {
                    this.attributes[attributeName] = attributeValue;
                } else {
                    this.attributes[attributeName] = parseFloat(attributeValue);
                }
                i++;
            } else {
                nonAttributeTokens.push(token);
            }
        }
        return nonAttributeTokens.join(" ");
    }

    /**
     * Parses the given text and updates the instance's name property,
     * arguments and sets the correct NodeFunction
     * called from the UI when user types into an object node box
     *
     * @param {string} text - The text input by the user to parse
     */
    parse(text: string, contextType: OperatorContextType = this.operatorContextType, compile = true, patchPreset?: SerializedPatch): boolean {
        let context: OperatorContext = getOperatorContext(contextType);
        this.lastSentMessage = undefined;
        this.operatorContextType = contextType;
        let originalText = text;
        text = this.parseAttributes(text, context);
        let tokens: string[] = text.split(" ").filter(x => x.length > 0);
        let name = tokens[0];
        let argumentTokens = tokens.slice(1);

        // let patchPreset: SerializedPatch | null = this.getPatchPresetIfAny(name);
        if (patchPreset) {
            text = text.replace(name, "zen");
            name = "zen";
        }

        this.isCycle = undefined;

        let definition: Definition | null = context.lookupDoc(name);

        if (definition && definition.name) {
            name = definition.name;
        }

        if (definition && definition.attributeOptions) {
            for (let opt in definition.attributeOptions) {
                if (!this.attributeOptions[opt]) {
                    this.attributeOptions[opt] = [];
                }
                this.attributeOptions[opt] = Array.from(new Set([... this.attributeOptions[opt], ...definition.attributeOptions[opt]]));
            }
        }

        this.inlets.forEach(x => x.hidden = false);

        if (!definition) {
            if (name in CONSTANTS || !isNaN(parseFloat(name))) {
                let parsed = CONSTANTS[name] || parseFloat(name);
                // an object with just a number becomes a static number object (all it does is send its number along)
                if (tokens.length > 1 && tokens.every(x => !isNaN(parseFloat(x)))) {
                    let array: number[] = tokens.map(x => parseFloat(x));
                    this.text = text;
                    this.setupStaticListObject(array, compile);
                    return true;
                }

                this.text = name;

                this.setupStaticNumberObject(parsed, compile);
                return true;
            }
            return false;
        }


        if (!context.api[name] && this.operatorContextType !== OperatorContextType.GL) {
            return false;
        }

        this.text = originalText;

        let _numberOfOutlets = typeof definition.numberOfOutlets === "function" ?
            definition.numberOfOutlets(tokens.length) :
            typeof definition.numberOfOutlets === "string" ? this.attributes[definition.numberOfOutlets] as number :
                definition.numberOfOutlets;

        let numberOfInlets = definition.numberOfInlets === NumberOfInlets.Outlets ? _numberOfOutlets : typeof definition.numberOfInlets === "function" ?
            definition.numberOfInlets(tokens.length) :
            typeof definition.numberOfInlets === "string" ? this.attributes[definition.numberOfInlets] as number :
                definition.numberOfInlets;

        let parsedArguments = this.parseArguments(
            argumentTokens, numberOfInlets, definition.defaultValue as number | undefined);

        let lazyArgs: Lazy[] = this.generateIO(definition, parsedArguments, argumentTokens.length);
        let nodeFunction: NodeFunction = context.api[name];

        if (!nodeFunction && this.operatorContextType === OperatorContextType.GL) {
            nodeFunction = createGLFunction(this, definition);
            if (definition.numberOfInlets === 0) {
                this.needsLoad = true;
            }
        }
        this.name = name;

        let instanceFunction: InstanceFunction = nodeFunction(this, ...lazyArgs);
        this.fn = instanceFunction;


        if (compile && this.name !== "zen" && (this.operatorContextType === OperatorContextType.ZEN ||
            this.operatorContextType === OperatorContextType.GL)) {
            if (!this.patch.skipRecompile) {
                this.patch.recompileGraph();
            }
        }

        if (patchPreset && this.subpatch) {
            this.subpatch.objectNodes = [];
            if ((patchPreset as any).compressed) {
                // Convert the Base64 string back to a binary buffer
                const binaryBuffer = Buffer.from((patchPreset as any).compressed, 'base64');
                // Decompress the data using Pako
                const decompressed = pako.inflate(binaryBuffer, { to: 'string' });
                let json = JSON.parse(decompressed);
                this.subpatch.fromJSON(json, true);
            } else {
                this.subpatch.fromJSON(patchPreset, true);
            }

        }
        return true;
    }

    setupStaticNumberObject(num: number, compile: boolean) {
        this.operatorContextType = OperatorContextType.NUMBER;
        this.fn = (message: Message) => [num];
        this.inlets.length = 0;
        if (this.outlets.length === 0) {
            this.newOutlet();
        }
        if (compile) {
            this.patch.recompileGraph();
        }
    }

    setupStaticListObject(array: number[], compile: boolean) {
        this.fn = (message: Message) => [array];
        if (this.outlets.length === 0) {
            this.newOutlet();
        }
        if (compile) {
            this.send(this.outlets[0], array);
        }
    }

    generateIO(definition: Definition, parsedArguments: (Message | undefined)[], numberOfParsedArguments: number): Lazy[] {
        let { numberOfInlets, numberOfOutlets, outletNames, inletNames } = definition;
        let _numberOfOutlets = typeof numberOfOutlets === "function" ?
            numberOfOutlets(numberOfParsedArguments + 1) :
            typeof numberOfOutlets === "string" ? this.attributes[numberOfOutlets] as number :
                numberOfOutlets;
        let _numberOfInlets = numberOfInlets === NumberOfInlets.Outlets ? _numberOfOutlets : typeof numberOfInlets === "function" ?
            numberOfInlets(numberOfParsedArguments + 1) :
            typeof numberOfInlets === "string" ? this.attributes[numberOfInlets] as number :
                numberOfInlets;

        let lazyArgs: Lazy[] = [];
        for (let i = 0; i < _numberOfInlets; i++) {
            if (!this.inlets[i]) {
                // no inlet yet, so we need to create one
                if (inletNames && inletNames[i]) {
                    this.newInlet(inletNames[i], definition.inletType);
                } else {
                    this.newInlet(undefined, definition.inletType);
                }
            } else {
                // inlet already exists.. so just change name if necessary
                if (inletNames && inletNames[i]) {
                    this.inlets[i].name = inletNames[i];
                }
            }

            if (i > 0 && i < numberOfParsedArguments + 1 && this.inlets[i]) {
                if (typeof numberOfInlets === "function") {
                    this.inlets[i].hidden = false;
                } else {
                    this.inlets[i].hidden = true;
                }
            } else {
                this.inlets[i].hidden = false;
            }

            // create a lazy function that resolve to the current argument value
            if (i > 0) {
                if (this.inlets[i]) {
                    if (this.inlets[i].connections.length === 0) {
                        this.inlets[i].lastMessage = parsedArguments[i - 1];
                    }
                }
                lazyArgs.push(() => this.arguments[i - 1]);
            }
            if (this.name === "in") {
                this.inlets[i].hidden = true;
            }
        }

        for (let i = 0; i < _numberOfOutlets; i++) {
            if (!this.outlets[i]) {
                // no inlet yet, so we need to create one
                let outletType = this.name === "zen" && !this.patch.isZen ?
                    ConnectionType.AUDIO : definition.outletType;
                if (outletNames && outletNames[i]) {
                    this.newOutlet(outletNames[i], outletType);
                } else {
                    this.newOutlet(undefined, outletType);
                }
            } else {
                // inlet already exists.. so just change name if necessary
                if (outletNames && outletNames[i]) {
                    this.outlets[i].name = outletNames[i];
                }
            }
        }

        // check the number of io-lets matches the spec
        if (!this.audioNode && this.name !== "speakers~" && this.name !== "call" && this.name !== "latchcall" && this.name !== "zen" && this.outlets.length > _numberOfOutlets && this.name !== "canvas" && this.name !== "polycall" && this.name !== "param" && this.name !== "modeling.synth" && this.name !== "modeling.component") {
            this.outlets = this.outlets.slice(0, _numberOfOutlets);
        }

        if (!this.audioNode && this.name !== "zen" && this.inlets.length > _numberOfInlets && this.name !== "polycall") {
            this.inlets = this.inlets.slice(0, _numberOfInlets);
        }

        return lazyArgs;
    }

    parseArguments(tokens: string[], numberOfInlets: number, defaultMessage?: number): (Message | undefined)[] {
        let otherArguments: (Message | undefined)[] = [];
        let defaultArgument = defaultMessage === undefined ? 0 : defaultMessage;

        for (let i = 0; i < Math.max(tokens.length, numberOfInlets); i++) {
            let parsed: Message = CONSTANTS[tokens[i]] || parseFloat(tokens[i]);
            if (tokens[i] !== undefined && isNaN(parsed)) {
                parsed = tokens[i];
            }
            this.arguments[i] = i < tokens.length ? parsed : defaultArgument;
            otherArguments[i] = i < tokens.length ? parsed : defaultMessage;
        }
        return otherArguments;
    }

    pipeSubPatch(inlet: IOlet, message: Message, fromNode?: Node) {
        let subpatch = this.subpatch;
        if (!subpatch) {
            return;
        }
        let inputNodes = subpatch.objectNodes.filter(x => x.name === "in");
        let inputNumber = this.inlets.indexOf(inlet) + 1;
        if (message !== undefined) {
            let inputNode = inputNodes.find(x => x.arguments[0] === inputNumber);
            if (inputNode && inputNode.outlets[0]) {
                let ogType = (message as Statement).type;
                if (inputNode.attributes["min"] !== undefined) {
                    message = ["max" as Operator, inputNode.attributes["min"] as number, message as Statement];
                    (message as Statement).type = ogType;
                }
                if (inputNode.attributes["max"] !== undefined) {
                    message = ["min" as Operator, inputNode.attributes["max"] as number, message as Statement];
                    (message as Statement).type = ogType;
                }
                let outlet = inputNode.outlets[0];
                for (let connection of outlet.connections) {
                    let { destination, destinationInlet } = connection;
                    destination.receive(destinationInlet, message, fromNode);
                }
            }
        }
    }

    newInlet(name?: string, c?: ConnectionType) {
        let t = this.operatorContextType;
        let calculated: ConnectionType = t === OperatorContextType.AUDIO ?
            ConnectionType.AUDIO :
            t === OperatorContextType.ZEN ?
                ConnectionType.ZEN :
                t === OperatorContextType.GL ?
                    ConnectionType.GL :
                    ConnectionType.CORE
        super.newIOlet(this.inlets, name, c || calculated);
    }

    newOutlet(name?: string, c?: ConnectionType) {
        let t = this.operatorContextType;
        let calculated: ConnectionType = t === OperatorContextType.AUDIO ?
            ConnectionType.AUDIO :
            t === OperatorContextType.ZEN ?
                ConnectionType.ZEN :
                t === OperatorContextType.NUMBER ?
                    ConnectionType.NUMBER :
                    t === OperatorContextType.GL ?
                        ConnectionType.GL :
                        ConnectionType.CORE
        super.newIOlet(this.outlets, name, c || calculated);
    }


    processMessageForAttributes(message: Message) {
        if (typeof message === "string") {
            let tokens = message.split(" ").filter(x => x.length > 0);
            let attributeName = tokens[0];
            if (this.subpatch) {
                // if this is a subpatch thats receiving messages...
                // we need to pass it off to subpatch
                let subpatchProcess = this.subpatch.processMessageForParam(message);
                if (subpatchProcess) {
                }
                return true;
            }
            if (this.attributes[attributeName] === undefined) {
                return;
            }
            let attributesValue = tokens[1];
            if (!isNaN(parseFloat(attributesValue))) {
                this.setAttribute(attributeName, parseFloat(attributesValue));
            } else {
                this.setAttribute(attributeName, attributesValue);
            }
            return true;
        }

        return false;
    }

    applyInletSumming(inlet: IOlet, message: Message, fromNode?: Node): Message {
        if (typeof message === "string") {
            return message;
        }
        if ((this.name === "accum" && this.inlets.indexOf(inlet) >= 2) || (this.name && this.name.includes("modeling")) || this.name === "uniform" || this.name === "data" || this.name === "param" || this.name === "history" || this.name === "zen" || this.name === "latchcall" || this.name === "call" || this.name === "defun" || this.name === "polycall") {
            return message;
        }
        let lastMessage: Message | undefined = inlet.lastMessage;
        if (lastMessage !== undefined && ((inlet.lastMessage as Statement).node === undefined || ((message as Statement).node === undefined) || (inlet.lastMessage as Statement).node !== (message as Statement).node)) {
            if (this.operatorContextType === OperatorContextType.ZEN ||
                this.operatorContextType === OperatorContextType.GL) {
                if ((message as Statement).node && (message as Statement).node!.id.includes("history")) {
                    return message;
                }
                if ((lastMessage as Statement).node && (lastMessage as Statement).node!.id.includes("history")) {
                    return message;
                }
                // go thru the market messages and this message and add them
                let nodes = new Set<Node>();
                if (fromNode) {
                    nodes.add(fromNode);
                }
                let statement = message as Statement;
                let operator = this.operatorContextType === OperatorContextType.GL ? "+" : "add";
                for (let markedMessage of inlet.markedMessages || []) {
                    let node = markedMessage.node;
                    if (node && nodes.has(node)) {
                        continue;
                    }
                    if (node) {
                        nodes.add(node);
                    }
                    let type = ((statement).type || (markedMessage.message as Statement).type);
                    statement = [operator as Operator, statement, markedMessage.message as Statement];
                    statement.type = type;
                    let newId = Math.round((Math.random() * 1000000))
                    statement.node = {
                        ... this,
                        id: newId + '_sumation' //(message as Statement).node ? (message as Statement).node!.id + '_sumation' : newId + '_sumation'
                    };
                }
                if (typeof statement === "number") {
                    return statement;
                }
                let newId = Math.round((Math.random() * 1000000))
                statement.node = {
                    ... this,
                    id: newId + '_sumation'
                };

                this.lastSentMessage = undefined;
                return statement;
            }
        }
        return message;
    }

    receive(inlet: IOlet, message: Message, fromNode?: Node) {
        if (!this.fn) {
            return;
        }

        if (this.processMessageForAttributes(message) && (!inlet.node || inlet.node.attributes["type"] !== "core")) {
            return;
        }
        let ogMessage = message;
        message = this.applyInletSumming(inlet, message, fromNode);
        super.receive(inlet, message, fromNode);
        if (!inlet.markedMessages) {
            inlet.markedMessages = [];
        }
        inlet.markedMessages.push({ message: ogMessage, node: fromNode });

        let indexOf = this.inlets.indexOf(inlet);

        if (indexOf > 0) {
            let argumentNumber = indexOf - 1;
            this.arguments[argumentNumber] = message;
        }

        if (inlet.messagesReceived === undefined) {
            inlet.messagesReceived = 0;
        }
        inlet.messagesReceived++;


        if (this.operatorContextType === OperatorContextType.ZEN ||
            this.operatorContextType === OperatorContextType.GL) {
            let INLETS = [];
            for (let inlet of this.inlets) {
                for (let connection of inlet.connections) {
                    let node = (connection.source as ObjectNode);
                    if (node && node.name === "in") {
                        // then we actually want the inlet refering to that
                        let num = (node.arguments[0] as number) - 1;
                        let baseNode = (connection.source.patch as SubPatch).parentNode;
                        let _inlet = baseNode.inlets[num];
                        if (_inlet) {
                            inlet = _inlet;
                            break;
                        }
                    }
                }
                INLETS.push(inlet);
            }

            let _inlets = INLETS.filter(inlet => inlet.messagesReceived! < inlet.connections.filter(x => x.source && (!(x.source as ObjectNode).name || (x.source as ObjectNode).name !== "attrui")).length);
            if (typeof message !== "string" && _inlets.length > 0) {
                if ((this.name === "accum" && indexOf >= 2) || (this.name && this.name.includes("modeling")) || this.name === "uniform" || this.name === "data" || this.name === "param" || this.name === "history" || this.name === "zen" || this.name === "latchcall" || this.name === "call" || this.name === "polycall" || this.name === "defun" || this.name === "canvas") {
                } else {
                    //console.log("FAILED TO PASS", INLETS, _inlets, this.text, this);
                    return;
                }
            }
        }

        // these are subpatches
        if (this.name === "zen") {
            this.pipeSubPatch(inlet, message, fromNode);
            return;
        }

        if (this.operatorContextType === OperatorContextType.ZEN && this.lastSentMessage !== undefined && this.name !== "param" && this.name !== "uniform" && this.name !== "attrui" && this.name !== "call" && this.name !== "history" && this.name !== "defun" && this.name !== "polycall" && this.name !== "modeling.component" && this.name !== "modeling.synth" && this.name !== "data" && this.name !== "canvas") {

            return;
        } else {
        }


        if (indexOf == 0) {
            // we are sending through the main inlet, i.e. run the function
            if (this.inlets.some((x, i) => x.lastMessage === undefined) && this.name !== "out" && (this.name !== "in")) {
                return;
            }
            let a = new Date().getTime();
            let ret: Message[] = this.fn(message);
            let b = new Date().getTime();
            if (b - a > 5) {
            }

            for (let i = 0; i < ret.length; i++) {
                if (this.outlets[i]) {
                    this.send(this.outlets[i], ret[i]);
                }
            }
            if (ret[0]) {
                this.lastSentMessage = ret[0];
            }
        } else if (indexOf > 0) {
            // store the message in arguments
            let argumentNumber = indexOf - 1;
            this.arguments[argumentNumber] = message;

            if (this.inlets.some((c, i) => c.lastMessage === undefined) && this.name !== "out" && (this.name !== "in")) {
                return;
            }

            // if we've already received a message in left-most inlet, we
            // run the function (assuming its a "hot inlet" for now)
            let lastMessage = this.inlets[0] && this.inlets[0].lastMessage;
            if (lastMessage !== undefined) {
                let a = new Date().getTime();
                let ret: Message[] = this.fn(lastMessage);
                let b = new Date().getTime();
                if (b - a > 5) {
                }

                for (let i = 0; i < ret.length; i++) {
                    if (this.outlets[i]) {
                        this.send(this.outlets[i], ret[i]);
                    }
                }
                if (ret[0]) {
                    this.lastSentMessage = ret[0];
                }
            }
        }
    }

    getJSON(): SerializedObjectNode {
        let json: any = {
            id: this.id,
            text: this.text,
            position: this.position,
            presentationPosition: this.presentationPosition,
            outlets: this.getConnectionsJSON(),
            size: this.size,
            operatorContextType: this.operatorContextType,
        };

        if (this.custom) {
            json.custom = this.custom.getJSON();
        }

        if (this.buffer && this.name !== "buffer") {
            json.buffer = Array.from(this.buffer);
        }

        if (this.saveData) {
            json.saveData = this.saveData;
        }

        if (!json.presentationPosition) {
            delete json.presentationPosition;
        }

        json.attributes = {};
        for (let name in this.attributes) {
            if (this.attributes[name] !== this.attributeDefaults[name]) {
                json.attributes[name] = this.attributes[name];
            }
        }
        if (Object.keys(json.attributes).length === 0) {
            delete json.attributes;
        }
        if (this.operatorContextType === 0) {
            delete json.operatorContextType;
        }
        //        json.attributes = { ... this.attributes };

        if (this.subpatch) {
            return {
                ...json,
                subpatch: this.subpatch.getJSON(),
            };
        }

        if (this.outlets.length > 1) {
            json.numberOfOutlets = this.outlets.length;
        }
        return json;
    }

    fromJSON(json: SerializedObjectNode, isPreset?: boolean) {
        if (json.buffer) {
            this.buffer = json.attributes && json.attributes["type"] === "uint8" ? new Uint8Array(json.buffer) : new Float32Array(json.buffer);
        }


        if (json.saveData) {
            this.storedMessage = json.saveData;
        }

        if (json.size) {
            this.size = json.size;
        }

        if (json.attributes) {
            this.attributes = {
                ... this.attributes,
                ...json.attributes
            }
        }

        this.position = json.position;
        if (json.presentationPosition) {
            this.presentationPosition = json.presentationPosition;
        }

        if (json.subpatch) {
            this.parse(json.text.includes("zen") && json.text.includes("@type") ? json.text : "zen", OperatorContextType.ZEN, false);
        } else {
            this.parse(json.text, json.operatorContextType || OperatorContextType.ZEN, false);
        }
        if (json.numberOfOutlets) {
            for (let i = 0; i < json.numberOfOutlets; i++) {
                if (!this.outlets[i]) {
                    this.newOutlet(undefined, this.operatorContextType === OperatorContextType.AUDIO ? ConnectionType.AUDIO : undefined);
                }
            }
        }

        this.id = json.id;

        if (!isPreset) {
            registerUUID(this.id);
        }

        if (json.subpatch && this.subpatch) {
            this.subpatch.objectNodes = [];
            this.subpatch.fromJSON(json.subpatch, isPreset);
            if (this.size && json.size) {
                this.size.width = json.size.width;
                this.size.height = json.size.height;
            }
        }

        if (json.attributes) {
            this.attributes = {
                ... this.attributes,
                ...json.attributes
            }
        }
        if (json.custom && this.custom) {
            this.custom.fromJSON(json.custom);
        }
    }


    getPatchPresetIfAny(name: string): SerializedPatch | null {
        // TODO: make this data-source modular, with multi data sources  beyond localstorage
        let payload = window.localStorage.getItem(`subpatch.${name}`);

        if (payload) {
            return JSON.parse(payload) as SerializedPatch;
        }
        return null;
    }

    useAudioNode(audioNode: AudioNode) {
        this.audioNode = audioNode;

        for (let i = 0; i < this.audioNode.channelCount; i++) {
            if (!this.outlets[i]) {
                this.newOutlet(`channel ${i + 1}`, ConnectionType.AUDIO);
            }
        }
        for (let inlet of this.inlets) {
            inlet.connectionType = ConnectionType.AUDIO
        }
        for (let outlet of this.outlets) {
            outlet.connectionType = ConnectionType.AUDIO
        }
    }
}

