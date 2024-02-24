
import { memo } from './memo';
import { Context, Arg, UGen, Generated, GLType } from './types';
import { emitType } from './context';

const op = (operator: string, name: string, strictType?: GLType) => {
    return (...args: Arg[]): UGen => {
        return memo((context: Context): Generated => {
            let _args: Generated[] = args.map((arg: Arg) => context.gen(arg));

            // we ask for a new variable name
            let [opVar] = context.useVariables(name + "Val");

            // determine type from the args (e.g. 5 + vec2(2,5) -> vec2)
            let _type = strictType === undefined ? emitType(_args) : strictType;
            let type = context.printType(_type);

            let code = `${type} ${opVar} = ${_args.map(x => x.variable).join(operator)};`;
            return context.emit(
                _type,
                code,
                opVar,
                ..._args);
        });
    };
};

export const func = (
    func: string,
    name: string = func,
    jsFunc?: (...x: number[]) => number,
    __type?: GLType) => {
    return (...ins: Arg[]): UGen => {
        return memo((context: Context): Generated => {
            let _ins = ins.map(f => context.gen(f));
            let [opVar] = context.useVariables(`${name}Val`);

            let _type = __type === undefined ? emitType(_ins) : __type;
            let type = context.printType(_type);
            let code = ins.length > 0 && jsFunc && ins.every(x => typeof x === "number") ?
                `${type} ${opVar} = ${jsFunc(...ins as number[])};` :
                `${type} ${opVar} = ${func}(${_ins.map(x => x.variable).join(",")});`;
            return context.emit(_type, code, opVar, ..._ins);
        });
    }
};

export const and = op("&&", "and", GLType.Bool);
export const or = op("||", "or", GLType.Bool);
export const add = op("+", "add");
export const sub = op("-", "sub");
export const mult = op("*", "mult");
export const div = op("/", "div");
export const lt = op("<", "lt", GLType.Bool);
export const gt = op(">", "gt", GLType.Bool);
export const gte = op(">=", "gte", GLType.Bool);
export const lte = op("<=", "lte", GLType.Bool);
export const eq = op("==", "eq", GLType.Bool);
export const pow = func("pow", "pow", Math.pow);
export const atan = func("atan", "atan", Math.atan2);
export const cosh = func("cosh", "cosh", Math.cosh);
export const sinh = func("sinh", "sinh", Math.sinh);
export const floor = func("floor", "floor", Math.floor);
export const ceil = func("ceil", "ceil", Math.ceil);
export const sin = func("sin", "sin", Math.sin);
export const cos = func("cos", "cos", Math.cos);
export const tan = func("tan", "tan", Math.tan);

export const smoothstep = func("smoothstep");
export const step = func("step");
export const mix = func("mix");
export const min = func("min");
export const max = func("max");
export const mod = func("mod");
export const log = func("log");
export const sqrt = func("sqrt");
export const sign = func("sign");
export const normalize = func("normalize");
export const exp = func("exp");
export const cross = func("cross");
export const exp2 = func("exp2");
export const length = func("length", "length", undefined, GLType.Float);
export const abs = func("abs", "abs");
export const fract = func("fract", "fract");


// dot product takes 2 vectors and returns a float
export const dot = func("dot", "dot", undefined, GLType.Float);


