import { Uniform } from './uniforms';
import { Texture } from './texture';
import { Varying } from './varying';
import { AttributeDefinition, Attribute } from './attributes';
import { Argument } from './functions';
import { LoopAccumulator } from './loop';
/**
 * zen-gl takes the same approach as zen to compile
 * expressions into GL (but potentially other shader langauges like metal/webgpu)
 */

export type EmittedVariables = {
    [key: string]: boolean;
};

export type Error = string;

export type ChildContext = Context & {
    parentContext: Context
}

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
    initializeTextures: (x: WebGLRenderingContext, canvas: HTMLCanvasElement) => Texture | null;
    webGLProgram: WebGLProgram | null;
    uniforms: Uniform[];
    initializeUniforms: () => void;
    attributes: Attribute[];
    varyings: Varying[];
    textures: Texture[];
    siblingContext?: Context;
}

export enum GLType {
    Mat2,
    Mat3,
    Mat4,
    Bool,
    Float,
    Vec2,
    Vec3,
    Vec4,
    Sampler2D,
    Function
}

export const stringToType = (type: string): GLType => {
    if (type === "bool") {
        return GLType.Bool;
    } else if (type === "float") {
        return GLType.Float;
    } else if (type === "vec2") {
        return GLType.Vec2;
    } else if (type === "vec3") {
        return GLType.Vec3;
    } else if (type === "vec4") {
        return GLType.Vec4;
    } else if (type === "mat2") {
        return GLType.Mat2;
    } else if (type === "mat3") {
        return GLType.Mat3;
    } else if (type === "mat4") {
        return GLType.Mat4;
    } else {
        return GLType.Sampler2D;
    }
};

export const stringToTypeString = (type: string): string => {
    if (type === "float") {
        return "GLType.Float";
    } else if (type === "bool") {
        return "GLType.Bool";
    } else if (type === "vec2") {
        return "GLType.Vec2";
    } else if (type === "vec3") {
        return "GLType.Vec3";
    } else if (type === "vec4") {
        return "GLType.Vec4";
    } else if (type === "mat3") {
        return "GLType.Mat3";
    } else if (type === "mat4") {
        return "GLType.Mat4";
    } else if (type === "mat2") {
        return "GLType.Mat2";
    } else {
        return "GLType.Sampler2D";
    }
};

export interface UniformDefinition {
    type: GLType;
    name: string;
}

export interface Generated {
    code: string; /*  the code generated */
    variable?: string; /* the current variable */
    variables?: string[]; /* all variables */
    uniforms?: UniformDefinition[]; /* all uniforms */
    attributes?: AttributeDefinition[]; /* all uniforms */
    functions?: Generated[]; /* functions defined throughtout */
    functionArguments?: Argument[]; /* any arguments */
    loopAccumulators?: LoopAccumulator[];
    context?: Context;
    type: GLType;
}

export type Arg = number | UGen;
export type UGen = (context: Context) => Generated;
