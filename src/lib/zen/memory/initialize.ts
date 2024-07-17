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
  console.log("determined size...", memorySize);
  const memory = new Float32Array(memorySize);
  for (const block of context.memory.blocksInUse) {
    if (block.initData !== undefined) {
      const idx = block._idx === undefined ? block.idx : block._idx;
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
