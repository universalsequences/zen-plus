import type { ConnectionType, Attributes, AttributeOptions } from "../nodes/types";
import type { File } from "@/lib/files/types";
import type { GLTypeCheck } from "@/lib/nodes/typechecker";
import type { UGen, Arg } from "@/lib/gl/types";

export enum NumberOfInlets {
  Outlets = 7777,
  OutletsPlusOne = 8888,
}

// operations are keyed by their operation name -> arguments
// in practice they are strings that are parsed by the operation function
// the definition is shown in the docs for the API

interface OperationDefinition {
  description: string;
  arguments: string[];
  isRepeated?: string;
}
type Operations = {
  [operationName: string]: OperationDefinition;
};

// the definition schema for each documented operator
export interface Definition {
  description: string;
  numberOfInlets: NumberOfInlets | string | number | ((x: number) => number);
  numberOfOutlets: string | number | ((x: number) => number);
  inletNames?: string[];
  aliases?: string[];
  alias?: string;
  outletNames?: string[];
  defaultValue?: number | string | number[];
  outletType?: ConnectionType;
  inletType?: ConnectionType;
  name?: string;
  attributeOptions?: AttributeOptions;
  attributes?: Attributes;
  fn?: (...args: Arg[]) => UGen;
  fnString?: string;
  glTypeChecker?: GLTypeCheck;
  isHot?: boolean;
  file?: File;
  operations?: Operations;
  examplePatch?: string;
}

export type API = {
  [x: string]: Definition;
};

export const documenter = () => {
  const api: API = {};
  const doc = (name: string, definition: Definition) => {
    if (definition.numberOfOutlets === undefined) {
      definition.numberOfOutlets = 1;
    }
    if (definition.isHot === undefined) {
      definition.isHot = true;
    }
    api[name] = {
      ...definition,
      name,
    };
    if (definition.aliases) {
      for (const alias of definition.aliases) {
        api[alias] = {
          ...definition,
          name,
          alias,
        };
      }
    }
  };

  const lookupDoc = (name: string): Definition | null => {
    return api[name] || null;
  };

  return { lookupDoc, doc, api };
};
