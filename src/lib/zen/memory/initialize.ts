import { Context } from "../context";

const determineMemorySize = (context: Context) => {
  let size = 0;
  for (let block of context.memory.blocksInUse) {
    let idx = (block._idx == undefined ? block.idx : block._idx) as number;
    if (block.allocatedSize) {
      let blockPosition = idx + block.allocatedSize;
      if (size < blockPosition) {
        size = blockPosition;
      }
    }
  }
  return size;
};

export const initMemory = (context: Context, workletNode: AudioWorkletNode) => {
  let initializes: any = [];
  let memorySize = determineMemorySize(context);
  const memory = new Float32Array(memorySize);
  for (let block of context.memory.blocksInUse) {
    if (block.initData !== undefined) {
      let idx = block._idx === undefined ? block.idx : block._idx;
      initializes[idx] = block.initData;
      memory.set(block.initData, idx as number);
    }
  }
  console.log("init-memory=", memory);
  workletNode.port.postMessage({
    type: "init-memory",
    body: {
      idx: 0,
      data: memory,
    },
  });
};
