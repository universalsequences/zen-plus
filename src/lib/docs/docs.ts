import { ConnectionType, Attributes, AttributeOptions } from '../nodes/types';
import { GLTypeCheck } from '@/lib/nodes/typechecker';
import { UGen, Arg } from '@/lib/gl/types';

export interface Definition {
    description: string;
    numberOfInlets: string | number | ((x: number) => number);
    numberOfOutlets: string | number | ((x: number) => number);
    inletNames?: string[];
    outletNames?: string[];
    defaultValue?: number | string | number[];
    outletType?: ConnectionType;
    inletType?: ConnectionType;
    name?: string;
    attributeOptions?: AttributeOptions;
    attributes?: Attributes;
    fn?: (...args: Arg[]) => UGen,
    fnString?: string;
    glTypeChecker?: GLTypeCheck
}

export type API = {
    [x: string]: Definition;
};

export const documenter = () => {
    let api: API = {};
    let doc = (name: string, definition: Definition) => {
        if (definition.numberOfOutlets === undefined) {
            definition.numberOfOutlets = 1;
        }
        api[name] = {
            ...definition,
            name
        }
    };

    let lookupDoc = (name: string): Definition | null => {
        return api[name] || null;
    };

    return { lookupDoc, doc, api };
};


