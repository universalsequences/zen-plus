import { ChildContext, UniformDefinition, UGen, Context, Generated, GLType } from './types';
import { Texture } from './texture';
import { memo } from './memo';

/**
 * handle uniforms similar to params in zen (audio)
 *
 * let u = uniform(GLType.Float, 4); // initializes it w 4
 * subsequently can use it in expressiosn like:
 * mix(color1, color2, u()) // mix 2 colors based on uniform
 * and we can programmatically "set the value" via
 * u.set(1)
 *
 * Furthermore, can utilize textures by setting type to Sampler2D
 * and passing it arrays of numbers
 * 
 */

export type Data = number | number[] | Float32Array;
export type Uniform = (() => UGen) & {
    set?: (v?: Data) => void,
    isTexture?: () => boolean
    getWidth?: () => number | undefined;
    getHeight?: () => number | undefined;
}

export const uniform = (type: GLType, val: Data, width?: number, height?: number, isFeedback?: boolean): Uniform => {
    let contexts: Context[] = [];
    let uniformDefinition: UniformDefinition;
    let lastValue: Data = val;
    let id = "_" + Math.floor(100000 * Math.random());
    let texture: Texture;

    // create a Texture object
    // and pass it off to context/generated
    // initial "render" will initilaize the textures and set the fields within this one to that
    // then subsequent "set" calls will utilize these fields
    let _uniform: Uniform = (): UGen => {
        return memo((context: Context): Generated => {
            let _context = context;
            while ((_context as ChildContext).parentContext) {
                _context = (_context as ChildContext).parentContext;
            }
            let [uniformName] = context.useVariables("uniform" + id);
            if (uniformDefinition) {
                uniformName = uniformDefinition.name;
            }
            uniformDefinition = {
                name: uniformName,
                type
            };
            contexts.push(_context);

            let generated: Generated = context.emit(
                type, "", uniformName);
            if (!generated.uniforms) {
                generated.uniforms = [];
            }
            generated.uniforms.push(uniformDefinition);
            context.uniforms.push(_uniform);

            if (type === GLType.Sampler2D) {
                // then we have a texture so lets create one
                texture = {
                    initialized: false,
                    width: width || 1,
                    height: height || 1,
                    initialData: Array.isArray(val) ? new Uint8Array(val) : null,
                    feedback: isFeedback,
                    uniformName: isFeedback ? uniformName : undefined
                };
                context.textures.push(texture);
                if ((context as ChildContext).parentContext) {
                    (context as ChildContext).parentContext.textures.push(texture);
                }
            }
            if ((context as ChildContext).parentContext) {
                (context as ChildContext).parentContext.uniforms.push(_uniform);
            }
            return generated;
        });
    };

    _uniform.set = (v: Data = lastValue) => {

        // keep track of last value set...
        lastValue = v;

        if (texture && uniformDefinition) {
            if (!Array.isArray(v) && !ArrayBuffer.isView(v)) {
                return;
            }
            for (let context of contexts) {
                let gl = context.webGLRenderingContext;
                let program = context.webGLProgram;
                if (!gl || !program) {
                    continue;
                }
                if (texture.unit !== undefined && texture.texture) {
                    let _texture = texture.texture;
                    let format = texture.format || gl.RGBA;
                    let type = texture.type || gl.UNSIGNED_BYTE;

                    gl.useProgram(program);

                    // activate & bind the texture
                    gl.activeTexture(gl.TEXTURE0 + texture.unit);
                    gl.bindTexture(gl.TEXTURE_2D, _texture);

                    // pass the data to the texture
                    let buf = ArrayBuffer.isView(v) ? v : new Uint8Array(v);
                    gl.texImage2D(gl.TEXTURE_2D, 0, format, texture.width, texture.height, 0, format, type, buf);

                    let uLocation = gl.getUniformLocation(program, uniformDefinition.name);
                    gl.uniform1i(uLocation, texture.unit);
                }

            }
        } else if (uniformDefinition) {
            // todo: utilize context (once compiled) to send data to shader via uniforms
            for (let context of contexts) {
                let gl = context.webGLRenderingContext;
                let program = context.webGLProgram;
                if (gl && program) {
                    let uLocation = gl.getUniformLocation(program, uniformDefinition.name);
                    gl.useProgram(program);
                    gl.uniform1f(uLocation, v as number);
                }
            }
        }
    };

    _uniform.isTexture = () => {
        return texture !== undefined;
    };

    _uniform.getWidth = () => {
        return width;
    };

    _uniform.getHeight = () => {
        return height;
    };



    return _uniform;
}
