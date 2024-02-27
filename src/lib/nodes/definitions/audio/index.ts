import { doc } from './doc';
import { receive, publishPatchSignals, send } from './pubsub';
import { API } from '@/lib/nodes/context';
import { ObjectNode, Message, ConnectionType } from '../../types';

doc(
    'speakers~',
    {
        description: "represents the speakers with outlets per output channel",
        numberOfInlets: 1,
        numberOfOutlets: 0,
        outletType: ConnectionType.AUDIO
    });

export const speakers = (node: ObjectNode) => {
    // when the graph compiles we need to determine how many output channels we have
    // and create outlets for each and map the generated audio worklet to this
    // node.

    // so upon the "compilation" stage of the Patch, we need to search for "speaker~"
    // nodes and wrap this object node with that audio worklet node

    if (typeof node.attributes["channels"] === "number") {
        for (let i = 0; i < node.attributes["channels"]; i++) {
            if (!node.inlets[i]) {
                node.newInlet("channel input" + (i + 1), ConnectionType.AUDIO);
            }
        }
    }

    let numberOfInputs = (node.attributes["channels"] || 1) as number;
    if (node.audioNode && node.audioNode.numberOfInputs !== numberOfInputs) {
        node.audioNode.disconnect();
        node.audioNode = undefined;
    }

    if (!node.audioNode) {
        // need to create an audio node that connects to speakers
        let ctxt = node.patch.audioContext;
        let splitter = ctxt.createChannelMerger((node.attributes["channels"] || 1) as number);
        console.log('merger = ', splitter);
        node.audioNode = splitter; //node.patch.audioContext.destination;
        splitter.connect(ctxt.destination);

    }

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
    "send~": send,
    "receive~": receive,
    "publishPatchSignals": publishPatchSignals
};
