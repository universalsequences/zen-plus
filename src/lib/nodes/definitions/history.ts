import { doc } from './doc'
import { NodeFunc } from './memo';
import { ObjectNode, Lazy, Message } from '../types';
import { Operator, Statement, CompoundOperator } from './zen/types';
import { zen, s, history, Arg, History, UGen, print } from '@/lib/zen/index';
import ObjectNodeComponent from '@/components/ObjectNodeComponent';

/**
 *              _______________
 *             |               |
 *    input   history          |
 *       |     |               |
 *       |     |               |
 *       o     o               |
 *   ____________________      |
 *  |mix ^     ^     .999|     |
 *  |--------------------|     |
 *    o                        |
 *    |------------------------|
 *    |
 *   output
 *
 *
 * For this to work correctly we need to be able to tell if theres
 * a history downstream from a given node (in this case the  "mix")
 *
 * So in the node function for "mix", we must check if its downstream
 * and if so call that function directly from the node instead of via the graph
 * (which is how it normally would work)
 *
 * And then for every other output that is not a cycle, manually pipe
 * the data to those nodes
 *
 * The history node will have needsLoad so that it will automatically call
 * it
 *
 * The ultimate flow of data should be this:
 *     let hist = history();
 *     let output = mix(input, hist(), .999);
 *     history(output);
 */

doc(
    'history',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "history"
    });

export const zen_history =  (object: ObjectNode) => {
    let h: History;

    // for our AST, there are two cases with history
    // 1. we pipe data into the history
    // 2. we want to retrieve data out of the history to use
    return (x: Message): Statement[] => {
        if (h == undefined) {
            h = history();
        }

        let inputStatement: Statement = x as Statement;
        
        // we need to determine if the statement we are receiving contains
        // THIS history
        let loopedHistory = containsSameHistory(h, inputStatement); 
        if (loopedHistory && Array.isArray(loopedHistory)) {
            let compoundOperator: CompoundOperator = loopedHistory[0] as CompoundOperator 
            let historyInput = compoundOperator.historyInput;
            // we need to determine if it has the history input set correctly
            if (historyInput) {
                // finally check one more layer down..
                let contains = containsSameHistory(h, historyInput);
                if (contains) {
                    let newHistory: Statement = [compoundOperator, historyInput] as Statement;
                    newHistory.node = object;
                
                    // ensure we aren't double adding...?
                    if (!object.patch.historyDependencies.some(x => x.node === object)) {
                        object.patch.historyDependencies = [newHistory, ... object.patch.historyDependencies];
                    }
                    return [];
                } 
            }
        }

        if (x === "bang") {
            // this refers to the initial pass. in this case, we just want to pass the
            // history's value through: i.e. history()
            let statement: Statement = [{ name: "history", history: h}];
            return [statement];
        } else {
            // this refers to when this node receives a statement in the inlet-- we need
            // to place this statement in the dependency array in Patcher (as they will be placed)
            // at the start of the whole program
            let statement: Statement = [{ name: "history", history: h, historyInput: x as Statement }];
            return [statement];
        }
    };
};

const containsSameHistory = (history: History, statement: Statement): Statement | null=> {
    if (Array.isArray(statement)) {
        let [operator, ... statements] = statement;
        if ((operator as CompoundOperator).history === history) {
            return statement;
        }
        for (let statement of statements) {
            let s = containsSameHistory(history, statement as Statement);
            if (s) {
                return s;
            }
        }
        return null;

    }
    if ((statement as CompoundOperator).history === history) {
        return statement;
    }
    return null;
}