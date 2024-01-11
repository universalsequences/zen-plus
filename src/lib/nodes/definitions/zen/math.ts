

import { doc } from './doc';
//import { HasAttributes } from './interp';
import { BlockGen } from '@/lib/zen/data';
import { Operator, Statement } from './types';
import { Lazy, Message, ObjectNode } from '../../types';
import { print, s, Arg } from '@/lib/zen/index';
import { memoZen, memo } from './memo';
import {
    RoundMode,
    min,
    max,
    sign,
    log2,
    t60,
    round,
    latch,
    abs,
    reciprical,
    not_sub,
    mod,
    delta,
    change,
    floor, ceil,
    sin, cos, tanh,
    add, sub, mult, div, mix,
    pow,
    lt, lte, gt, gte, eq, neq, and, or,
    zswitch,
    scale,
    tan,
    exp,
    clamp,
    wrap,
} from '@/lib/zen/index';

export const op_doc = (name: string, num: number = 2, description?: string) => doc(
    name,
    {
        description: description || `takes ${name} of ${num} zen expressions`,
        numberOfInlets: num,
        numberOfOutlets: 1
    });

doc(
    '+',
    {
        description: "adds two zen expressions together",
        numberOfInlets: 2,
        numberOfOutlets: 1
    });
export const zen_add = (object: ObjectNode, ...args: Lazy[]) => {
    return memoZen(object, "add" as Operator, ...args);
};


op_doc('*', 2, "multiples two zen expressions together");
export const zen_mult = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "mult" as Operator, b);

};

op_doc('nth', 2, "takes nth element of zen typed array");
export const zen_nth = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "nth" as Operator, b);


};


op_doc('xor', 2, "takes xor of two zen expressions");
export const zen_xor = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "xor" as Operator, b);


};

op_doc('sign', 1, "extracts the sign (+1 or -1) of a zen expression");
export const zen_sign = (object: ObjectNode) => {
    return memoZen(object, "sign" as Operator);
};

op_doc('!/', 1, "takes the recipricol of a zen expression");
export const zen_reciprical = (object: ObjectNode) => {
    return memoZen(object, "reciprical" as Operator);
};

op_doc('exp2', 1, "power of 2 of zen expression");
export const zen_exp2 = (object: ObjectNode) => {
    return memoZen(object, "exp2" as Operator);
};

op_doc('log2', 1, "log 2 of a zen expression");
export const zen_log2 = (object: ObjectNode) => {
    return memoZen(object, "log2" as Operator);
};

op_doc('fixnan', 1);
export const zen_fixnan = (object: ObjectNode) => {
    return memoZen(object, "fixnan" as Operator);
};


op_doc('!-', 2);
export const zen_not_sub = (object: ObjectNode, sec: Lazy) => {
    return memoZen(object, "not_sub" as Operator, sec);
};

op_doc('delta', 1);
export const zen_delta = (object: ObjectNode) => {
    return memoZen(object, "delta" as Operator);
};

op_doc('change', 1);
export const zen_change = (object: ObjectNode) => {
    return memoZen(object, "change" as Operator);
};


op_doc('abs', 1);
export const zen_abs = (object: ObjectNode) => {
    return memoZen(object, "abs" as Operator);
};

op_doc('seq');
export const zen_seq = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "s" as Operator, b);
};

op_doc('latch');
export const zen_latch = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "latch" as Operator, b);
};

op_doc('/');
export const zen_div = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "div" as Operator, b);
};

op_doc('-');
export const zen_sub = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "sub" as Operator, b);
};

op_doc('pow');
export const zen_pow = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "pow" as Operator, b);
};

op_doc('exp', 1);
export const zen_exp = (object: ObjectNode) => {

    return memoZen(object, "exp" as Operator);
};

op_doc('mix', 3);
export const zen_mix = (object: ObjectNode, b: Lazy, c: Lazy) => {
    return memoZen(object, "mix" as Operator, b, c);
};

op_doc('min');
export const zen_min = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "min" as Operator, b);
};

op_doc('max');
export const zen_max = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "max" as Operator, b);
};

op_doc('t60', 1);
export const zen_t60 = (object: ObjectNode) => {
    return memoZen(object, "t60" as Operator);
};

op_doc('<');
export const zen_lt = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "lt" as Operator, b);
};

op_doc('%');
export const zen_mod = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "mod" as Operator, b);
};

op_doc('<=');
export const zen_lte = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "lte" as Operator, b);
};

op_doc('>');
export const zen_gt = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "gt" as Operator, b);
};

op_doc('>=');
export const zen_gte = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "gte" as Operator, b);
};

op_doc('=');
export const zen_eq = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "eq" as Operator, b);
};

op_doc('cos', 1);
export const zen_cos = (object: ObjectNode) => {
    return memoZen(object, "cos" as Operator);
};

op_doc('sin', 1);
export const zen_sin = (object: ObjectNode) => {
    return memoZen(object, "sin" as Operator);
};

op_doc('tan', 1);
export const zen_tan = (object: ObjectNode) => {
    return memoZen(object, "tan" as Operator);
};

op_doc('tanh', 1);
export const zen_tanh = (object: ObjectNode) => {
    return memoZen(object, "tanh" as Operator);
};

op_doc('atan', 1);
export const zen_atan = (object: ObjectNode) => {
    return memoZen(object, "atan" as Operator);
};

op_doc('sqrt', 1);
export const zen_sqrt = (object: ObjectNode) => {
    return memoZen(object, "sqrt" as Operator);
};

op_doc('floor', 1);
export const zen_floor = (object: ObjectNode) => {
    return memoZen(object, "floor" as Operator);
};

op_doc('ceil', 1);
export const zen_ceil = (object: ObjectNode) => {
    return memoZen(object, "ceil" as Operator);
};

op_doc('!=');
export const zen_neq = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "neq" as Operator, b);
};

op_doc('and');
export const zen_and = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "and" as Operator, b);
};

op_doc('or');
export const zen_or = (object: ObjectNode, b: Lazy) => {
    return memoZen(object, "or" as Operator, b);
};

doc(
    'round',
    {
        numberOfInlets: 2,
        inletNames: ["multiple"],
        numberOfOutlets: 1,
        description: "rounds input to nearest multiple",
        defaultValue: 1
    });
export const zen_round = (object: ObjectNode, multiple: Lazy) => {
    return memo(object, (num: Message): Statement => {
        let mode: RoundMode = (object.attributes.mode || "nearest") as RoundMode;

        let operator = {
            name: "round",
            params: mode
        };
        return [operator, num as Statement, (multiple() as Statement) || 0];
    });
};

op_doc('switch', 3);
export const zen_switch = (object: ObjectNode, b: Lazy, c: Lazy) => {
    return memoZen(object, "zswitch" as Operator, b, c);
};

op_doc('clamp', 3);
export const zen_clamp = (object: ObjectNode, b: Lazy, c: Lazy) => {
    return memoZen(object, "clamp" as Operator, b, c);
};

op_doc('wrap', 3);
export const zen_wrap = (object: ObjectNode, b: Lazy, c: Lazy) => {
    return memoZen(object, "wrap" as Operator, b, c);
};

doc(
    "scale",
    {
        numberOfInlets: 6,
        numberOfOutlets: 1,
        description: "scales an input of known range into a new range",
        defaultValue: 1
    });
export const zen_scale = (object: ObjectNode, min1: Lazy, max1: Lazy, min2: Lazy, max2: Lazy, exp: Lazy) => {
    return memoZen(object, "scale" as Operator, min1, max1, min2, max2, exp);
};

op_doc('sampstoms', 1);
export const zen_sampstoms = (object: ObjectNode) => {
    return memoZen(object, "sampstoms" as Operator);
};

op_doc('mstosamps', 1);
export const zen_mstosamps = (object: ObjectNode) => {
    return memoZen(object, "mstosamps" as Operator);
};


export const math = {
    '+': zen_add,
    '*': zen_mult,
    '/': zen_div,
    '-': zen_sub,
    'mix': zen_mix,
    'scale': zen_scale,
    'clamp': zen_clamp,
    'wrap': zen_wrap,
    '!/': zen_reciprical,
    //   'print': zen_print,
    '!-': zen_not_sub,
    '<': zen_lt,
    '>': zen_gt,
    '<=': zen_lte,
    '>=': zen_gte,
    '=': zen_eq,
    'cos': zen_cos,
    'sin': zen_sin,
    'tanh': zen_tanh,
    '!=': zen_neq,
    'and': zen_and,
    'or': zen_or,
    'floor': zen_floor,
    'ceil': zen_ceil,
    'sampstoms': zen_sampstoms,
    'mstosamps': zen_mstosamps,
    'seq': zen_seq,
    'pow': zen_pow,
    '%': zen_mod,
    'latch': zen_latch,
    'delta': zen_delta,
    'switch': zen_switch,
    'abs': zen_abs,
    'round': zen_round,
    'min': zen_min,
    'max': zen_max,
    't60': zen_t60,
    'exp': zen_exp,
    'xor': zen_xor,
    'exp2': zen_exp2,
    'tan': zen_tan,
    'sign': zen_sign,
    'log2': zen_log2,
    "atan": zen_atan,
    "sqrt": zen_sqrt,
    "fixnan": zen_fixnan,
    "nth": zen_nth,
    "change": zen_change
};
