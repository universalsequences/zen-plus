import { API } from '@/lib/nodes/context';
import { knob, slider } from './slider';
import { interval } from './metro';
import { strings } from './strings';
import { divider, umenu } from './umenu';
import { order } from './order';
import { math } from './math';
import { lists } from './list';
import { matrix } from './matrix';
import { attrui } from './attrui';
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
    ...order,
    interval,
    attrui,
    umenu,
    divider,
    slider,
    knob,
    ...strings
};
