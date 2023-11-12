import { Context } from './context';
import { MemoryBlock } from './block'

type BlockList = MemoryBlock[];

export class Memory {
    size: number;
    freeList: BlockList;
    references: number;
    blocksInUse: MemoryBlock[];
    context: Context;

    constructor(context: Context, size: number) {
        this.size = size;
        this.context = context;
        this.references = 0;
        this.blocksInUse = [];

        // start with a free list of size of the entire heap
        this.freeList = [
            new MemoryBlock(context, 0, size, 0)
        ];
    };

    alloc(size: number): MemoryBlock {
        let idx = 0;
        for (let i = 0; i < this.freeList.length; i++) {
            let block: MemoryBlock = this.freeList[i];
            if (size <= block.size) {
                block = this.useBlock(block, size, i);
                block.allocatedSize = size;
                this.blocksInUse.push(block);
                return block;
            }
        }

        this.increaseHeapSize();
        return this.alloc(size);
    }

    increaseHeapSize() {
        this.size *= 2;
        let lastBlock = this.freeList[this.freeList.length - 1];
        lastBlock.size = this.size - lastBlock.allocatedSize;
    }

    useBlock(block: MemoryBlock, size: number, freeIdx: number): MemoryBlock {
        if (block.size == size) {
            // we have a perfect match so remove entirely from
            // free list
            this.freeList.splice(freeIdx, 1);
        } else {
            // we have an unperfect match, so create a new block with
            // the size subtracted out and the idx shifted over
            this.freeList.splice(
                freeIdx,
                1,
                new MemoryBlock(
                    this.context,
                    (block.idx as number) + size,
                    block.size - size,
                    size));
        }
        this.references++;
        return block;
    }

    free(block: MemoryBlock) {
        this.freeList.push(block);
        this.references--;
        if (this.references === 0) {
            this.freeList[0].idx = 0;
        }
    }
}
