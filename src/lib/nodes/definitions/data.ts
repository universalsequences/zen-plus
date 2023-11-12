import { doc } from './doc';
import { Statement, Operator } from './zen/types';
import { UGen } from '@/lib/zen/index';
import { peek, poke, data, BlockGen, Gettable, Interpolation } from '@/lib/zen/data';
import { delay } from '@/lib/zen/delay';
import { ObjectNode } from '../types';
import { Lazy, Message } from '../types';
import { memoZen, memoBlockZen, } from './memo';
import { memo } from './memo';

doc(
    'data',
    {
        numberOfInlets: 3,
        numberOfOutlets: 1,
        inletNames: ["initData", "size", "channels"],
        description: "creates a buffer to be used"
    },
);

export const zen_data = (
    object: ObjectNode,
    size: Lazy,
    channels: Lazy
) => {
    // check if object.needsLoad was set to false, if so do some shit...
    let block: BlockGen;
    let lastData: Float32Array;
    return (initData: Message): Statement[] => {
        let initialized = false;
        if (!lastData || typeof initData === "string") {
            // if its already initialized and the data length changes
            if (lastData && typeof initData === "string") {
                initData = lastData;
            }
            let dat = typeof initData === "string" ? undefined : initData
            if (!object.block) {
                object.block = data(
                    size() as number, 
                    channels() as number, 
                    dat as Float32Array, 
                    true, 
                    object.attributes["interpolation"] as Interpolation);
            }
            initialized = true;
        }
        if (Array.isArray(initData) || ArrayBuffer.isView(initData)) {
            if ((initData as Float32Array).length < size()) {
                let _init = new Float32Array(size() as number);
                _init.set(initData as Float32Array, 0);
                initData = _init;
            }
            lastData = initData as Float32Array;
            // set the data directly (equivalent of sending data to a texture
            // in a shader)
            if (object.block) {
                object.block.set!(initData as Float32Array);
            }
            if (!initialized) {
                return [];
            }
        }
        if (object.block) {
            return [object.block];
        } else {
            return [];
        }
    };
};


doc(
    'peek',
    {
        inletNames: ["data", "index", "channel", "maxLength"],
        numberOfOutlets: 4,
        numberOfInlets: 1,
        description: "peeks values out of data buffer"
    });

export type BlockArg = BlockGen[];

export const zen_peek = (
    object: ObjectNode,
    index: Lazy,
    channel: Lazy,
    maxLength: Lazy  
) => {
    return memo(object, (x: Message): Statement => {
            let operator = {
                name: 'peek',
                params: x as unknown as BlockGen
            };
            return [operator, index() as Statement, channel() as Statement, maxLength() as Statement];
        }, index, channel);
};

doc(
    'poke',
    {
        inletNames: ["data", "index", "channel", "value"],
        numberOfInlets: 4,
        numberOfOutlets: 1,
        description: "poke value into buffer"
    });

export const zen_poke = (
    object: ObjectNode,
    index: Lazy,
    channel: Lazy,
    value: Lazy,
) => {
    return (msg: Message): Statement[] => {
        let operator = {
            name: 'poke',
            params: msg as unknown as BlockGen
        };
        if (value() === undefined) {
        return [];
        }
        return [[operator, index() as Statement, channel() as Statement, value() as Statement]];
    };
};


export const data_index = {
    'peek': zen_peek,
    'poke': zen_poke,
    'data': zen_data,
};