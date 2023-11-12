import { Patch, PatchType, ObjectNode, MessageNode, Message } from './types';
import { ZenWorklet, initMemory } from '@/lib/zen/worklet';
import { input, ZenGraph } from '@/lib/zen/zen'
import { s, zen, createWorklet, UGen } from '@/lib/zen/index';
import { v4 as uuidv4 } from 'uuid';
import { Operator, Statement } from './definitions/zen/types';
import { compileStatement } from './definitions/zen/AST';
import { Alegreya_Sans } from 'next/font/google';

interface GraphContext {
    graph: ZenGraph;
    workletNode: AudioWorkletNode;
}

export class PatchImpl implements Patch {

    type: PatchType;
    id: string;
    objectNodes: ObjectNode[];
    messageNodes: MessageNode[];
    audioContext: AudioContext;
    audioNode?: AudioNode;
    worklets: GraphContext[];
    counter: number;
    historyDependencies: Statement[];
    waiting: boolean;
    storedStatement?: Statement;

    constructor() {
        this.id = uuidv4();
        this.historyDependencies = [];
        this.counter = 0;
        this.type = PatchType.Zen;
        this.objectNodes = [];
        this.messageNodes = [];
        this.audioContext = new AudioContext();
        this.worklets = [];
        this.waiting= false;
        this.storedStatement = undefined;
    }

    recompileGraph() {
        this.disconnectGraph();
        this.storedStatement = undefined;
        this.historyDependencies = [];
        this.waiting = true;
        // re-parse every node so that we "start from scratch"
        for (let node of this.objectNodes) {
            node.inlets.forEach(
                n => {
                    n.lastMessage = undefined;
                });
            node.parse(node.text, false);
        }
        
        let sourceNodes = this.objectNodes.filter(node => node.inlets.length === 0 && node.name !== "history");
        sourceNodes.forEach(
            sourceNode => {
                if (sourceNode.fn) {
                    let ret: Message[] = sourceNode.fn("bang");
                    for (let i = 0; i < ret.length; i++) {
                            if (sourceNode.outlets[i]) {
                            sourceNode.send(sourceNode.outlets[i], ret[i]);
                        }
                    }
                }
            });

        this.waiting = false;

        sourceNodes = this.objectNodes.filter(node => node.name === "history");
            sourceNodes.forEach(
                sourceNode => {
                    if (sourceNode.fn) {
                        sourceNode.receive(sourceNode.inlets[0], "bang");
                    }
                });
        
        if (this.storedStatement) {
            this.compile(this.storedStatement);
        }
    
    }

    disconnectGraph() {
        this.worklets.forEach(({ workletNode, graph }) => {
            workletNode.port.postMessage({
                type: "dispose"
            });
            workletNode.disconnect();
            graph.context.disposed = true;
        });
        this.worklets.length = 0;
    }
    compile(statement: Statement) {
        if (this.waiting) {
            this.storedStatement = statement;
            return;
        }
            this.storedStatement = undefined;
        this.counter++;
        let id = this.counter;
        setTimeout(() => {
            if (id !== this.counter) {
                return
            }
            console.log('statements to compile=', statement)
            if (this.historyDependencies.length > 0) {
                statement = ["s" as Operator, ... this.historyDependencies, statement ]
                console.log("now with histories tacked on=", statement);
            }
            let ast = compileStatement(statement);
            
            this.disconnectGraph();

            let zenGraph: ZenGraph = Array.isArray(ast) ? zen(...ast) : zen(ast as UGen);

            createWorklet(
                this.audioContext,
                zenGraph,
                'zen' + id)
                .then(
                    (ret) => {
                        ret = ret as ZenWorklet;
                        this.audioNode = ret.workletNode;
                        this.worklets.push({ workletNode: ret.workletNode, graph: zenGraph });
                        ret.workletNode.connect(this.audioContext.destination);
                    })
                .catch(e => {
                    console.log('error');
                });
        }, 250);
    }
}
