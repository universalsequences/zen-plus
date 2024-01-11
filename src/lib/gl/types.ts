import { Uniform } from './uniforms';
/**
 * zen-gl takes the same approach as zen to compile
 * expressions into GL (but potentially other shader langauges like metal/webgpu)
 */

export type EmittedVariables = {
    [key: string]: boolean;
};

export type Error = string;

export interface Context {
    idx: number;
    emittedVariables: EmittedVariables;
    gen: (input: Arg) => Generated;
    isVariableEmitted: (variable: string) => boolean;
    useVariables: (...names: string[]) => string[];
    printType: (x: GLType) => string;
    emit: (type: GLType, code: string, variable: string, ...args: Generated[]) => Generated;
    emitError: (error: Error) => void;
    errors: Error[];
    webGLRenderingContext: WebGLRenderingContext | null;
    webGLProgram: WebGLProgram | null;
    uniforms: Uniform[];
    initializeUniforms: () => void;
}

export enum GLType {
    Float,
    Vec2,
    Vec3,
    Vec4,
    Sampler2D
}

export interface UniformDefinition {
    type: GLType;
    name: string;
}

export interface Generated {
    code: string; /*  the code generated */
    variable?: string; /* the current variable */
    variables?: string[];
    uniforms?: UniformDefinition[];
    context?: Context;
    type: GLType;
}

export type Arg = number | UGen;
export type UGen = (context: Context) => Generated;
