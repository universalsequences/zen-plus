import { API } from '@/lib/nodes/context';
import { select, route } from './select';
import { function_editor } from './function';
import { knob, slider } from './slider';
import { preset } from './preset';
import { interval } from './metro';
import { strings } from './strings';
import { divider, umenu } from './umenu';
import { order } from './order';
import { math } from './math';
import { lists } from './list';
import { button, matrix } from './matrix';
import { attrui } from './attrui';
import { buffer } from './buffer';
import { wasmviewer } from './wasmviewer';
import { comment } from './comment';
import { send, subscribe } from './messages';

export const api: API = {
    wasmviewer,
    route,
    buffer,
    subscribe,
    send,
    button,
    select,
    "function": function_editor,
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
    preset,
    ...strings
};

