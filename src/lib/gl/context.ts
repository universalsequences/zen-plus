import { GLType, Arg, UniformDefinition, Error, Generated, EmittedVariables, UGen, Context, ChildContext } from './types';
import { Varying } from './varying';
import { Attribute, emitAttributes } from './attributes';
import { emitFunctions, emitArguments } from './functions';
import { emitAccumulators } from './loop';
import { Uniform } from './uniforms';
import { Texture } from './texture';

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
    textures: Texture[];

    constructor(siblingContext?: Context) {
        this.idx = 0;
        this.siblingContext = siblingContext;
        this.emittedVariables = {};
        this.attributes = [];
        this.uniforms = [];
        this.varyings = [];
        this.errors = [];
        this.textures = [];
        this.webGLRenderingContext = null;
        this.webGLProgram = null;
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
            return "sampler2D";
        }
    }

    emitError(error: Error) {
        this.errors.push(error);
    }

    initializeTexture(gl: WebGLRenderingContext, webGLTexture: WebGLTexture, textureObj: Texture, interpolate: boolean) {
        let unit = textureObj.unit || 0;
        gl.activeTexture(gl.TEXTURE0 + unit); // Activate the texture unit
        gl.bindTexture(gl.TEXTURE_2D, webGLTexture);

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (interpolate) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }

        // Default texture format and type
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        gl.texImage2D(gl.TEXTURE_2D, 0, format, textureObj.width, textureObj.height, 0, format, type, textureObj.initialData);

    }

    /**
     * initializes all the textures and if any of them are a feedback texture,
     * we return it (otherwise return null)
     */
    initializeTextures(gl: WebGLRenderingContext, canvas: HTMLCanvasElement): Texture | null {
        let feedbackTexture: Texture | null = null;
        let unitCounter = 0;
        for (let i = 0; i < this.textures.length; i++) {
            let textureObj = this.textures[i];
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            // Assign a texture unit based on the index
            if (textureObj.feedback) {
                let textures = [];
                let frameBuffers = [];
                let units = [];
                textureObj.width = canvas.width;
                textureObj.height = canvas.height;
                textureObj.initialData = null;

                // feedback textures contain 2 texture+framebuffer pairs
                for (let i = 0; i < 2; i++) {
                    const fbTexture = gl.createTexture();
                    const framebuffer = gl.createFramebuffer();
                    if (!framebuffer || !fbTexture) {
                        // todo: emit error
                        return null;
                    }

                    let unit = unitCounter;
                    units[i] = unit;
                    unitCounter++;
                    this.initializeTexture(gl, fbTexture, textureObj, false);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTexture, 0);


                    // Store the framebuffer and texture
                    frameBuffers[i] = framebuffer;
                    textures[i] = fbTexture;

                    gl.bindTexture(gl.TEXTURE_2D, null);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                }
                textureObj.frameBuffers = frameBuffers;
                textureObj.textures = textures;
                textureObj.units = units;
                textureObj.currentFrameBuffer = 0;
                feedbackTexture = textureObj;
            } else {
                // non-feedback texture initialization

                const webGLTexture = gl.createTexture();
                if (!webGLTexture) {
                    continue;
                }
                textureObj.unit = unitCounter;
                unitCounter++;

                textureObj.texture = webGLTexture;

                this.initializeTexture(gl, webGLTexture, textureObj, false);
            }

            // Update texture object
            const format = gl.RGBA;
            const type = gl.UNSIGNED_BYTE;
            textureObj.format = format;
            textureObj.type = type;
            textureObj.initialized = true;
            textureObj.parameters = {
                [gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
                [gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
                [gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
                [gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
            };
        }

        return feedbackTexture;
    }

    initializeUniforms() {
        for (let uni of this.uniforms) {
            uni.set!();
        }
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
            loopAccumulators: emitAccumulators(...args),
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

