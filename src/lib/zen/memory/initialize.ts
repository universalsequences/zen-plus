import type { Context } from "../context";

export const determineMemorySize = (context: Context) => {
  let size = 0;
  for (const block of context.memory.blocksInUse) {
    const idx = (block._idx === undefined ? block.idx : block._idx) as number;
    if (block.allocatedSize || block.initData) {
      const _size =
        block.allocatedSize && block.initData
          ? Math.max(block.allocatedSize, block.initData.length)
          : block.allocatedSize;
      const blockPosition = idx + _size;
      if (size < blockPosition) {
        size = blockPosition;
      }
    }
  }
  return size;
};

export const initMemory = (context: Context, workletNode: AudioWorkletNode) => {
  const initializes: any = [];
  const memorySize = determineMemorySize(context);
  if (true) {
    //memorySize > 4000000) {
    // memory is huge so go thru one at a time
    for (const block of context.memory.blocksInUse) {
      if (block.initData !== undefined) {
        const idx = block._idx === undefined ? block.idx : block._idx;
        if (block.initData.length < 100000) {
          workletNode.port.postMessage({
            type: "init-memory",
            body: {
              idx: idx,
              data: block.initData,
            },
          });
        }
      }
    }
    return;
  }
  const memory = new Float32Array(memorySize);
  for (const block of context.memory.blocksInUse) {
    if (block.initData !== undefined) {
      const idx = (block._idx === undefined ? block.idx : block._idx) as number;
      initializes[idx] = block.initData;
      if (Number.isNaN(block.initData?.[0])) {
        continue;
      }
      memory.set(block.initData as Float32Array, idx as number);
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
