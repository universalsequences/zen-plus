import { BlockGen } from '../zen';
import { Connections } from '@/contexts/PatchContext';
import { Statement } from './definitions/zen/types';

export interface Size {
    width: number;
    height: number;
}

export interface Positioned {
    position: Coordinate;
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

export type Message = string | number | string[] | number[] | Statement | Float32Array;
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

export interface IOConnection {
    source: Node;
    destination: Node;
    sourceOutlet: IOlet; // which outlet of the source this comes from
    destinationInlet: IOlet; // which inlet of the destination this goes to
}

export type IOlet = Identifiable & {
    name?: string;
    connections: IOConnection[];
    lastMessage?: Message;
    hidden?: boolean;
}

export type Attributes = {
    [x: string]: string | number;
}

export type Node = Identifiable & {
    patch: Patch;
    inlets: IOlet[];
    outlets: IOlet[];
    attributes: Attributes;

    newInlet: (name?: string) => void;
    connect: (destination: Node, inlet: IOlet, outlet: IOlet, compile: boolean) => IOConnection;
    disconnect: (connection: IOConnection) => void;
    send: (outlet: IOlet, x: Message) => void;
    receive: (inlet: IOlet, x: Message) => void;
}

export type ObjectNode = Positioned & Node & {
    name?: string; // the name of the object - i.e. what it is
    text: string;
    fn?: InstanceFunction;
    parse: (x: string, compile?: boolean) => boolean;
    arguments: Message[];
    block?: BlockGen;
    subpatch?: SubPatch;
    getJSON: () => SerializedObjectNode;
    fromJSON: (x: SerializedObjectNode) => void;
}

export type MessageNode = Positioned & Node & {
    message?: Message;
}

// for now, only Zen patches are allowed
export enum PatchType {
    Zen
}

export type Patch = Identifiable & {
    objectNodes: ObjectNode[];
    messageNodes: MessageNode[];
    compile: (x: Statement) => void;
    recompileGraph: (force?: boolean) => void;
    type: PatchType;
    historyDependencies: Statement[];
    getAllNodes: () => ObjectNode[];
    newHistoryDependency: (x: Statement, o: ObjectNode) => void;
    getJSON: () => SerializedPatch;
    fromJSON: (x: SerializedPatch) => Connections;
    name?: string;
}

export type SubPatch = Patch & {
    parentNode: ObjectNode;
    parentPatch: Patch;
    clearState: () => void;
}


export interface SerializedOutlet {
    outletNumber: number;
    connections: SerializedConnection[]
};

export interface SerializedConnection {
    destinationId: string;
    destinationInlet: number;
};

export type SerializedObjectNode = Identifiable & {
    text: string;
    position: Coordinate;
    outlets: SerializedOutlet[]
    subpatch?: SerializedPatch;
};

export type SerializedPatch = Identifiable & {
    objectNodes: SerializedObjectNode[]
    name?: string;
};

