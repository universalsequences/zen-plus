import { op_doc } from './math';
import { Operator } from './types';
import { BlockGen } from '@/lib/zen/data';
import { delay } from '@/lib/zen/delay';
import { Lazy, ObjectNode } from '../../types';
import { memoZen } from './memo';
import { memo } from './memo';

op_doc('delay');

export const zen_delay = (
    object: ObjectNode,
    delayTime: Lazy) => {
    return memoZen(object, "delay" as Operator, delayTime);
};
