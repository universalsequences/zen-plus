
import { memo } from './memo';
import { Context, Arg, UGen, Generated, GLType } from './types';
import { printType, emitType } from './context';

const op = (operator: string, name: string) => {
    return (...args: Arg[]): UGen => {
        return memo((context: Context): Generated => {
            let _args: Generated[] = args.map((arg: Arg) => context.gen(arg));

            // we ask for a new variable name
            let [opVar] = context.useVariables(name + "Val");

            // determine type from the args (e.g. 5 + vec2(2,5) -> vec2)
            let _type = emitType(_args);
            let type = printType(_type);

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
        return (context: Context): Generated => {
            let _ins = ins.map(f => context.gen(f));
            let [opVar] = context.useVariables(`${name}Val`);

            let _type = __type === undefined ? _ins[0].type : __type;
            let type = printType(_type);
            console.log('type for name=%s', name, type, _type);
            let code = ins.length > 0 && jsFunc && ins.every(x => typeof x === "number") ?
                `${type} ${opVar} = ${jsFunc(...ins as number[])};` :
                `${type} ${opVar} = ${func}(${_ins.map(x => x.variable).join(",")});`;
            return context.emit(_type, code, opVar, ..._ins);
        }
    };
};

export const add = op("+", "add");
export const sub = op("-", "sub");
export const mult = op("*", "mult");
export const div = op("/", "div");
export const pow = func("pow", "pow", Math.pow);
export const floor = func("floor", "floor", Math.floor);
export const ceil = func("ceil", "ceil", Math.ceil);
export const sin = func("sin", "sin", Math.sin);
export const cos = func("cos", "cos", Math.cos);
export const tan = func("tan", "tan", Math.tan);

export const smoothstep = func("smoothstep");
export const step = func("step");
export const min = func("min");
export const max = func("max");
export const mod = func("mod");
export const sqrt = func("sqrt");
export const sign = func("sign");
export const exp = func("exp");
export const exp2 = func("exp2");
export const length = func("length", "length", undefined, GLType.Float);


// dot product takes 2 vectors and returns a float
export const dot = func("dot", "dot", undefined, GLType.Float);


