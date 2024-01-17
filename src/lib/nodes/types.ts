import { BlockGen } from '../zen';
import { TypeSuccess, TypeError } from './typechecker';
import { RenderJob } from '@/lib/gl/zen';
import { SVGObject } from './definitions/svg/index';
import { ParamGen, param } from '@/lib/zen/index';
import { OperatorContextType } from './context';
import { Connections } from '@/contexts/PatchContext';
import { Statement } from './definitions/zen/types';

export interface Size {
    width: number;
    height: number;
}

export interface Positioned {
    position: Coordinate;
    presentationPosition?: Coordinate;
    zIndex: number;
    size?: Size;
}

export type Identifier = string;

export interface Identifiable {
    id: Identifier;
}

export interface Coordinate {
    x: number;
    y: number;
}

// for the most part, nodes will deal with statements

export type Message = string | number | string[] | number[] | Statement | Float32Array | SVGObject | RenderJob | TypeError | TypeSuccess;
export type Lazy = () => Message;

/**
   A NodeFunction takes a ZObject (node) and some "lazy" args (i.e. the messages
   received in the inlets).
   It returns an InstanceFunction, which process "messages" coming in from the "main inlet"
   The InstanceFunction processes these message and returns a list of messages (which are
   routed through the outlet)
*/
export type InstanceFunction = (x: Message) => Message[];
export type NodeFunction = (node: ObjectNode, ...args: Lazy[]) => InstanceFunction;

// a node has inlets and outlets

export enum ConnectionType {
    AUDIO,
    ZEN,
    CORE,
    GL,
    NUMBER
}

export interface IOConnection {
    source: Node;
    destination: Node;
    sourceOutlet: IOlet; // which outlet of the source this comes from
    destinationInlet: IOlet; // which inlet of the destination this goes to
    segmentation?: number;  // y position of segmentation
    created?: boolean;
}

export type IOlet = Identifiable & {
    name?: string;
    connections: IOConnection[];
    lastMessage?: Message;
    hidden?: boolean;
    connectionType?: ConnectionType; // default = ZEN
}

export type AttributeOptions = {
    [x: string]: string[];
}

export type Attributes = {
    [x: string]: string | number | boolean | string[] | number[];
}

export type AttributeCallbacks = {
    [x: string]: (x: string | number | boolean) => void;
}

export type Attributed = {
    attributes: Attributes;
    attributeCallbacks: AttributeCallbacks;
    attributeOptions: AttributeOptions;
    attributeDefaults: Attributes;
    setAttribute: (name: string, value: string | number | boolean) => void;
    newAttribute: (name: string, defaultValue: string | number | boolean, callback?: (x: string | number | boolean) => void) => void;
}

export type Node = Identifiable & Attributed & {
    patch: Patch;
    inlets: IOlet[];
    outlets: IOlet[];
    newInlet: (name?: string) => void;
    newOutlet: (name?: string) => void;
    connect: (destination: Node, inlet: IOlet, outlet: IOlet, compile: boolean) => IOConnection;
    disconnect: (connection: IOConnection, compile: boolean) => void;
    connectAudioNode: (connection: IOConnection) => void;
    send: (outlet: IOlet, x: Message) => void;
    receive: (inlet: IOlet, x: Message) => void;
}

export type ObjectNode = Positioned & Node & {
    name?: string; // the name of the object - i.e. what it is
    text: string; // the literal text inputed in the object box (used to parse)
    fn?: InstanceFunction; // the function associated with the object name (to be run on message receive)
    parse: (x: string, operatorContextType?: OperatorContextType, compile?: boolean, patch?: SerializedPatch) => boolean; // function to parse text -> fn
    arguments: Message[]; // stored messages from inlets #1,2,3,etc (to be used by fn)
    buffer?: Float32Array; // optional buffer (used in matrix objects)
    subpatch?: SubPatch;
    getJSON: () => SerializedObjectNode;
    fromJSON: (x: SerializedObjectNode) => void;
    size?: Size;
    audioNode?: AudioNode;
    useAudioNode: (x: AudioNode) => void;
    operatorContextType: OperatorContextType;
    needsLoad?: boolean;
    storedLazyMessage?: Lazy;
    param?: ParamGen;
    isCycle?: boolean;
    lastSentMessage?: Message;
    storedMessage?: Message;
    storedParameterValue?: number;
}

export type MessageNode = Positioned & Node & {
    messageType: MessageType;
    message?: Message;
    getJSON: () => SerializedMessageNode;
    fromJSON: (x: SerializedMessageNode) => void;
    parse: (x: string) => void;
}

// for now, only Zen patches are allowed
export enum PatchType {
    Zen
}

export type Patch = Identifiable & {
    objectNodes: ObjectNode[];
    messageNodes: MessageNode[];
    presentationMode: boolean;
    compile: (x: Statement, outputNumber: number) => void;
    recompileGraph: (force?: boolean) => void;
    type: PatchType;
    audioContext: AudioContext;
    historyDependencies: Statement[];
    historyNodes: Set<ObjectNode>;
    getAllNodes: () => ObjectNode[];
    getAllMessageNodes: () => MessageNode[];
    newHistoryDependency: (x: Statement, o: ObjectNode) => void;
    getJSON: () => SerializedPatch;
    fromJSON: (x: SerializedPatch, isPreset?: boolean) => Connections;
    name?: string;
    skipRecompile: boolean;
    skipRecompile2: boolean;
    setZenCode?: (x: string | null) => void;
    setVisualsCode?: (x: string | null) => void;
    setAudioWorklet?: (x: AudioWorkletNode | null) => void; // tells the front-end a new audioworklet has been compiled
    setObjectNodes?: (x: ObjectNode[]) => void; // tells the front-end a new audioworklet has been compiled
    onNewMessage?: (id: string, value: Message) => void;
    previousSerializedPatch?: SerializedPatch;
    previousDocId?: string;
    viewed?: boolean;
    disconnectGraph: () => void;
}

export type SubPatch = Patch & {
    parentNode: ObjectNode;
    parentPatch: Patch;
    clearState: () => void;
    processMessageForParam: (x: Message) => boolean;
}


export interface SerializedOutlet {
    outletNumber?: number;
    connections: SerializedConnection[]
};

export interface SerializedConnection {
    destinationId: string;
    destinationInlet?: number;
    segmentation?: number;
};

export type SerializedObjectNode = Identifiable & {
    text: string;
    position: Coordinate;
    presentationPosition: Coordinate;
    outlets: SerializedOutlet[]
    subpatch?: SerializedPatch;
    buffer?: number[];
    attributes?: Attributes;
    size?: Size;
    operatorContextType: OperatorContextType;
    numberOfOutlets?: number;
};

export type SerializedPatch = Identifiable & {
    presentationMode: boolean;
    objectNodes: SerializedObjectNode[]
    messageNodes?: SerializedMessageNode[]
    name?: string;
    size?: Size;
    isCustomView?: boolean;
};

export type SerializedMessageNode = Identifiable & {
    position: Coordinate;
    presentationPosition: Coordinate;
    outlets: SerializedOutlet[]
    attributes?: Attributes;
    message: Message;
    messageType: MessageType;
}

export enum MessageType {
    Number,
    Message,
    Toggle
}

export enum Orientation {
    X,
    Y,
    XY
}
