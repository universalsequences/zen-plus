import React from "react";
import type { StateChange } from "@/lib/nodes/definitions/core/preset";
import type Assistant from "@/lib/openai/assistant";
import type { TypeSuccess, TypeError } from "./typechecker";
import type { RenderJob } from "@/lib/gl/zen";
import type { SVGObject } from "./definitions/svg/index";
import type { ZenGraph } from "@/lib/zen/zen";
import type { BlockGen, Clicker, ParamGen, param } from "@/lib/zen/index";
import type { OperatorContext, OperatorContextType } from "./context";
import type { Connections } from "@/contexts/PatchContext";
import type { Statement } from "./definitions/zen/types";
import type { Slot } from "./definitions/audio/slots";
import type { BaseNode } from "./BaseNode";
import type { ExportedAudioUnit, ParameterData } from "./compilation/export";
import type {
  FieldSchema,
  GenericStepData,
  ParameterLock,
  StepDataSchema,
} from "./definitions/core/zequencer/types";
import { PatchDoc } from "../org/types";
import { ListPool } from "../lisp/ListPool";
import { RegisteredPatch } from "./definitions/core/registry";
import { Definition } from "../docs/docs";
import { LispError } from "../lisp/eval";
import { Instruction } from "./vm/types";
import { Branching } from "./vm/evaluate";
import { MessageBody } from "@/workers/core";
import { VM } from "@/workers/vm/VM";

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

export type MessageObject = {
  [x: string]: Message;
};

export type Message =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | Statement
  | Float32Array
  | Uint8Array
  | SVGObject
  | RenderJob
  | TypeError
  | TypeSuccess
  | StateChange
  | ObjectNode
  | Message[]
  | MessageObject
  | MessageObject[]
  | Patch
  | ObjectNode
  | Coordinate
  | ParameterLock
  | RegisteredPatch;

export type Lazy = () => Message;

/**
 * The core logic for an operator
 */
export type InstanceFunction = (x: Message) => (Message | undefined)[];

export type BasicNodeFunction = (node: ObjectNode, ...args: Lazy[]) => InstanceFunction;

/**
   A NodeFunction takes an ObjectNode and some "lazy" args (i.e. the messages
   received in the inlets).
   It returns an InstanceFunction, which process "messages" coming in from the "main inlet"
   The InstanceFunction processes these message and returns a list of messages (which are
   routed through the outlet)
*/
export type NodeFunction =
  | BasicNodeFunction
  | (<Schemas extends readonly FieldSchema[]>(
      node: ObjectNode,
      ...args: Lazy[]
    ) => InstanceFunction);

// a node has inlets and outlets

export enum ConnectionType {
  AUDIO = 0,
  ZEN = 1,
  CORE = 2,
  GL = 3,
  NUMBER = 4,
}

export interface IOConnection {
  source: Node;
  destination: Node;
  sourceOutlet: IOlet; // which outlet of the source this comes from
  destinationInlet: IOlet; // which inlet of the destination this goes to
  segmentation?: number; // y position of segmentation
  created?: boolean;
  splitter?: ChannelSplitterNode;
}

export type IOlet = Identifiable & {
  name?: string;
  connections: IOConnection[];
  lastMessage?: Message;
  hidden?: boolean;
  connectionType?: ConnectionType; // default = ZEN
  messagesReceived?: number;
  isHot?: boolean;
  markedMessages?: MarkedMessage[];
  node?: ObjectNode;
  callback?: (x: Message) => void;
};

export type MarkedMessage = {
  message: Message;
  node?: Node;
};

export type AttributeOptions = {
  [x: string]: string[];
};

export type Attributes = {
  [x: string]: string | number | boolean | string[] | number[];
};

export type AttributeCallbacks = {
  [x: string]: (x: AttributeValue) => void;
};

export type AttributeValue = string | number | boolean | number[] | string[];

export type Attributed = {
  attributes: Attributes;
  attributeCallbacks: AttributeCallbacks;
  attributeOptions: AttributeOptions;
  attributeDefaults: Attributes;
  setAttribute: (name: string, value: AttributeValue) => void;
  newAttribute: (
    name: string,
    defaultValue: AttributeValue,
    callback?: (x: AttributeValue) => void,
  ) => void;
};

export type Node = Identifiable &
  Attributed &
  Positioned & {
    patch: Patch;
    inlets: IOlet[];
    outlets: IOlet[];
    newInlet: (name?: string, type?: ConnectionType) => void;
    newOutlet: (name?: string, type?: ConnectionType) => void;
    connect: (destination: Node, inlet: IOlet, outlet: IOlet, compile: boolean) => IOConnection;
    disconnect: (connection: IOConnection, compile: boolean, ignoreAudio?: boolean) => void;
    disconnectAll: () => void;
    connectAudioNode: (connection: IOConnection) => void;
    disconnectAudioNode: (connection: IOConnection) => void;
    send: (outlet: IOlet, x: Message) => void;
    receive: (inlet: IOlet, x: Message, fromNode?: Node) => void;
    onNewValue?: (value: Message) => void;
    onNewValues?: { [x: string]: (value: Message) => void };
    instructions?: Instruction[]; // compiled instructions
    debugInstructions?: Instruction[];
    debugInstructionIndex?: number;
    debugTopologicalIndex?: Record<string, number>;
    skipCompilation?: boolean;
    debugBranching?: Branching;
  };

export type ObjectNode = Positioned &
  Node & {
    name?: string; // the name of the object - i.e. what it is
    text: string; // the literal text inputed in the object box (used to parse)
    fn?: InstanceFunction; // the function associated with the object name (to be run on message receive)
    justCreated?: boolean;
    parse: (
      x: string,
      operatorContextType?: OperatorContextType,
      compile?: boolean,
      patch?: SerializedPatch,
    ) => boolean; // function to parse text -> fn
    arguments: Message[]; // stored messages from inlets #1,2,3,etc (to be used by fn)
    buffer?: Uint8Array | Float32Array | MessageObject[]; // optional buffer (used in matrix objects)
    sharedBuffer?: SharedArrayBuffer;
    onNewSharedBuffer?: (x: SharedArrayBuffer) => void;
    subpatch?: SubPatch;
    getJSON: () => SerializedObjectNode;
    fromJSON: (x: SerializedObjectNode, isPreset?: boolean) => void;
    size?: Size;
    audioNode?: AudioNode; // output for node
    auxAudioNodes?: AudioNode[];
    useAudioNode: (x: AudioNode) => void;
    operatorContextType: OperatorContextType;
    needsLoad?: boolean;
    isResizable?: boolean;
    hasDynamicInlets?: boolean;
    storedLazyMessage?: Lazy;
    param?: ParamGen;
    blockGen?: BlockGen;
    click?: Clicker;
    isCycle?: boolean;
    lastSentMessage?: Message;
    storedMessage?: Message;
    storedParameterValue?: number;
    merger?: ChannelMergerNode; // multi-channel input for node
    saveData?: any;
    custom?: SerializableCustom;
    created?: boolean;
    signalOptions?: SignalOption[];
    slots?: Slot[];
    parentSlots?: ObjectNode;
    steps?: GenericStepData[];
    stepsSchema?: StepDataSchema;
    updateSize: (size: Size) => void;
    controllingParamNode?: ObjectNode; // any param nodes that are controleld by this node
    script?: string;
    pool?: ListPool;
    renderJob?: RenderJob;
    definition?: Definition;
    clearCache: () => void;
    lispError?: LispError;
    branching?: boolean;
    isInletSumSpecialCase?: boolean;
    isSpecialCase?: boolean;
    updateWorkerState: () => void;
    isAsync?: boolean;
    needsMainThread?: boolean;
    parseAttributes: (text: string, context: OperatorContext) => string;
    processMessageForAttributes: (x: Message) => void;
    instructionNodes?: ObjectNode[];
  };

export interface SerializableCustom {
  getJSON: () => any;
  fromJSON: (x: any) => void;
  value: Message;
}

export type MessageNode = Positioned &
  Node & {
    messageType: MessageType;
    message?: Message;
    getJSON: () => SerializedMessageNode;
    fromJSON: (x: SerializedMessageNode) => void;
    parse: (x: string) => void;
    pipeIfApplicable: (x: Message) => Message;
  };

// for now, only Zen patches are allowed
export enum PatchType {
  Zen = 0,
}

export type Patch = Identifiable & {
  clearCache: () => void;
  statementToExport?: Statement;
  finishedInitialCompile: boolean;
  zenGraph?: ZenGraph;
  justExpanded?: boolean;
  isCompiling: boolean;
  initialLoadCompile: (isBase: boolean) => Promise<void>;
  objectNodes: ObjectNode[];
  messageNodes: MessageNode[];
  presentationMode: boolean;
  lockedMode?: boolean;
  compile: (x: Statement, outputNumber?: number) => void;
  recompileGraph: (force?: boolean) => void;
  type: PatchType;
  isZenBase: () => boolean;
  audioContext?: AudioContext;
  historyDependencies: Statement[];
  outputStatements: Statement[];
  historyNodes: Set<ObjectNode>;
  getAllNodes: (visited?: Set<Patch>) => ObjectNode[];
  //getAudioNodes: () => ObjectNode[];
  getAllMessageNodes: () => MessageNode[];
  newHistoryDependency: (x: Statement, o: ObjectNode) => void;
  getJSON: () => SerializedPatch;
  fromJSON: (x: SerializedPatch, isPreset?: boolean) => Connections;
  name?: string;
  skipRecompile: boolean;
  getZenBase: () => Patch | null;
  setZenCode?: (x: string | null) => void;
  wasmCode?: string;
  silentGain?: GainNode;
  zenCode?: string;
  setVisualsCode?: (x: string | null) => void;
  setAudioWorklet?: (x: AudioWorkletNode | null) => void; // tells the front-end a new audioworklet has been compiled
  setObjectNodes?: (x: ObjectNode[]) => void; // tells the front-end a new audioworklet has been compiled
  onNewMessage?: (id: string, value: Message) => void;
  previousSerializedPatch?: SerializedPatch;
  previousDocId?: string;
  viewed?: boolean;
  disconnectGraph: () => void;
  isZen: boolean;
  updateAttributes?: (id: string, attribute: Attributes) => void;
  isSelected?: boolean;
  setupPostCompile: (x: boolean, y?: boolean) => void;
  registerNewNode?: (node: BaseNode) => void;
  registerConnect?: (fromNode: BaseNode, toNode: BaseNode, inlet: number, outlet: number) => void;
  registerReceive?: (node: BaseNode, message: Message, inlet: IOlet) => void;
  storedStatement?: Statement;
  waiting?: boolean;
  recorderWorklet?: AudioWorkletNode;
  isRecording: boolean;
  getBuffer: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  recordingStartedAt?: Date;
  audioNode?: AudioNode;
  exportedAudioUnit?: ExportedAudioUnit;
  setPatchWindows?: React.Dispatch<React.SetStateAction<Patch[]>>;
  setSideNodeWindow?: React.Dispatch<React.SetStateAction<ObjectNode | null>>;
  sendNumberNodes: () => void;
  docId?: string;
  doc?: PatchDoc;
  isInsideSlot?: boolean;
  onUpdateSize?: (id: string, size: Size) => void;
  scriptingNameToNodes: Record<string, ObjectNode[]>;
  isExamplePatch?: boolean;
  workletCode?: string;
  newSubPatch: (p: Patch, n: ObjectNode) => SubPatch;
  sendWorkerMessage?: (body: MessageBody) => void;
  registerNodes?: (objects: ObjectNode[], messages: MessageNode[]) => void;
  vm?: VM;
  slotsNode?: ObjectNode;
};

export type SubPatch = Patch & {
  parentNode: ObjectNode;
  parentPatch: Patch;
  patchType: OperatorContextType;
  clearState: () => void;
  processMessageForParam: (x: Message) => boolean;
  setupPatchType: (x: string) => void;
  clearPatch: () => void;
};

export interface SerializedOutlet {
  outletNumber?: number;
  connections: SerializedConnection[];
}

export interface SerializedConnection {
  destinationId: string;
  destinationInlet?: number;
  segmentation?: number;
}

export type SerializedObjectNode = Identifiable & {
  text: string;
  script?: string;
  position: Coordinate;
  presentationPosition: Coordinate;
  outlets: SerializedOutlet[];
  subpatch?: SerializedPatch;
  buffer?: number[] | MessageObject[];
  attributes?: Attributes;
  size?: Size;
  operatorContextType: OperatorContextType;
  numberOfOutlets?: number;
  saveData?: any;
  custom?: any;
  slots?: SerializedObjectNode[];
  steps?: GenericStepData[];
};

export type SerializedPatch = Identifiable & {
  presentationMode: boolean;
  objectNodes: SerializedObjectNode[];
  messageNodes?: SerializedMessageNode[];
  name?: string;
  size?: Size;
  isCustomView?: boolean;
  attributes?: Attributes;
  docId?: string;
  doc?: PatchDoc;
  patchType?: OperatorContextType;
};

export type SerializedMessageNode = Identifiable & {
  position: Coordinate;
  presentationPosition: Coordinate;
  outlets: SerializedOutlet[];
  attributes?: Attributes;
  message: Message;
  messageType: MessageType;
};

export enum MessageType {
  Number = 0,
  Message = 1,
  Toggle = 2,
}

export enum Orientation {
  X = 0,
  Y = 1,
  XY = 2,
}

export type IO = "trig" | "velocity" | "control" | "ramp" | "duration";
export type ModuleType = "sequencer" | "generator" | "effect";

export interface SignalOption {
  outlet?: IOlet;
  node: ObjectNode;
  io?: IO;
  moduleType?: ModuleType;
  name?: string;
  signalNumber?: number;
  moduleName?: string;
}
