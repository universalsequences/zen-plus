import { Uniform } from './uniforms';
import { memo } from './memo';
import { UGen, GLType, Generated, Context, Arg } from './types';

export interface Texture {
    uniformName?: string;
    texture?: WebGLTexture;
    textures?: WebGLTexture[];
    units?: number[];
    unit?: number;
    width: number;
    height: number;
    format?: number; // e.g., gl.RGBA
    type?: number; // e.g., gl.UNSIGNED_BYTE
    initialized: boolean;
    parameters?: { [key: number]: number }; // e.g., { gl.TEXTURE_WRAP_S: gl.CLAMP_TO_EDGE }
    initialData: Uint8Array | null;
    frameBuffers?: WebGLFramebuffer[];
    feedback?: boolean;
    currentFrameBuffer?: number;
}

/**
 * samples a texture at a given coordinate
 */
export const texture2D = (texUniform: Arg, coordinate: Arg) => {
    return memo((context: Context): Generated => {
        let _texture = context.gen(texUniform);
        let _coord = context.gen(coordinate);
        let [texSample] = context.useVariables("texSample");
        let code = `
vec4 ${texSample} = texture2D(${_texture.variable}, ${_coord.variable});
`;
        return context.emit(
            GLType.Vec4,
            code,
            texSample,
            _texture,
            _coord);
    });
};

