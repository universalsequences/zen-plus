import { doc } from './doc';
import { API } from '@/lib/nodes/context';
import { ObjectNode, Message, ConnectionType } from '../../types';

doc(
    'speakers~',
    {
        description: "represents the speakers with outlets per output channel",
        numberOfInlets: 0,
        numberOfOutlets: 2,
        outletType: ConnectionType.AUDIO
    });

export const speakers = (node: ObjectNode) => {
    // when the graph compiles we need to determine how many output channels we have
    // and create outlets for each and map the generated audio worklet to this
    // node.

    // so upon the "compilation" stage of the Patch, we need to search for "speaker~"
    // nodes and wrap this object node with that audio worklet node

    return (_message: Message) => [];
};

doc(
    'number~',
    {
        description: "display audiorate numbers",
        numberOfInlets: 1,
        numberOfOutlets: 0,
        inletType: ConnectionType.AUDIO
    });

export const number_tilde = (node: ObjectNode) => {
    // setup the visualizer worklet and hook it up to this node
    createWorklet(node, '/VisualizerWorklet.js', 'visualizer-processor');
    return (_message: Message) => [];
};

doc(
    'scope~',
    {
        description: "draws a scope for the incoming audio",
        numberOfInlets: 1,
        numberOfOutlets: 0,
        inletType: ConnectionType.AUDIO
    });

export const scope_tilde = (node: ObjectNode) => {
    // setup the visualizer worklet and hook it up to this node
    createWorklet(node, '/VisualizerWorklet.js', 'visualizer-processor');
    return (_message: Message) => [];
};

let init: any = {};
const createWorklet = async (node: ObjectNode, path: string, processor: string) => {
    let audioContext = node.patch.audioContext;
    if (!init[processor]) {
        await audioContext.audioWorklet.addModule(path);
        init[processor] = true;
    }
    node.audioNode = new AudioWorkletNode(audioContext, processor);
};


export const api: API = {
    "speakers~": speakers,
    "number~": number_tilde,
    "scope~": scope_tilde,
};
