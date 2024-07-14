import { Context } from "../context";

const determineMemorySize = (context: Context) => {
  let size = 0;
  for (let block of context.memory.blocksInUse) {
    let idx = (block._idx == undefined ? block.idx : block._idx) as number;
    if (block.allocatedSize || block.initData) {
      let _size =
        block.allocatedSize && block.initData
          ? Math.max(block.allocatedSize, block.initData.length)
          : block.allocatedSize;
      let blockPosition = idx + _size;
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
  console.log("determined size...", memorySize);
  const memory = new Float32Array(memorySize);
  for (let block of context.memory.blocksInUse) {
    if (block.initData !== undefined) {
      let idx = block._idx === undefined ? block.idx : block._idx;
      initializes[idx] = block.initData;
      memory.set(block.initData, idx as number);
    }
  }
  workletNode.port.postMessage({
    type: "init-memory",
    body: {
      idx: 0,
      data: memory,
    },
  });
};
