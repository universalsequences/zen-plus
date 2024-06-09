import { ConnectionType, Attributes, AttributeOptions } from '../nodes/types';
import { File } from '@/lib/files/types';
import { GLTypeCheck } from '@/lib/nodes/typechecker';
import { UGen, Arg } from '@/lib/gl/types';

export enum NumberOfInlets {
    Outlets = 7777
}
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
    fn?: (...args: Arg[]) => UGen,
    fnString?: string;
    glTypeChecker?: GLTypeCheck
    isHot?: boolean,
    file?: File;
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
        if (definition.isHot === undefined) {
            definition.isHot = true;
        }
        api[name] = {
            ...definition,
            name
        }
        if (definition.aliases) {
            for (let alias of definition.aliases) {
                api[alias] = {
                    ...definition,
                    name,
                    alias
                };
            }
        }
    };

    let lookupDoc = (name: string): Definition | null => {
        return api[name] || null;
    };

    return { lookupDoc, doc, api };
};


