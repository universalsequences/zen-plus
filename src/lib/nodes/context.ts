import { ConnectionType, NodeFunction } from './types';
import * as zen_docs from '@/lib/nodes/definitions/zen/doc';
import * as zen_api from '@/lib/nodes/definitions/zen/index';
import * as audio_docs from '@/lib/nodes/definitions/audio/doc';
import * as audio_api from '@/lib/nodes/definitions/audio/index';
import * as core_docs from '@/lib/nodes/definitions/core/doc';
import * as core_api from '@/lib/nodes/definitions/core/index';
import * as gpu_docs from '@/lib/nodes/definitions/webgpu/doc';
import * as gpu_api from '@/lib/nodes/definitions/webgpu/index';

import * as svg_docs from '@/lib/nodes/definitions/svg/doc';
import * as svg_api from '@/lib/nodes/definitions/svg/index';

import * as docs from '@/lib/docs/docs';

export type API = {
    [x: string]: NodeFunction;
}

export enum OperatorContextType {
    ZEN,
    AUDIO,
    CORE,
    WEBGPU,
    SVG
}

export const getAllAPIs = (): API[] => {
    let zen = getOperatorContext(OperatorContextType.ZEN);
    let audio = getOperatorContext(OperatorContextType.AUDIO);
    let core = getOperatorContext(OperatorContextType.CORE);
    let gpu = getOperatorContext(OperatorContextType.WEBGPU);
    let svg = getOperatorContext(OperatorContextType.SVG);
    return [zen.api, audio.api, core.api, gpu.api, svg.api];
};

export const getAllDefinitions = (): docs.API[] => {
    let zen = getOperatorContext(OperatorContextType.ZEN);
    let audio = getOperatorContext(OperatorContextType.AUDIO);
    let core = getOperatorContext(OperatorContextType.CORE);
    let gpu = getOperatorContext(OperatorContextType.WEBGPU);
    let svg = getOperatorContext(OperatorContextType.SVG);
    return [zen.definitions, audio.definitions, core.definitions, gpu.definitions, svg.definitions];
};

export const getAllContexts = (): OperatorContext[] => {
    let zen = getOperatorContext(OperatorContextType.ZEN);
    let audio = getOperatorContext(OperatorContextType.AUDIO);
    let core = getOperatorContext(OperatorContextType.CORE);
    let gpu = getOperatorContext(OperatorContextType.WEBGPU);
    let svg = getOperatorContext(OperatorContextType.SVG);
    let contexts = [zen, audio, core, gpu, svg];
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
    } else if (type === OperatorContextType.WEBGPU) {
        return "webgpu";
    } else if (type === OperatorContextType.SVG) {
        return "svg";
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
    } else if (type === OperatorContextType.WEBGPU) {
        return {
            type,
            definitions: gpu_docs.api,
            lookupDoc: gpu_docs.lookupDoc,
            api: gpu_api.api
        };
    } else if (type === OperatorContextType.SVG) {
        return {
            type,
            definitions: svg_docs.api,
            lookupDoc: svg_docs.lookupDoc,
            api: svg_api.api
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
