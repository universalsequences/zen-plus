import { API } from '@/lib/nodes/context';
import { order } from './order';
import { math } from './math';
import { lists } from './list';
import { matrix } from './matrix';
import { buffer } from './buffer';
import { comment } from './comment';
import { subscribe } from './messages';

export const api: API = {
    buffer,
    subscribe,
    matrix,
    comment,
    ...lists,
    ...math,
    ...order
};
