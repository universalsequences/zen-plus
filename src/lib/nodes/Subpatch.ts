import { Statement } from './definitions/zen/types';
import { OperatorContextType } from './context';
import { PatchImpl } from './Patch';
import { ObjectNode, Message, Patch, SubPatch } from './types';
import ObjectNodeImpl from './ObjectNode';


/**
 * The way sub-patches work is there is an ObjectNode that defines a subpatch object
 * which then instantiates this class for that node-- passing itself and the parent patcher
 * whenever that parent node gets a message it looks for objects inside this patch called "in 1/2/3" 
 * depending on the inlet received on, and sends it to there
 * this patch will work just as the other patch, and end at an "out 1" which will trigger
 * a compile() call, which we will simply pass out the outlet of the parent node 
 */
export default class Subpatch extends PatchImpl implements SubPatch {

    parentPatch: Patch;
    parentNode: ObjectNode;

    constructor(parentPatch: Patch, parentNode: ObjectNode, clean?: boolean) {
        super();
        this.parentPatch = parentPatch;
        this.parentNode = parentNode;
        this._setupInitialNodes();
        this.parentNode.newAttribute("Custom Presentation", false);
    }

    _setupInitialNodes() {
        const ZEN = OperatorContextType.ZEN;
        let in1 = new ObjectNodeImpl(this);
        in1.parse("in 1", ZEN, false);
        let in2 = new ObjectNodeImpl(this);
        in2.parse("in 2", ZEN, false);

        let out1 = new ObjectNodeImpl(this);
        out1.parse("out 1", ZEN, false);

        let plus = new ObjectNodeImpl(this);
        plus.parse("+", ZEN, false);

        in1.connect(plus, plus.inlets[0], in1.outlets[0], false);
        in2.connect(plus, plus.inlets[1], in2.outlets[0], false);
        plus.connect(out1, out1.inlets[0], plus.outlets[0], false);

        in1.position = { x: 100, y: 100 };
        in2.position = { x: 200, y: 100 };
        plus.position = { x: 150, y: 200 };
        out1.position = { x: 150, y: 300 };

        this.objectNodes = [in1, in2, plus, out1];
    }

    recompileGraph(force?: boolean): void {
        if (force) {
            super.recompileGraph()
        } else {
            this.parentPatch.recompileGraph();
        }
    }

    compile(statement: Statement, outputNumber: number) {
        // this will get called for any outs that get called...
        // this should look at the node 
        this.parentNode.send(this.parentNode.outlets[outputNumber - 1], statement);
    }

    processMessageForParam(message: Message) {
        if (typeof message === "string") {
            let tokens = message.split(" ").filter(x => x.length > 0);
            let paramName = tokens[0];
            let paramValue: number = parseFloat(tokens[1]);
            if (isNaN(paramValue)) {
                return false;
            }

            // look for parameters in this patch
            let nodes = this.getAllNodes().filter(x => x.name === "param");
            let params = nodes.filter(x => x.arguments[0] === paramName);
            params.forEach(x => x.receive(x.inlets[0], paramValue));
        }
        return false;
    }

    clearState() {
        // re-parse every node so that we "start from scratch"
        for (let node of this.objectNodes) {
            node.inlets.forEach(
                n => {
                    n.lastMessage = undefined;
                });
            node.parse(node.text, OperatorContextType.ZEN, false);
        }
    }

    newHistoryDependency(newHistory: Statement, object: ObjectNode) {
        this.parentPatch.newHistoryDependency(newHistory, object);
    }
}
