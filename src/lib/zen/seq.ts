import { Context } from './context'
import { CodeBlock } from './simd';
import { CodeFragment } from './emitter';
import { UGen, Arg, genArg, Generated } from './zen';
import { Argument, Function } from './functions';
import { History } from './history';

export const s = (...inputs: Arg[]): UGen => {
    let preContext: Context;
    let lastContext: Context;
    return (context: Context): Generated => {

        let code = ""

        let lastVariable = "";
        let i = 0;
        let histories: string[] = [];
        let outerHistories: string[] = [];
        let outputHistories: string[] = [];
        let functions: Function[] = [];
        let functionArguments: Argument[] = [];
        let codeBlocks: CodeBlock[] = [];
        let params: History[] = [];
        let outputs = 0;

        let initialCodeFragment: CodeFragment | undefined = undefined;
        let outs: Generated[] = [];

        // NOTES on seq:
        //  the issue is that if we encounter some history at the start

        // if any of these things exist as dependencies for another, we delete it

        //for (let i=inputs.length-1; i>=0; i--) {//of inputs) {

        if (!preContext) {
            preContext = context.forceScalar ? context : context === context.baseContext ? context.useContext(false, true) : context;
            //preContext = context.forceScalar ? context : context.useContext(false, true);
        }
        if (!lastContext) {
            lastContext = context.forceScalar ? context : context === context.baseContext ? context.useContext(false, true) : preContext;
            //lastContext = context.forceScalar ? context : context.useContext(false, true);
        }

        // console.log("pre context=", preContext, context);
        // console.log("last context=", lastContext, context);
        for (let i = 0; i < inputs.length; i++) {//of inputs) {
            let input = inputs[i];
            //let _out = (input as UGen)(context); //context.useContext(false, true));
            //context = context.useContext(false, true);
            //let _out = (input as UGen)(context.useContext(false, true));
            let _context = (i < inputs.length - 1 ? preContext : lastContext).useContext(false);
            //console.log('calling seq[%s] w context', i, _context);
            let _out = _context.gen(input as UGen);
            //console.log('called seq[%s] w context', i, _context, _out);
            if (i === inputs.length - 1) {
                lastVariable = _out.variable as string;
            }
            outs.push(_out);
        }
        //outs.reverse();

        // i think at the end of the day the issue is that its wrong to think of sequence operators
        // as items being dependent on each other
        // instead it should just string them into several codeFragments and then when we turn this list of frags into 
        // into blocks we simply paste them infront of matching contexts (like OG seq which is how it was implemented)
        // 

        let codeFragments: CodeFragment[] = [];

        for (let j = outs.length - 1; j >= 0; j--) {
            let input = inputs[j];
            let a = new Date().getTime();
            if (typeof input !== "function") {
                continue;
            }
            let _out = outs[j]; //(input as UGen)(context.useContext(context.isSIMD));
            //let _out = (input as UGen)(context.useContext(context.isSIMD));
            if (_out.codeFragments) {
                codeFragments.push(..._out.codeFragments);
            }
            params = [...params, ..._out.params];
            code += ' ' + _out.code + ';';
            //lastVariable = _out.variable!;
            //context.emitVariable(lastVariable);
            i++;
            if (_out.histories) {
                histories = [
                    ...histories,
                    ..._out.histories
                ];
            }
            if (_out.codeBlocks) {
                codeBlocks = [
                    ...codeBlocks,
                    ..._out.codeBlocks
                ];
            }
            if (_out.outerHistories) {
                outerHistories = [
                    ...outerHistories,
                    ..._out.outerHistories
                ];
            }

            if (_out.outputHistories) {
                outputHistories = [
                    ...outputHistories,
                    ..._out.outputHistories
                ];
            }
            if (_out.functions) {
                functions = Array.from(new Set([
                    ...functions,
                    ..._out.functions
                ]));
            }
            if (_out.functionArguments) {
                functionArguments = [
                    ...functionArguments,
                    ..._out.functionArguments
                ];
            }
            let b = new Date().getTime();
            if (_out.outputs! > outputs) {
                outputs = _out.outputs!;
            }
        }



        let x = {
            functions,
            functionArguments,
            codeFragments: [...codeFragments], //pruneDependencies(codeFragments),
            outputs,
            params,
            outputHistories,
            code,
            variable: lastVariable,
            histories,
            outerHistories,
            codeBlocks
        };
        //console.log("Sequence returned=", codeFragments, inputs, context);
        return x;
    }
}


const pruneDependencies = (codeFragments: CodeFragment[]): CodeFragment[] => {
    let pruned: CodeFragment[] = [];

    for (let frag of codeFragments) {
        let exists = false;
        // if frag exists in some other fragment's dependencies, then we need to 
        for (let _frag of codeFragments) {
            if (frag === _frag) continue;
            if (containsDependency(_frag, frag)) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            pruned.push(frag);
        }
    }
    return pruned;
}

const containsDependency = (a: CodeFragment, b: CodeFragment): boolean => {
    if (a.dependencies.includes(b)) {
        return true;
    }
    return (a.dependencies.some(x => containsDependency(x, b)));
}
