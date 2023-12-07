import { ConnectionType, NodeFunction } from './types';
import * as zen_docs from '@/lib/nodes/definitions/zen/doc';
import * as zen_api from '@/lib/nodes/definitions/zen/index';
import * as audio_docs from '@/lib/nodes/definitions/audio/doc';
import * as audio_api from '@/lib/nodes/definitions/audio/index';
import * as core_docs from '@/lib/nodes/definitions/core/doc';
import * as core_api from '@/lib/nodes/definitions/core/index';
import * as docs from '@/lib/docs/docs';

export type API = {
    [x: string]: NodeFunction;
}

export enum OperatorContextType {
    ZEN,
    AUDIO,
    CORE
}

export const getAllAPIs = (): API[] => {
    let zen = getOperatorContext(OperatorContextType.ZEN);
    let audio = getOperatorContext(OperatorContextType.AUDIO);
    let core = getOperatorContext(OperatorContextType.CORE);
    return [zen.api, audio.api, core.api];
};

export const getAllDefinitions = (): docs.API[] => {
    let zen = getOperatorContext(OperatorContextType.ZEN);
    let audio = getOperatorContext(OperatorContextType.AUDIO);
    let core = getOperatorContext(OperatorContextType.CORE);
    return [zen.definitions, audio.definitions, core.definitions];
};

export const getAllContexts = (): OperatorContext[] => {
    let zen = getOperatorContext(OperatorContextType.ZEN);
    let audio = getOperatorContext(OperatorContextType.AUDIO);
    let core = getOperatorContext(OperatorContextType.CORE);
    let contexts = [zen, audio, core];
    return contexts;
};

export interface OperatorContext {
    type: OperatorContextType;
    lookupDoc: (name: string) => docs.Definition | null;
    definitions: docs.API,
    api: API;
}

export const getContextName = (type?: OperatorContextType): string | null => {
    if (type === OperatorContextType.ZEN) {
        return "zen";
    } else if (type === OperatorContextType.AUDIO) {
        return "audio";
    } else if (type === OperatorContextType.CORE) {
        return "core";
    } else {
        return null;
    }
};

export const getOperatorContext = (type: OperatorContextType): OperatorContext => {
    if (type === OperatorContextType.ZEN) {
        return {
            type,
            definitions: zen_docs.api,
            lookupDoc: zen_docs.lookupDoc,
            api: zen_api.api
        };
    } else if (type === OperatorContextType.AUDIO) {
        return {
            type,
            definitions: audio_docs.api,
            lookupDoc: audio_docs.lookupDoc,
            api: audio_api.api
        };
    } else {
        return {
            type,
            definitions: core_docs.api,
            lookupDoc: core_docs.lookupDoc,
            api: core_api.api
        };
    }
};
