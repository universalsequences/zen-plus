import { Arg, Context, UGen, Generated, output } from "./index";
import { getDownstreamHistories, determineMemoization } from "./memo-helpers";
import { latch } from "./latch";
import { getHistoriesBeingWrittenTo, getContextWithHistory } from "./memo-simd";
import { MemoryBlock } from "./block";
import { cKeywords } from "./math";
import { Target } from "./targets";
import { memo, simdMemo, mergeMemoized } from "./memo";
import { LoopContext, SIMDContext } from "./context";
import { uuid } from "./uuid";
import { countOutputs } from "./zen";
import { CodeFragment, printCodeFragments } from "./emitter";

//export type FunctionBody = (i: UGen, ...args: UGen[]) => UGen;

/**
 *
 * Creates a function and adds it to the context
 * The returned type is LazyFunction and when evaluated for the first
 * time by an envocation (a call of the function), it will append
 * the function to the context
 *
 * The body needs to be generated
 */

export type Function = {
  name: string;
  size: number;
} & Generated;

export type LazyFunction = (context: Context, forceScalar: boolean) => Function;

export const defun = (
  name: string,
  size: number,
  ...bodies: UGen[]
): LazyFunction => {
  let cache: Function;

  return (context: Context, forceScalar: boolean): Function => {
    if (cache) {
      // TODO: in the case of mulitple calls, one of them might be a part of a history loop
      // in which case we'd need to recalculate the entire loop using scalars...
      return cache;
    }
    let cached = context.functions.find((x) => x.name === name);
    if (cached) {
      return cached;
    }

    let functionContext = new LoopContext(
      "invocation",
      { min: 0, max: size },
      context,
    );
    if (forceScalar) {
      functionContext.forceScalar = true;
    }

    // evaluate each body with the context
    let _bodies: Generated[] = bodies.map((x, i) =>
      output(x, i)(functionContext),
    );

    // each of these has fragments

    let histories = Array.from(
      new Set(_bodies.flatMap((x) => x.histories).filter((x) => x)),
    );
    let outerHistories: string[] = Array.from(
      new Set(_bodies.flatMap((x) => x.outerHistories || [])),
    );

    // now lets pack all of these
    let THIS = context.target === Target.C ? "" : "this.";
    let arrayName = `${THIS}${name}Array`;
    let code = "";
    let i = 0;
    let _cache = {};
    for (let body of _bodies) {
      _cache = { ...body };
      let _code = body.code || "";
      if (!_code.includes(";")) {
        _code += ";";
      }
      code += `
${_code}
${arrayName}[${i}] = ${body.variable};
            `;
      i++;
    }

    let prefix = context.target === Target.C ? "&" : "";
    cache = {
      ..._cache,
      name,
      variables: [],
      codeFragments: _bodies.map((x) => x.codeFragments[0]),
      context: functionContext,
      totalOutputs: countOutputs(_bodies.map((x) => x.codeFragments[0])),
      size,
      outputHistories: [],
      codeBlocks: [],
      code,
      variable: prefix + arrayName,
      params: [],
      functions: emitFunctions(..._bodies),
      functionArguments: emitArguments(..._bodies),
      histories: [...histories, ...outerHistories],
    };
    context.functions.push(cache);
    return cache;
  };
};

const containsCycle = (context: Context, args: Generated[]): boolean => {
  let historiesBeingWritten = getHistoriesBeingWrittenTo(context);

  for (let arg of args) {
    for (let frag of arg.codeFragments) {
      if (frag.histories.some((h) => historiesBeingWritten.has(h))) {
        return true;
      }
    }
  }
  return false;
};

// evaluate the function definition (created via defun)
export const call = (
  lazyFunction: LazyFunction,
  invocation: number,
  ...args: Arg[]
): UGen => {
  let memoized: Generated;

  // call needs to be its own special call context, in which case it is completely seperate from other
  // contexts.

  // it receives its dependencies and sends them off to the function
  // still needs memoization though...

  let downstreamHistories: string[];
  let lastHistoriesWritten: number | undefined;
  let id = uuid();

  return (context: Context): Generated => {
    let originalContext = context;
    let historiesBeingWritten = getHistoriesBeingWrittenTo(context);
    if (memoized && lastHistoriesWritten !== undefined) {
      //console.log('returning called memoize', memoized, context);
      let memoizationResult = determineMemoization(
        historiesBeingWritten,
        context,
        memoized,
        downstreamHistories,
        lastHistoriesWritten,
      );

      if (memoizationResult.memoization) {
        // no need to re-calculate
        //console.log('returning regular mem', context, memoizationResult.memoization);
        return memoizationResult.memoization;
      }
      context = memoizationResult.context;
    }
    lastHistoriesWritten = historiesBeingWritten.size;

    //console.log("call yall");
    let innerContext = context.useContext(false, true);
    //innerContext.newBase = true;

    // evaluate the arguments to be passed to this function
    let _args: Generated[] = args.map((arg) => innerContext.gen(arg));

    let forceScalar = containsCycle(context, _args);

    let _func: Function = lazyFunction(
      context.baseContext.useContext(false, true),
      forceScalar,
    );

    if (_func.context!.forceScalar !== forceScalar) {
      forceScalar = _func.context!.forceScalar;
    }

    if (forceScalar) {
      innerContext = context.useContext(false, true);
      _args = args.map((arg) => innerContext.gen(arg));
    }
    downstreamHistories = getDownstreamHistories(..._args);

    let totalOutputs = _func.totalOutputs || countOutputs(_func.codeFragments);
    let name = _func.name;

    let arrayOffset = forceScalar ? totalOutputs : 128 * totalOutputs;
    //let [variable] = context.useVariables(`${name}Value`);
    let variable =
      context.target === Target.C
        ? `(${name}_out + ${arrayOffset}*${invocation})`
        : `(this.${name}_out[${invocation}])`;

    // call the function w/ the invocation number
    // how do we route the correct arguments to the right ordering
    // we almost need to "name"
    let THIS = context.target === Target.Javascript ? "this." : "";
    let keyword =
      context.target === Target.C ? context.varKeyword + "*" : "let";
    //let code = `${keyword} ${variable} = ${THIS}${name} (${invocation}, ${_args.map(x => x.variable).join(",")});

    let i = 0;
    let variables: string[] = [];
    for (let evaluatedArg of _args) {
      if (evaluatedArg.scalar !== undefined) {
        // we need to create a constant array of size 128...
        if (forceScalar) {
          variables.push(evaluatedArg.variable!);
        } else {
          let constantArray = context.useConstantArray(
            "constant_arg" + i + "_",
            evaluatedArg.scalar,
          );
          variables.push(constantArray);
        }
      } else {
        if (forceScalar || evaluatedArg.context === context) {
          variables.push(evaluatedArg.variable!);
        } else {
          variables.push("block_" + evaluatedArg.variable!);
        }
      }
      i++;
    }

    let code = `${THIS}${name}(${invocation}, ${variables.join(",")});
`;

    // need to mark this as a isFunctionCaller
    let _context = forceScalar
      ? context.useContext(false)
      : context.useContext(false, true);
    if (!forceScalar) {
      _context.isFunctionCaller = true;
    }

    let generated: Generated = _context.emit(code, variable, ..._args);

    /*
    if (forceScalar) {
        console.log("YOOOOO FORCE SCALAR CALL CASE");
        // obviously we will call the function
        // but then we need to place each result in a variable

        // generate a fragment for each output
        let variables = _context.useCachedVariables(id, ... new Array(totalOutputs).fill("test").map((a, i) => "call_output_" + i + "_"));
        console.log("Variables we cached=", variables);
        let firstGenerated: Generated | undefined;
        let frags: CodeFragment[] = [];
        for (let i = 0; i < totalOutputs; i++) {
            // for each output we need to write it to a variable
            let code = `float ${variables[i]} = ${variable}[i];
`;
            let gen: Generated = _context.emit(code, variables[i]);
            if (!firstGenerated) {
                firstGenerated = gen;
            }
            gen.codeFragments[0].dependencies = generated.codeFragments;
            frags.push(gen.codeFragments[0]);
        }
        console.log("FRAGMENTS GENERATED FOR CALL=", frags);
        if (firstGenerated) {
            firstGenerated.codeFragments = frags;
            let _funcs = generated.functions || [];
            firstGenerated.functions = [..._funcs, _func];
            memoized = firstGenerated;
            if (forceScalar) {
                memoized.usingForceScalarFunction = true;
            }
            console.log("RETURNING FORCE WSCALAR GENERATED=", generated);
            return firstGenerated;
        }
    }
    */

    let _funcs = generated.functions || [];

    // append function
    generated.functions = [..._funcs, _func];
    memoized = generated;
    if (forceScalar) {
      memoized.usingForceScalarFunction = true;
    }
    return generated;
  };
};

export const latchcall = (
  lazyFunction: LazyFunction,
  invocation: number,
  latchCondition: UGen,
  ...args: UGen[]
): UGen => {
  // latch call somehow needs to notify the memoization code that any history searches need to end at this context
  // basically what the newBase variable does
  let downstreamHistories: string[];
  let id = uuid();
  let _context: Context | undefined;
  let memoized: Generated | undefined;
  let lastHistoriesWritten: number | undefined;
  let block: MemoryBlock;
  return (context: Context) => {
    let historiesBeingWritten = getHistoriesBeingWrittenTo(context);
    if (memoized && lastHistoriesWritten !== undefined) {
      let memoizationResult = determineMemoization(
        historiesBeingWritten,
        context,
        memoized,
        downstreamHistories,
        lastHistoriesWritten,
      );

      if (memoizationResult.memoization) {
        // no need to re-calculate
        //console.log('returning latchcall mem', context, memoizationResult.memoization);
        return memoizationResult.memoization;
      }
      context = memoizationResult.context;
      //console.log('ignoring latchcall mem');
    }

    lastHistoriesWritten = historiesBeingWritten.size;

    context = context.useContext(false);
    //context.forceScalar = true;
    //context.newBase = true;

    let _latchCondition = context.gen(latchCondition);
    let _args = args.map((x) => context.gen(x));

    downstreamHistories = getDownstreamHistories(_latchCondition, ..._args);
    //console.log("latch call downstream histories=", downstreamHistories);
    //console.log("latch call histories being written=", historiesBeingWritten);

    // simplified version of evaluateArgs (in memo-simd.ts). potentially should just use this
    // though that implementation only re-evaluates the specific arg that contains a loop
    if (downstreamHistories.some((x) => historiesBeingWritten.has(x))) {
      // this means we have a "history loop"

      // then we need to actually use this history context
      let historyContexts: Context[] = [];
      for (let h of downstreamHistories.filter((x) =>
        historiesBeingWritten.has(x),
      )) {
        let historyContext = getContextWithHistory(h, context);
        historyContexts.push(historyContext);
      }

      // todo: deep
      context = historyContexts[0];
      //context.forceScalar = true;
      //context.newBase = true;

      // now recall everything with this?
      _latchCondition = context.gen(latchCondition);
      _args = args.map((x) => context.gen(x));
      //console.log('re-evaluating latchcall args with new context', context);
    }

    //context = context.useContext(false);
    let _func: Function = lazyFunction(
      context.baseContext.useContext(false, true),
      true,
    );
    let totalOutputs = _func.totalOutputs || countOutputs(_func.codeFragments);
    let name = _func.name;
    block = block || context.alloc(totalOutputs);

    // call the function w/ the invocation number
    // how do we route the correct arguments to the right ordering
    // we almost need to "name"
    let THIS = context.target === Target.Javascript ? "this." : "";
    let keyword =
      context.target === Target.C ? context.varKeyword + "*" : "let";

    let code = "";

    //for (let i = 0; i < 8; i++) {
    //            code += `${context.varKeyword} ${variable}_${i} = memory[${(block.idx as number) + i}];
    //`;
    //       }

    //console.log("latch call function =", _func);

    code += `
if (${_latchCondition.variable} > 0) {
    ${THIS}${name} (${invocation}, ${_args.map((x) => x.variable).join(",")});
`;
    for (let i = 0; i < totalOutputs; i++) {
      if (context.target === Target.C) {
        code += `
memory[${(block.idx as number) + i}] = ${THIS}${_func.name}_out[${invocation * totalOutputs + i}];
`;
      } else {
        code += `
memory[${(block.idx as number) + i}] = ${THIS}${_func.name}_out[${invocation}][${i}];
`;
      }
    }

    code += `
}
`;

    let variable = `(memory + ${block.idx as number})`;

    let generated: Generated = context.emit(
      code,
      variable,
      _latchCondition,
      ..._args,
    );
    let _funcs = generated.functions || [];

    // append function
    generated.functions = [..._funcs, _func];

    if (memoized) {
      // this memoized object might be used elsewhere, so we need to mutate
      // the memoized object with the "new" results, so that any other fragments
      // referencing it may receive the updated values
      mergeMemoized(memoized, generated, context);
      memoized.context = context;
      memoized.usingForceScalarFunction = true;
      memoized.codeFragments[0].context = context;
      return memoized;
    }
    memoized = generated;
    generated.usingForceScalarFunction = true;

    return generated;
  };
};

export const nth = (array: Arg, index: Arg = 0) => {
  let id = uuid();

  // is there a way to do this w/o needing to load it into an array and then output it to another array,
  // which would be unnecessary?
  // rn it would take the depenendency (invocation-offseted array) and copy that array to another array
  // when ideally we'd just use it directly

  let memoized: Generated;
  let forceScalar: boolean | undefined;

  // TODO: nth has possibilit of being SIMD-based so we need a SIMD implementation as well
  return simdMemo(
    (context: Context, _array: Generated, _index: Generated): Generated => {
      //console.log("latchcall");
      // this fragment's variable will be the invocation-offseted array
      // ex: (fn_out + invocation*128*totalOutputs)
      // ideally we'd be able to directly use this in other fragments that depend on nth n of this call
      // like: (fn_out + invocation*128*totalOutputs + n*128);
      let indexScalar = _index.scalar !== undefined ? _index.scalar : 0;
      let [variable] = context.useCachedVariables(id, "nth");

      if (forceScalar === undefined) {
        // forceScalar = !context.isSIMD; //containsCycle(context, [_index, _array]);

        if (_array.variable!.includes("memory")) {
          forceScalar = true;
        }
      }

      if (_array.usingForceScalarFunction) {
        forceScalar = true;
      }

      //console.log("ARRAY =", _array);
      if (!forceScalar) {
        //console.log("NOT FORCE SCALAR FOUND FOR GENERATED=", _array);
      }

      if (forceScalar && context.isSIMD) {
        context = context.useContext(false);
      }

      //        console.log('index xcalar = ', indexScalar);
      //        console.log("array.variable = ", _array.variable);
      // lets create a fragment where the variable is this
      // TODO: need to know the function's output count in order to do this correctly.
      let offsetedArray = forceScalar
        ? `${_array.variable} + 1*${indexScalar} `
        : `${_array.variable} + 128 * ${indexScalar} `;
      let isLatchCall = _array.variable!.includes("memory");

      if (context.target === Target.Javascript) {
        offsetedArray = `${_array.variable}[${indexScalar}]`;

        if (offsetedArray.includes("memory")) {
          const regex = /\(memory \+ (\d+)\)\[(\d+)\]/;

          // Replace the matched pattern with the desired format memory[number+index]
          offsetedArray = offsetedArray.replace(
            regex,
            (match, number, index) => {
              return `memory[${Number.parseInt(number) + Number.parseInt(index)}]`;
            },
          );
        }
      }

      let arrayGrab = context.target === Target.C ? "[0]" : "";

      let codeFragment: CodeFragment = {
        context: context,
        // need to use simdMemo to divide against simd/non-simd
        code:
          context.target === Target.Javascript
            ? `let ${variable} = ${offsetedArray};`
            : isLatchCall && context.isSIMD
              ? `v128_t ${variable} = wasm_f32x4_splat(${offsetedArray}); `
              : forceScalar
                ? `float ${variable} = (${offsetedArray})${arrayGrab}; `
                : context.isSIMD
                  ? `v128_t ${variable} = wasm_v128_load(${offsetedArray} + j); // yo  `
                  : `float ${variable} = (${offsetedArray})[j]; `,
        variable: variable,
        dependencies: _array.codeFragments,
        histories: [],
      };

      let generated: Generated = context.emit(
        "",
        codeFragment.variable,
        _index,
        _array,
      );
      codeFragment.histories = generated.codeFragments[0].histories;
      generated.codeFragments = [codeFragment];
      memoized = generated;
      return generated;
    },
    (context: Context, _array: Generated, _index: Generated) => {
      if (_array.usingForceScalarFunction) {
        // this means it came from a force scalar caller
        // its best we dont try to use SIMD here as we may lose valuable context
        return {
          type: "SIMD_NOT_SUPPORTED",
        };
      }
      //console.log("latchcall");
      // this fragment's variable will be the invocation-offseted array
      // ex: (fn_out + invocation*128*totalOutputs)
      // ideally we'd be able to directly use this in other fragments that depend on nth n of this call
      // like: (fn_out + invocation*128*totalOutputs + n*128);
      let indexScalar = _index.scalar !== undefined ? _index.scalar : 0;
      let [variable] = context.useCachedVariables(id, "nth");

      if (forceScalar === undefined) {
        // need to determine force scalar from _array
        forceScalar = containsCycle(context, [_index, _array]);

        if (_array.variable!.includes("memory")) {
          // in this case we have a latch call feeding into this nth
          forceScalar = true;
        }
      }

      if (_array.usingForceScalarFunction) {
        forceScalar = true;
      }

      // lets create a fragment where the variable is this
      // TODO: need to know the function's output count in order to do this correctly.
      let offsetedArray = forceScalar
        ? `${_array.variable} + ${indexScalar} `
        : `${_array.variable} + 128 * ${indexScalar} `;

      // in latch call's case, we receive a pointer to memory where the latchcalls were saved
      // thus we cant do wasm_v128_load offseted by "j" (aka the for-loop iteration), as that would get
      // some address outside the bounds of the memory where it was written.
      // in this case, we simply fetch that value from that address, and splat it as a constant vector
      let isLatchCall = _array.variable!.includes("memory");

      if (_array.usingForceScalarFunction) {
        //offsetedArray = _array.codeFragments[indexScalar].variable;
      }

      let codeFragment: CodeFragment = {
        context: context,
        code: isLatchCall
          ? `v128_t ${variable} = wasm_f32x4_splat((${offsetedArray})[0]);`
          : `v128_t ${variable} = wasm_v128_load(${offsetedArray} + j); `,
        variable: variable,
        dependencies: _array.codeFragments,
        histories: [],
      };

      let generated: Generated = context.emit(
        "",
        codeFragment.variable,
        _index,
        _array,
      );
      codeFragment.histories = generated.codeFragments[0].histories;
      generated.codeFragments = [codeFragment];
      memoized = generated;
      return {
        type: "SUCCESS",
        generated,
      };
    },
    array,
    index,
  );

  /*
    return simdMemo((context: Context, _index: Generated, _array: Generated) => {
        let [value] = context.useCachedVariables(id, "nth");
        let indexScalar = _index.scalar ? _index.scalar : 1;
        let code = `${ context.varKeyword } ${ value } = ${ _array.variable } [${ indexScalar }]; `;
        return context.emit(code, value, _array, _index);
    },
    (context: SIMDContext, _index: Generated, _array: Generated) => {
        // we essentially want to just load this array
    },
    index,
    array
    );
    */
};

export const emitFunctions = (...gen: Generated[]): Function[] => {
  return Array.from(new Set(gen.flatMap((x) => x.functions || [])));
};

export const emitArguments = (...gen: Generated[]): Argument[] => {
  return Array.from(new Set(gen.flatMap((x) => x.functionArguments))).filter(
    (x) => x,
  );
};

// when argument is called we need to simply just use its name...

export interface Argument {
  name: string;
  num: number;
}
export const argument = (num: number, name: string): UGen => {
  let id = uuid();
  return simdMemo(
    (context: Context): Generated => {
      let [_var] = context.useCachedVariables(id, "funcArg");
      let varKeyword = (context as LoopContext).baseContext.varKeyword;
      let out = context.forceScalar
        ? `${varKeyword} ${_var} = ${name}; `
        : `${varKeyword} ${_var} = ${name} [j]; `;
      let generated: Generated = context.emit(out, _var);
      generated.isLoopDependent = true;
      let args = [...generated.functionArguments, { name, num }];
      // dedupe
      args = Array.from(new Set(args));
      generated.functionArguments = args;
      // as these occur append them to generated
      return generated;
    },
    (context: SIMDContext) => {
      // we basically just need to grab the
      let [_var] = context.useCachedVariables(id, "funcArg");
      let out = `v128_t ${_var} = wasm_v128_load(${name} + j); `;
      let generated: Generated = context.emit(out, _var);
      generated.isLoopDependent = true;
      let args = [...generated.functionArguments, { name, num }];
      // dedupe
      args = Array.from(new Set(args));
      generated.functionArguments = args;
      // as these occur append them to generated
      return {
        type: "SUCCESS",
        generated,
      };
    },
  );
};

export const invocation = (): UGen => {
  let id = uuid();
  return simdMemo((context: Context): Generated => {
    let [_var] = context.useCachedVariables(id, "invoc");
    let varKeyword = (context as LoopContext).context
      ? (context as LoopContext).context.varKeyword
      : context.varKeyword;
    let code = `${varKeyword} ${_var} = invocation;
    `;
    return context.emit(code, _var);
  });
};
