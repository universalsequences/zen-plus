import {
  type SerializedOutlet,
  type AttributeCallbacks,
  type Coordinate,
  type AttributeOptions,
  type AttributeValue,
  type Patch,
  type IOConnection,
  ConnectionType,
  type SerializedConnection,
  type IOlet,
  type Message,
  type ObjectNode,
  type Node,
  type Attributes,
  SubPatch,
  MessageNode,
} from "./types";
import { OperatorContextType, isCompiledType } from "./context";
import { v4 as uuidv4 } from "uuid";
import { uuid } from "@/lib/uuid/IDGenerator";
import { compileVM } from "./vm/forwardpass";
import { getRootPatch } from "./traverse";
