import { OperatorContextType, OperatorContext, getOperatorContext } from './context';
import { Statement, Operator } from './definitions/zen/types';
import pako from 'pako';
import { Definition } from '../docs/docs';
import { BaseNode } from './BaseNode';
import { v4 as uuidv4 } from 'uuid';
import { uuid, registerUUID } from '@/lib/uuid/IDGenerator';
import { SerializedPatch, Size } from './types';

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
    "pi": Math.PI
}

export default class ObjectNodeImpl extends BaseNode implements ObjectNode {
    id: Identifier;
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
    buffer?: Float32Array;
    size?: Size;
    audioNode?: AudioNode;
    operatorContextType: OperatorContextType;

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
        this.arguments = [];
        this.operatorContextType = OperatorContextType.ZEN;
    }


    /**
       * adds attributes to object and removes them from string
     */
    parseAttributes(text: string, context: OperatorContext): string {
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


        if (!context.api[name]) {
            return false;
        }

        this.text = originalText;

        let numberOfInlets = typeof definition.numberOfInlets === "function" ?
            definition.numberOfInlets(tokens.length) :
            typeof definition.numberOfInlets === "string" ? this.attributes[definition.numberOfInlets] as number :
                definition.numberOfInlets;

        let parsedArguments = this.parseArguments(
            argumentTokens, numberOfInlets, definition.defaultValue as number | undefined);

        let nodeFunction: NodeFunction = context.api[name];
        this.name = name;

        let lazyArgs: Lazy[] = this.generateIO(definition, parsedArguments, argumentTokens.length);
        let instanceFunction: InstanceFunction = nodeFunction(this, ...lazyArgs);
        this.fn = instanceFunction;


        if (compile && this.name !== "zen" && this.operatorContextType === OperatorContextType.ZEN) {
            if (!this.patch.skipRecompile) {
                console.log('recompile graph objnode!', 2);
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
                console.log(json, this);
            } else {
                this.subpatch.fromJSON(patchPreset, true);
                console.log(patchPreset, this, this);
            }

        }
        return true;
    }

    setupStaticNumberObject(num: number, compile: boolean) {
        this.fn = (message: Message) => [num];
        this.inlets.length = 0;
        if (this.outlets.length === 0) {
            this.newOutlet();
        }
        if (compile) {
            console.log('recompile graph objectNode!');
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
        let _numberOfInlets = typeof numberOfInlets === "function" ?
            numberOfInlets(numberOfParsedArguments + 1) :
            typeof numberOfInlets === "string" ? this.attributes[numberOfInlets] as number :
                numberOfInlets;
        let _numberOfOutlets = typeof numberOfOutlets === "function" ?
            numberOfOutlets(numberOfParsedArguments + 1) :
            typeof numberOfOutlets === "string" ? this.attributes[numberOfOutlets] as number :
                numberOfOutlets;
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
                if (outletNames && outletNames[i]) {
                    this.newOutlet(outletNames[i], definition.outletType);
                } else {
                    this.newOutlet(undefined, definition.outletType);
                }
            } else {
                // inlet already exists.. so just change name if necessary
                if (outletNames && outletNames[i]) {
                    this.outlets[i].name = outletNames[i];
                }
            }
        }

        // check the number of io-lets matches the spec
        if (!this.audioNode && this.name !== "speakers~" && this.name !== "call" && this.name !== "zen" && this.outlets.length > _numberOfOutlets && this.name !== "canvas" && this.name !== "polycall" && this.name !== "param") {
            this.outlets = this.outlets.slice(0, _numberOfOutlets);
        }

        if (!this.audioNode && this.name !== "zen" && this.inlets.length > _numberOfInlets) {
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

    pipeSubPatch(inlet: IOlet, message: Message) {
        let subpatch = this.subpatch;
        if (!subpatch) {
            return;
        }
        let inputNodes = subpatch.objectNodes.filter(x => x.name === "in");
        let inputNumber = this.inlets.indexOf(inlet) + 1;
        if (message !== undefined) {
            let inputNode = inputNodes.find(x => x.arguments[0] === inputNumber);
            if (inputNode && inputNode.outlets[0]) {
                let outlet = inputNode.outlets[0];
                for (let connection of outlet.connections) {
                    let { destination, destinationInlet } = connection;
                    destination.receive(destinationInlet, message);
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
                ConnectionType.CORE
        super.newIOlet(this.inlets, name, c || calculated);
    }

    newOutlet(name?: string, c?: ConnectionType) {
        let t = this.operatorContextType;
        let calculated: ConnectionType = t === OperatorContextType.AUDIO ?
            ConnectionType.AUDIO :
            t === OperatorContextType.ZEN ?
                ConnectionType.ZEN :
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

    receive(inlet: IOlet, message: Message) {
        if (!this.fn) {
            return;
        }

        if (this.processMessageForAttributes(message)) {
            return;
        }

        //        console.log(this.name, "receive", this.inlets.indexOf(inlet), message);

        super.receive(inlet, message);

        // these are subpatches
        if (this.name === "zen") {
            this.pipeSubPatch(inlet, message);
            return;
        }

        if (this.operatorContextType === OperatorContextType.ZEN && this.lastSentMessage !== undefined && this.name !== "param" && this.name !== "attrui" && this.name !== "call" && this.name !== "history" && this.name !== "defun" && this.name !== "polycall") {
            return;
        }

        let indexOf = this.inlets.indexOf(inlet);

        if (indexOf == 0) {
            // we are sending through the main inlet, i.e. run the function
            if (this.inlets.some((x, i) => x.lastMessage === undefined) && this.name !== "out") {
                return;
            }
            if (this.name === "call") {
                //                console.log('call = ', this.inlets.map(x => x.lastMessage));
            }
            let a = new Date().getTime();
            let ret: Message[] = this.fn(message);
            let b = new Date().getTime();
            if (b - a > 5) {
                //console.log("fn=%s patch=%s took %s ms", this.text, this.patch.name || this.patch.id, b - a, ret);
            }
            for (let i = 0; i < ret.length; i++) {
                if (this.outlets[i]) {
                    this.send(this.outlets[i], ret[i]);
                }
            }
            this.lastSentMessage = ret[0];
        } else if (indexOf > 0) {
            // store the message in arguments
            let argumentNumber = indexOf - 1;
            this.arguments[argumentNumber] = message;

            if (this.inlets.some((c, i) => c.lastMessage === undefined) && this.name !== "out") {
                return;
            }
            if (this.name === "call") {
                //                console.log('call = ', this.inlets.map(x => x.lastMessage));
            }

            // if we've already received a message in left-most inlet, we
            // run the function (assuming its a "hot inlet" for now)
            let lastMessage = this.inlets[0] && this.inlets[0].lastMessage;
            if (lastMessage !== undefined) {
                let a = new Date().getTime();
                let ret: Message[] = this.fn(lastMessage);
                let b = new Date().getTime();
                if (b - a > 5) {
                    //console.log("fn=%s patch=%s took %s ms", this.text, this.patch.name || this.patch.id, b - a, ret);
                }
                for (let i = 0; i < ret.length; i++) {
                    if (this.outlets[i]) {
                        this.send(this.outlets[i], ret[i]);
                    }
                }
                this.lastSentMessage = ret[0];
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
            operatorContextType: this.operatorContextType
        };

        if (this.buffer && this.name !== "buffer") {
            json.buffer = Array.from(this.buffer);
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
            this.buffer = new Float32Array(json.buffer);
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
            this.parse("zen", json.operatorContextType || OperatorContextType.ZEN, false);
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
    }
}

