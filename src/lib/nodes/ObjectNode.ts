import { api } from './definitions/index';
import { lookupDoc } from './definitions/doc';
import { Definition } from '../docs/docs';
import { BaseNode } from './BaseNode';
import { v4 as uuidv4 } from 'uuid';

import {
    Lazy,
    Message,
    NodeFunction,
    InstanceFunction,
    Attributes,
    Coordinate,
    IOlet,
    Identifier,
    Patch,
    ObjectNode
} from './types';

interface Constants {
    [x: string]: number;
}

const CONSTANTS: Constants = {
    "twopi": 2*Math.PI,
    "pi": Math.PI
}

export default class ObjectNodeImpl extends BaseNode implements ObjectNode {
    id: Identifier;
    inlets: IOlet[];
    outlets: IOlet[];
    position: Coordinate;
    zIndex: number;
    name?: string;
    fn?: InstanceFunction;
    attributes: Attributes;
    text: string;
    arguments: Message[];
    initialMessages: (Message | undefined)[];

    constructor(patch: Patch) {
        super(patch);
        this.zIndex = 0;
        this.id = uuidv4();
        this.text = "";
        this.inlets = [];
        this.outlets = [];
        this.position = { x: 0, y: 0 };
        this.attributes = {};
        this.arguments = [];
        this.initialMessages = [];
    }

    /**
     * Parses the given text and updates the instance's name property,
     * arguments and sets the correct NodeFunction
     * @param {string} text - The text input by the user to parse
     */
    parse(text: string, compile=true): boolean {
        let tokens: string[] = text.split(" ").filter(x => x.length > 0);
        let name = tokens[0];
        let argumentTokens = tokens.slice(1);

        let definition: Definition | null = lookupDoc(name);

        this.inlets.forEach(x => x.hidden=false);
        if (!definition) {
            if (name in CONSTANTS || !isNaN(parseFloat(name))) {
                let parsed = CONSTANTS[name] || parseFloat(name);
                // an object with just a number becomes a static number object (all it does is send its number along)
                this.text = name;
                this.setupStaticNumberObject(parsed, compile);
                return true;
            }
            return false;
        }

        if (!api[name]) {
            return false;
        }

        this.text = text;

        let parsedArguments = this.parseArguments(argumentTokens, definition.numberOfInlets, definition.defaultValue);
        this.initialMessages = parsedArguments;
        let nodeFunction: NodeFunction = api[name];
        this.name = name;

        let lazyArgs: Lazy[] = this.generateIO(definition, parsedArguments, argumentTokens.length);
        let instanceFunction: InstanceFunction = nodeFunction(this, ...lazyArgs);
        this.fn = instanceFunction;

        if (compile) {
            this.patch.recompileGraph();
        }
        console.log(this);
        return true;
    }

    setupStaticNumberObject(num: number, compile: boolean) {
        this.fn = (message: Message) => [num];
        if (this.outlets.length === 0) {
            this.newOutlet();
        }
        if (compile) {
            this.patch.recompileGraph();
        }
    }

    generateIO(definition: Definition, parsedArguments: (Message | undefined)[], numberOfParsedArguments: number): Lazy[] {
        let { numberOfInlets, numberOfOutlets, outletNames, inletNames } = definition;
        let lazyArgs: Lazy[] = [];
        for (let i = 0; i < numberOfInlets; i++) {
            if (!this.inlets[i]) {
                // no inlet yet, so we need to create one
                if (inletNames && inletNames[i]) {
                    this.newInlet(inletNames[i]);
                } else {
                    this.newInlet();
                }
            } else {
                // inlet already exists.. so just change name if necessary
                if (inletNames && inletNames[i]) {
                    this.inlets[i].name = inletNames[i];
                }
            }
            if (i > 0 && i < numberOfParsedArguments + 1 && this.inlets[i]) {
                this.inlets[i].hidden = true;
            } else {
                this.inlets[i].hidden = false;
            }

            // create a lazy function that resolve to the current argument value
            if (i > 0) {
                if (this.inlets[i]) {
                    if (this.inlets[i].connections.length === 0) {
                        this.inlets[i].lastMessage = parsedArguments[i-1];
                    }
                }
                lazyArgs.push(() => this.arguments[i - 1]);
            }
        }

        for (let i = 0; i < numberOfOutlets; i++) {
            if (!this.outlets[i]) {
                // no inlet yet, so we need to create one
                if (outletNames && outletNames[i]) {
                    this.newOutlet(outletNames[i]);
                } else {
                    this.newOutlet();
                }
            } else {
                // inlet already exists.. so just change name if necessary
                if (outletNames && outletNames[i]) {
                    this.outlets[i].name = outletNames[i];
                }
            }
        }

        // check the number of io-lets matches the spec
        if (this.outlets.length > numberOfOutlets) {
            this.outlets = this.outlets.slice(0, numberOfOutlets);
        }

        if (this.inlets.length > numberOfInlets) {
            this.inlets = this.inlets.slice(0, numberOfInlets);
        }

        return lazyArgs;
    }

    parseArguments(tokens: string[], numberOfInlets: number, defaultMessage?: number): (Message | undefined)[] {
        let otherArguments: (Message|undefined)[]=[];
        let defaultArgument = defaultMessage === undefined ? 0 : defaultMessage;

        for (let i = 0; i < Math.max(tokens.length, numberOfInlets); i++) {
            let parsed = CONSTANTS[tokens[i]] || parseFloat(tokens[i]);
            this.arguments[i] = i < tokens.length ? parsed : defaultArgument;
            otherArguments[i] = i < tokens.length ? parsed : defaultMessage;
        }
        return otherArguments;
    }

    receive(inlet: IOlet, message: Message) {
        if (!this.fn) {
            return;
        }

        super.receive(inlet, message);

        let indexOf = this.inlets.indexOf(inlet);

        if (indexOf == 0) {
            // we are sending through the main inlet, i.e. run the function
            if (this.inlets.some((x, i) => x.lastMessage === undefined)) {
                return;
            }
            let ret: Message[] = this.fn(message);
            for (let i = 0; i < ret.length; i++) {
                if (this.outlets[i]) {
                    this.send(this.outlets[i], ret[i]);
                }
            }
        } else if (indexOf > 0) {
            // store the message in arguments
            let argumentNumber = indexOf - 1;
            this.arguments[argumentNumber] = message;

            // if we've already received a message in left-most inlet, we
            // run the function (assuming its a "hot inlet" for now)
            if (this.inlets.some((c, i) => c.lastMessage === undefined)) {
                return;
            }

            let lastMessage = this.inlets[0] && this.inlets[0].lastMessage;
            if (lastMessage) {
                let ret: Message[] = this.fn(lastMessage);
                for (let i = 0; i < ret.length; i++) {
                    if (this.outlets[i]) {
                        this.send(this.outlets[i], ret[i]);
                    }
                }
            }
        }
    }
}

