import { Generated, Arg, UGen, genArg } from "./zen";
import { uuid } from "./uuid";
import { getParentContexts } from "./memo";
import { determineBlocks } from "./blocks/analyze";
import { printBlock, printInbound } from "./blocks/printBlock";
import { simdMemo, getHistoriesBeingWrittenTo } from "./memo-simd";
import { memo } from "./memo";
import { replaceAll } from "./replaceAll";
import { prettyPrint } from "./worklet";
import { LoopContext, Context } from "./context";
import { Target } from "./targets";

export interface Range {
  min: Arg;
  max: Arg;
}

/**
 * The most common gen loop pattern is looping through a body
 * and summing the result of each iteration.
 *
 * Example "sum" loop:
 * let summedRandoms = sumLoop(range(0, 4), (i) => mult(random(), i))
 * The way loops works is it should sum the result of the body
 *
 * Notes on gen's limitations: Gen has the limitation that when using
 * something like "accum" which stores state, it cant be used in a for-loop
 * or else it's memory will be over-written.
 *
 * Maybe theres a way to allocate memory dynamically for each iteration of the
 * loop (if we know the range before hand...)
 *
 * If we create a new type of context that tells the accum that its in a loop
 * it will create
 */
export type LoopBody = (i: UGen) => UGen;

export const sumLoop = (range: Range, body: LoopBody): UGen => {
  let id = uuid();
  let memoized: Generated | undefined;
  return (context: Context): Generated => {
    if (memoized) {
      console.log("RETURNING MEMOIZED LOOP", memoized);
      return memoized;
    }
    console.log("SUM LOOP WITH CONTEXT=", context);
    let [i, sum] = context.useCachedVariables(id, "i", "sum");

    context = context.useContext(false, true);
    let loopContext =
      typeof range.min === "number" && typeof range.max === "number"
        ? new LoopContext(i, range, context)
        : context;

    loopContext.forceScalar = true;
    (loopContext as LoopContext).isLoop = true;

    const _min = context.gen(range.min);
    const _max = context.gen(range.max);
    const _variable = variable(i);

    const _body = body(_variable)(loopContext);
    console.log("fragments=", _body.codeFragments);

    const blocks = determineBlocks(..._body.codeFragments);
    const blockWeWant = blocks.find((x) => x.context === loopContext);

    let histories = Array.from(new Set(_body.histories));
    histories = histories.map(
      (x) => replaceAll(x, "let", context.varKeyword) + ";",
    );
    let outerHistories = Array.from(new Set(_body.outerHistories));
    outerHistories = outerHistories.map(
      (x) => replaceAll(x, "let", context.varKeyword) + ";",
    );

    // need to generate all "inbound dependencies"
    console.log("block we want=", blockWeWant, blocks, _body);
    let out = `
// loop ${context.id}
${context.varKeyword} ${sum} = 0;
for (${context.intKeyword} ${i}=${_min.variable}; ${i} < ${_max.variable}; ${i}++ ) {
${prettyPrint("    ", blockWeWant!.code)}
${sum} += ${blockWeWant!.codeFragment.variable};
    }
`;

    console.log("LOOP OUT context.id=%s", context.id, out);
    const generated = context.emit(out, sum);

    let parents = getParentContexts(context);
    console.log("parent contexts =", Array.from(parents), context);
    // the trick is to put the other blocks inside there
    const deps = blocks
      .map((x) => x.codeFragment)
      .filter((x) => (x.context as LoopContext).loopSize === undefined);
    //.filter(x => !parents.has(x.context));

    const loopDeps = deps.filter(
      (x) => (x.context as LoopContext).loopSize && x.context !== loopContext,
    );
    const withParents = deps.filter((x) => parents.has(x.context));

    console.log("deps = ", deps);
    console.log("with parents=", withParents);

    if (withParents.length > 0) {
      const c = withParents[0].context;
      if (c.baseContext === c || c.context === c.baseContext) {
        context = withParents[0].context;
        console.log("FOUND WITH PARENT", context);
      }
    }

    const historiesWritten = getHistoriesBeingWrittenTo(context);
    const withHistories = deps.filter((x) =>
      x.histories.some((x) => historiesWritten.has(x)),
    );

    generated.context = context;
    generated.codeFragments[0].context = context;

    console.log("placing depenencies for contet.id=%s", context.id, deps);
    generated.codeFragments[0].dependencies = deps;

    if (!(loopContext as LoopContext).inboundDependencies) {
      (loopContext as LoopContext).inboundDependencies = [];
    }
    if ((loopContext as LoopContext).inboundDependencies) {
      const allInbounds = blocks.flatMap((x) =>
        Array.from(x.inboundDependencies),
      );
      (loopContext as LoopContext).inboundDependencies?.push(...allInbounds);
      context.inboundDependencies = (
        loopContext as LoopContext
      ).inboundDependencies;
    }

    memoized = generated;
    console.log("returning generated=", memoized);
    return generated;
  };
};

export const rawSumLoop = (range: Range, body: UGen, i: string): UGen => {
  return memo((context: Context): Generated => {
    let [sum] = context.useVariables("sum");
    let loopContext =
      typeof range.min === "number" && typeof range.max === "number"
        ? new LoopContext(i, range, context)
        : context;

    let _min = context.gen(range.min);
    let _max = context.gen(range.max);
    //let _variable = variable(i);

    let _body = body(loopContext);
    let histories = Array.from(new Set(_body.histories));
    histories = histories.map(
      (x) => replaceAll(x, "let", context.varKeyword) + ";",
    );
    let outerHistories = Array.from(new Set(_body.outerHistories)).filter(
      (x) => !context.historiesEmitted.has(x),
    );
    outerHistories.forEach((h) => context.historiesEmitted.add(h));
    //context.historiesEmitted = [...context.historiesEmitted, ...outerHistories];
    outerHistories = outerHistories.map(
      (x) => replaceAll(x, "let", context.varKeyword) + ";",
    );

    let out = `
${prettyPrint("    ", outerHistories.join(""))}
${context.varKeyword} ${sum} = 0;
for (${context.intKeyword} ${i}=${_min.variable}; ${i} <${_max.variable}; ${i} ++ ) {
${prettyPrint("    ", histories.join(""))}
${prettyPrint("    ", _body.code || "")}
    ${sum} += ${_body.variable};
}
`;

    let g: Generated = context.emit(out, sum);
    return g;
  });
};

export const variable = (value: string): UGen => {
  return (context: Context): Generated => {
    let [_var] = context.useVariables("loopIdx");
    let intKeyword = (context as LoopContext).context
      ? (context as LoopContext).context.intKeyword
      : context.intKeyword;
    let out = `${intKeyword} ${_var} = ${value}; `;
    let generated: Generated = context.emit(out, _var);
    generated.isLoopDependent = true;
    return generated;
  };
};
