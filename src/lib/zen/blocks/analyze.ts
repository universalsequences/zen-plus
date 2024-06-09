/**
 * the first pass of the compiler creates CodeFragments which form 
 * an AST (abtract syntax tree) for the code.
 * Each CodeFragment contains a "context" object which is essentially
 * the "code block" that it comes from
 * 
 * the end "code" that we need is a series of "blocks", with
 * any variables that should be shared between blocks, being communicated
 * via global arrays
 */

import { deepestContext } from "../memo";
import { condMessage, Context } from "../index";
import { CodeFragment } from "../emitter";

export interface CodeBlock {
    code: string;
    codes: string[];
    context: Context;
    codeFragment: CodeFragment;
    outboundDependencies: Set<string>;
    inboundDependencies: Set<string>;
    fullInboundDependencies: Set<string>;
    histories: string[];
    variablesEmitted: Set<string>,
    outputs: number[]
}

const calc = (...fragments: CodeFragment[]) => {
    //fragments = [...fragments].reverse();
    let visited: Set<CodeFragment> = new Set<CodeFragment>();
    // might need to reverse
    let blocks: CodeBlock[] = [];
    let allBlocks: CodeBlock[] = [];
    let i = 0;
    for (let fragment of fragments) {
        blocks = _determineBlocks(fragment, allBlocks, blocks, visited);
        let j = 0;
        for (let block of blocks) {
            if (block.code) {
                block.codes.push(block.code);
                block.code = "";
            }
        }
    }

    for (let b of blocks) {
        let codes = [...b.codes];
        b.code = codes.join("\n");
    }

    let _blocks: CodeBlock[] = [];
    for (let tries = 0; tries < 1000; tries++) {
        for (let i = 0; i < blocks.length; i++) {
            let { outboundDependencies, fullInboundDependencies } = blocks[i];
            let inb = new Set<string>();
            fullInboundDependencies.forEach(inbound => {
                if (!blocks[i].histories.includes(inbound)) {
                    inb.add(inbound);
                }
            });
            fullInboundDependencies = inb;
            if (!_blocks.includes(blocks[i]) && (fullInboundDependencies.size === 0 || Array.from(fullInboundDependencies).every(x =>
                _blocks.some(y => y.outboundDependencies.has(x))))) {
                if (_blocks.some(x => Array.from(blocks[i].outboundDependencies).some(y => x.outboundDependencies.has(y)))) {
                } else {
                    _blocks.push(blocks[i]);
                }
            }
        }

    }

    return { blocks, _blocks };
}

const replaceContexts = (fragment: CodeFragment, contextsToReplace: Context[], context: Context) => {
    if (contextsToReplace.includes(fragment.context)) {
        fragment.context = context;
    }

    fragment.dependencies.forEach(
        dep => replaceContexts(dep, contextsToReplace, context)
    );
}

export const determineBlocks = (...fragments: CodeFragment[]): CodeBlock[] => {
    let { blocks, _blocks } = calc(...fragments);

    /*
    let missing = blocks.filter(x => !_blocks.includes(x));

    // see all the missing SIMD and SCALAR contexts and find the deepest of each type
    // replace each context with the deepest and re-run this function... this caveman approach might work?

    let missingSIMD: Context[] = missing.filter(x => x.context.isSIMD).map(x => x.context) as Context[];
    let missingScalar = missing.filter(x => !x.context.isSIMD).map(x => x.context);

    let deepestSIMDMissing = deepestContext(missingSIMD) as Context;
    let deepestScalarMissing = deepestContext(missingScalar) as Context;



    fragments.forEach(f => replaceContexts(f, missingSIMD, deepestSIMDMissing));
    fragments.forEach(f => replaceContexts(f, missingScalar, deepestScalarMissing));

    let ret = calc(... fragments);
    blocks = ret.blocks;
    _blocks = ret._blocks;
    */

    let missing = blocks.filter(x => !_blocks.includes(x));

    /*
    for (let m of missing) {
        m.fullInboundDependencies.forEach(
            d => {
                if (!_blocks.some(x => x.outboundDependencies.has(d))) {
                    console.log("BLOCK missing", d, m);
                }
            });
    }


    console.log("blocks=", _blocks);
    */
    // retain the 
    return _blocks;
}

const _determineBlocks = (fragment: CodeFragment, allBlocks: CodeBlock[], blocks: CodeBlock[], visited: Set<CodeFragment>): CodeBlock[] => {
    //let allBlocks : CodeBlock[] = [];
    // we traverse the AST and as we find new contexts we find out any code blocks that exist and add to them

    // adding blocks needs to be breadth first search in order to maintain the correct dependency orders
    const traverse = (fragment: CodeFragment, outboundDependency?: string) => {
        let fragmentContext = fragment.context;
        let matchingBlock = allBlocks.find(x => x.context === fragmentContext);
        let needsAdd = false;
        if (!matchingBlock) {
            // we haven't created a block for this context yet, so we initialize
            let block: CodeBlock = {
                code: "",
                codes: [],
                outputs: [],
                codeFragment: fragment,
                variablesEmitted: new Set<string>(),
                histories: [],
                context: fragmentContext,
                outboundDependencies: new Set(),
                inboundDependencies: new Set(),
                fullInboundDependencies: new Set(),
            }

            // TODO: WE SHOULD ADD TO END OF BLOCKS ONLY IF ALL DEPENDENCIES HAVE BEEN MET
            // OTHERWISE WE ADD TO SOME SORT OF QUEUE THAT WE CONSTANTLY CHECK TO SEE IF DEPENDENCIES HAVE BEEN MET
            needsAdd = true;
            matchingBlock = block;
            allBlocks.push(matchingBlock);

            blocks = [matchingBlock, ...blocks];

            // since we haven't seen this context yet, whatever called this "traverse" requires
            // the variable for this fragment. they depend on this fragment, so it
            // is placed as an outbound dependency
            if (!block.outboundDependencies.has(fragment.variable)) {
                block.outboundDependencies.add(fragment.variable!);
            }
        }

        if (fragment.variable.includes("input_var")) {
            matchingBlock.outboundDependencies.add(fragment.variable!);
        }

        if (outboundDependency && !matchingBlock.outboundDependencies.has(outboundDependency)) {
            matchingBlock.outboundDependencies.add(outboundDependency);
        }

        // keep track of all histories in per block (so we can correctly write them into the code)
        for (let hist of fragment.histories) {
            if (!matchingBlock.histories.includes(hist)) {
                matchingBlock.histories.push(hist);
            }
        }

        // check if any other blocks contain an "inbound dependency" of this fragments variable
        // if so, then we need to add this variable as as "outbound dependency" for this block
        if (allBlocks.filter(x => x !== matchingBlock).some(
            block => block.inboundDependencies.has(fragment.variable))) {
            if (!matchingBlock.outboundDependencies.has(fragment.variable)) {
                matchingBlock.outboundDependencies.add(fragment.variable!);
            }
        }

        if (!visited.has(fragment)) {
            visited.add(fragment);
            // recursively iterate through the dependencies for this fragment
            fragment.dependencies.forEach(dep => {
                // if we are about to context-switch, then we need to add an inbound dependency here
                let outboundDependency: string | undefined = undefined;
                if (getContext(dep.context) !== fragmentContext) {
                    if (!matchingBlock!.inboundDependencies.has(dep.variable)) {
                        matchingBlock!.inboundDependencies.add(dep.variable);
                    }
                }
                if (getContext(dep.context) !== fragmentContext) {
                    if (!matchingBlock!.fullInboundDependencies.has(dep.variable)) {
                        matchingBlock!.fullInboundDependencies.add(dep.variable);
                    }
                }

                // if we are about to context-switch we need to add an outbound dep.
                if (getContext(dep.context) !== fragmentContext) { // && fragment.context.isSIMD) {
                    outboundDependency = dep.variable;
                }
                traverse(dep, outboundDependency);
            });

            if (needsAdd) {

                //blocks = [...blocks, matchingBlock];
            }
        } else {
        }

        if (fragment.output !== undefined && !matchingBlock.outputs.includes(fragment.output)) {
            matchingBlock.outputs.push(fragment.output);
        }

        // we concatenate the "code" for this fragment, into the growing block code
        if (!matchingBlock.variablesEmitted.has(fragment.variable)) {
            let prefix = "";
            if (!matchingBlock.code.includes("/n") && !fragment.code.includes("/n")) {
                if (matchingBlock.code !== "") {
                    prefix = "\n";
                }
            }
            matchingBlock.code = matchingBlock.code + prefix + fragment.code;
            matchingBlock.variablesEmitted.add(fragment.variable);
        } else {
            //fragment.dependencies.forEach(dep => {
            //});
        }

    }

    traverse(fragment);

    return blocks;
}


const getContext = (context: Context) => context; //context.transformIntoContext || context;
