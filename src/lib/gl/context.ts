import { GLType, Arg, UniformDefinition, Error, Generated, EmittedVariables, UGen, Context, ChildContext } from './types';
import { Varying } from './varying';
import { Attribute, emitAttributes } from './attributes';
import { emitFunctions, emitArguments } from './functions';
import { Uniform } from './uniforms';

export class ContextImpl implements Context {
    idx: number;
    emittedVariables: EmittedVariables;
    attributes: Attribute[];
    errors: Error[];
    webGLRenderingContext: WebGLRenderingContext | null;
    webGLProgram: WebGLProgram | null;
    uniforms: Uniform[];
    varyings: Varying[];
    siblingContext?: Context;

    constructor(siblingContext?: Context) {
        this.idx = 0;
        this.siblingContext = siblingContext;
        this.emittedVariables = {};
        this.attributes = [];
        this.uniforms = [];
        this.varyings = [];
        this.errors = [];
        this.webGLRenderingContext = null;
        this.webGLProgram = null;
    }

    initializeUniforms() {
        for (let uni of this.uniforms) {
            uni.set!();
        }
    }

    isVariableEmitted(name: string): boolean {
        let x = this.emittedVariables[name] === true;
        return x;
    }

    useVariables(...names: string[]): string[] {
        let idx = this.idx++;
        return names.map(name => `${name}${idx}`);
    }

    gen(input: Arg): Generated {
        if (input === undefined) {
            input = 0;
        }
        if (typeof input === "number") {
            return float(input)(this);
        }
        return input(this);
    }

    printType(type: GLType): string {
        if (type === GLType.Float) {
            return "float";
        } else if (type === GLType.Bool) {
            return "bool";
        } else if (type === GLType.Vec2) {
            return "vec2";
        } else if (type === GLType.Vec3) {
            return "vec3";
        } else if (type === GLType.Vec4) {
            return "vec4";
        } else if (type === GLType.Mat2) {
            return "mat2";
        } else if (type === GLType.Mat3) {
            return "mat3";
        } else if (type === GLType.Mat4) {
            return "mat4";
        } else {
            console.log('type print type = ', GLType.Mat4, type);
            return "sampler2D";
        }
    }

    emitError(error: Error) {
        this.errors.push(error);
    }

    emit(type: GLType, code: string, variable: string, ...args: Generated[]): Generated {
        // ensure all variables in inner-expressions (args) are propagated through
        let _variables = new Set([variable]);
        for (let { variables } of args) {
            if (variables) {
                variables.forEach((v: string) => _variables.add(v));
            }
        }

        // ensure all uniforms in inner-expressions (args) are propagated through
        let _uniforms = new Set<UniformDefinition>([]);
        for (let { uniforms } of args) {
            if (uniforms !== undefined) {
                uniforms.forEach((v: UniformDefinition) => _uniforms.add(v));
            }
        }

        return {
            code: emitCode(this, code, variable, ...args),
            uniforms: Array.from(_uniforms),
            variable,
            type,
            variables: Array.from(_variables),
            functions: emitFunctions(...args),
            functionArguments: emitArguments(...args),
            attributes: emitAttributes(...args),
        };
    }

}

export class ChildContextImpl extends ContextImpl implements ChildContext {
    parentContext: Context;
    constructor(parentContext: Context) {
        super();
        this.parentContext = parentContext;
    }
}

export const float = (x: number): UGen => {
    let floated = x.toString();
    if (x - Math.floor(x) === 0) {
        floated += ".0";
    }
    return () => {
        return {
            code: floated,
            variable: floated,
            variables: [],
            type: GLType.Float
        };
    };
};


export const emitCode = (context: Context, code: string, variable: string, ...gens: Generated[]): string => {
    let vout = "";
    // once code is emitted we notify context that the variable is taken
    context.emittedVariables[variable] = true;
    for (let gen of gens) {
        if (containsVariable(gen)) {
            vout += gen.code;
            context.emittedVariables[gen.variable!] = true;
        }
    }
    return vout + '\n' + code;
}

const containsVariable = (gen: Generated): boolean => {
    return gen.code !== gen.variable;
}

export const emitType = (gens: Generated[]) => {
    // we take the "max" type-- for example,
    // when we do: 5 + vec(2, 5) -> generated a vec2(7, 10)
    let types = gens.map(x => x.type);
    let maxType = Math.max(...types);
    return maxType;
};

