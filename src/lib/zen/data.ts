import { UGen, Arg, genArg, Generated, float } from "./zen";
import { ContextualBlock } from "./history";
import { memo, simdMemo } from "./memo";
import { Context, LoopContext } from "./context";
import { Target } from "./targets";
import { cKeywords } from "./math";
import { add, mult, wrap } from "./math";
import { LoopMemoryBlock, Block, MemoryBlock } from "./block";
import { uuid } from "./uuid";

/*
export type MultiChannelBlock  = (LoopMemoryBlock | Block) & {
    channels: number;
    length: number;
};
*/

// multichannelblock needs to simply implement block and can either
// be a loopblock or regular block...
//class MultiChannelBlock extends MemoryBlock {
//}

export type Interpolation = "linear" | "none";

export interface Gettable<t> {
  get?: () => Promise<t>;
  set?: (x: t, time?: number) => void;
  getInitData?: () => Float32Array;
  getSize?: () => number;
  getChannels?: () => number;
}

export type BlockGen = ((c: Context) => MemoryBlock) &
  Gettable<Float32Array> & {
    interpolation?: Interpolation;
  };

export const data = (
  size: number = 1,
  channels: number = 1,
  initData?: Float32Array,
  root?: boolean,
  interpolation?: Interpolation,
): BlockGen => {
  let block: MemoryBlock;
  let _context: Context;
  let contextBlocks: ContextualBlock[] = [];
  let lastData: Float32Array;
  let initted = false;
  let resp: BlockGen = (context: Context): MemoryBlock => {
    initted = true;
    if (lastData) {
      initData = lastData;
    }
    let variableContext = context;
    if (block === undefined || _context !== context) {
      // how should really work?
      if (root) {
        // what is root used for?
        variableContext = context.baseContext;
      }
      context = variableContext;

      if (!block) {
        block = context.alloc(size * channels);
      }

      block.initData = initData;
      block.length = size;
      block.channels = channels;
      contextBlocks.push({ block, context });
    }

    _context = context;

    block.channels = channels;
    block.length = size;

    if (initData != undefined) {
      block.initData = initData;
    }
    context.baseContext.memory.blocksInUse.push(block);
    return block;
  };

  resp.get = (): Promise<Float32Array> => {
    if (block) {
      return block.get();
    }
    return new Promise((resolve: (x: Float32Array) => void) => resolve(new Float32Array(1)));
  };

  resp.interpolation = interpolation === undefined ? "linear" : interpolation;

  resp.getSize = () => {
    return size;
  };

  resp.getChannels = () => {
    return channels;
  };

  resp.getInitData = () => {
    return initData!;
  };

  resp.set = (buf: Float32Array, time?: number) => {
    lastData = buf;
    for (let { context, block } of contextBlocks) {
      block.initData = buf;
      context.baseContext.postMessage({
        type: "init-memory",
        body: {
          idx: block.idx,
          data: buf,
          time: time,
        },
      });
    }
  };

  return resp;
};

export const unsafeMemoryFetch = (index: Arg): UGen => {
  let id = uuid();
  return simdMemo(
    (context: Context, _index: Generated): Generated => {
      // need the base context if its a parameter (we dont want
      let [fetchVal] = context.useCachedVariables(id, "fetchVal");
      let code = `
${context.varKeyword} ${fetchVal} = memory[${_index.variable}];
`;

      return context.emit(code, fetchVal, _index);
    },
    undefined,
    index,
  );
};

export const peek = (data: BlockGen, index: Arg, channel: Arg, length?: Arg): UGen => {
  let counts = 0;
  let id = uuid();
  return simdMemo(
    (context: Context, _index: Generated, _channel: Generated): Generated => {
      // need the base context if its a parameter (we dont want
      // a different parameter for every single loop iteration)
      // note: since this being run by simdMemo, it might not actually use the variableContext to
      // call the indices...

      let variableContext = context;
      let __context = context;
      /*
          * trying to fix bug with env
        while ("context" in context) {
            context = (context as any)["context"] as Context;
        }
        */

      let multichannelBlock: MemoryBlock = data(context);
      let [preIdx, peekIdx, peekVal, channelIdx, frac, nextIdx, peekIdx2, peekIdx3] =
        variableContext.useCachedVariables(
          id,
          "preIdx",
          "peekIdx",
          "peekVal",
          "channelIdx",
          "frac",
          "nextIdx",
          "peekIdx_2",
          "peekIdx_3",
        );
      let perChannel: any = multichannelBlock.length;
      // console.log("PER CHANNEL DATA=", perChannel);

      let __length = undefined;
      let _length = multichannelBlock.length;
      let maxChannel: any = multichannelBlock.length;
      if (length) {
        __length = variableContext.gen(length);
        maxChannel = __length.variable;
      }

      let idx =
        multichannelBlock._idx === undefined ? multichannelBlock.idx : multichannelBlock._idx;
      let intKeyword = context.intKeyword;
      let varKeyword = context.varKeyword;
      let floor = context.target === Target.C ? cKeywords["Math.floor"] : "Math.floor";

      let code = `
${varKeyword} ${preIdx} = ${_index.variable};
if (${preIdx} > ${multichannelBlock.length} - 1) ${preIdx} = 0; //${multichannelBlock.length};
else if (${preIdx} < 0) ${preIdx} += ${multichannelBlock.length};
${intKeyword} ${channelIdx} = ${_channel.variable};
if (${channelIdx} > ${multichannelBlock.channels}) ${channelIdx} -= ${multichannelBlock.channels};
else if (${channelIdx} < 0) ${channelIdx} += ${multichannelBlock.channels};
${varKeyword} ${peekIdx} = ${perChannel} * ${channelIdx} + ${preIdx};
${varKeyword} ${frac} = ${peekIdx} - ${floor}(${peekIdx});
${intKeyword} ${nextIdx} = ${floor}(${peekIdx}) + 1;
if (${nextIdx} >= (${perChannel} * (${_channel.variable})) + ${maxChannel}) {
   ${nextIdx} =  ${perChannel} * (${_channel.variable});
}
${intKeyword} ${peekIdx2} = ${idx} + ${floor}(${peekIdx});
${intKeyword} ${peekIdx3} = ${idx} + ${nextIdx};
${varKeyword} ${peekVal} = (1 - ${frac})*memory[${peekIdx2}] + (${frac})*memory[${peekIdx3}];
`;

      if (data.interpolation === "none") {
        code = `
${intKeyword} ${preIdx} = ${_index.variable};
if (${preIdx} > ${multichannelBlock.length}) ${preIdx} -= ${multichannelBlock.length};
else if (${preIdx} < 0) ${preIdx} += ${multichannelBlock.length};
${intKeyword} ${channelIdx} = ${_channel.variable};
if (${channelIdx} > ${multichannelBlock.channels}) ${channelIdx} -= ${multichannelBlock.channels};
else if (${channelIdx} < 0) ${channelIdx} += ${multichannelBlock.channels};
${intKeyword} ${peekIdx} = ${perChannel} * ${channelIdx} + ${preIdx};
${intKeyword} ${peekIdx2} = ${idx} + ${peekIdx};
${varKeyword} ${peekVal} = memory[${peekIdx2}];
`;
      }

      if (__length) {
        return context.emit(code, peekVal, _index, _channel, __length);
      }
      let peeked = __context.emit(code, peekVal, _index, _channel);
      return peeked;
    },
    undefined,
    index,
    channel,
  );
};

export const poke = (data: BlockGen, index: Arg, channel: Arg, value: Arg): UGen => {
  let id = uuid();
  return simdMemo(
    (context: Context, _index: Generated, _channel: Generated, _value: Generated): Generated => {
      let multichannelBlock = data(context);
      //let _index: Generated = context.gen(index);
      let [_idx2, pokeVal]: string[] = context.useCachedVariables(id, "pokeIdx_2_", "pokeVal");
      //let _channel: Generated = context.gen(channel);
      //let _value: Generated = context.gen(value);
      let perChannel: number = multichannelBlock.length!;
      let intKeyword = context.intKeyword;
      let varKeyword = context.varKeyword;
      let floor = context.target === Target.C ? cKeywords["Math.floor"] : "Math.floor";
      let pokeIdx = `${perChannel} * ${_channel.variable} + ${floor}(${_index.variable})`;
      let code = `
// begin poke
${intKeyword} ${_idx2} = ${multichannelBlock._idx || multichannelBlock.idx} + ${pokeIdx};
memory[${_idx2}] = ${_value.variable};
${context.varKeyword} ${pokeVal} = ${_value.variable};
// end poke
`;
      // this can be used as a value
      let x = context.emit(code, pokeVal, _index, _channel, _value);
      return x;
    },
    undefined,
    index,
    channel,
    value,
  );
};

export const clearData = (data: BlockGen, value: Arg): UGen => {
  return memo((context: Context): Generated => {
    let multichannelBlock = data(context);
    let [_idx2]: string[] = context.useVariables("pokeIdx_2_");
    let _value: Generated = context.gen(value);
    let perChannel: number = multichannelBlock.length!;
    let intKeyword = context.intKeyword;
    let floor = context.target === Target.C ? cKeywords["Math.floor"] : "Math.floor";
    let code = `
for (${intKeyword} i=0; i < ${perChannel}; i++) {
   memory[${multichannelBlock._idx || multichannelBlock.idx} + i] = ${_value.variable};
}
${intKeyword} ${_idx2} = ${multichannelBlock._idx || multichannelBlock.idx} + 0;
`;
    // this can be used as a value
    return context.emit(code, _value.variable!, _value);
  });
};
