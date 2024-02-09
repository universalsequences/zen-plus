import { Generated, UGen, Context, UniformDefinition } from './types';
import { initializeScreenQuadProgram } from './simple';
import { Texture } from './texture';
import { generateShader } from './shader';
import { vec4, unpack, vector } from './coordinates';
import { Varying } from './varying';
import { GLType } from './types';
import { attribute, AttributeData, AttributeDefinition } from './attributes';
import { ContextImpl } from './context';

export interface RenderJob {
    binds?: (() => void)[];
    fragment: string;
    vertex: string;
    fragmentContext: Context;
    vertexContext: Context;
    vertexCount?: number;
    instanceCount?: number;
    indices?: number[];
    indexBuffer?: WebGLBuffer;
    program?: WebGLProgram;
    drawType: DrawType;
    buffers?: WebGLBuffer[];
}

/** executes the code graphs and returns the resulting contexts and shader codes */
export const zen = (fragment: UGen, vertex?: UGen, drawType: DrawType = DrawType.TRIANGLE_STRIP): RenderJob => {
    if (!vertex) {
        /** default vertex shader (w/ DrawType.TRIANGLE_STIP) */
        const _aVertexPosition = attribute(GLType.Vec3, [
            1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            -1.0, -1.0,
        ], 2);
        const aVertexPosition = vector(_aVertexPosition());
        vertex = vec4(aVertexPosition.x, aVertexPosition.y, aVertexPosition.z, 1);


    }
    let vertexContext: Context = new ContextImpl();
    let fragContext: Context = new ContextImpl(vertexContext);

    // first we execute the vertex shader (so that attributes that are referenced
    // in the fragment shader get executed)
    let out2: Generated = vertexContext.gen(vertex);

    // then execute the fragment shader
    let out1: Generated = fragContext.gen(fragment);
    let shaderCode = generateShader(out1, fragContext, "gl_FragColor");
    let vertexCode = generateShader(out2, vertexContext, "gl_Position", fragContext.varyings);

    return {
        drawType,
        fragment: shaderCode,
        vertex: vertexCode,
        fragmentContext: fragContext,
        vertexContext: vertexContext,
    };
};

export type ZenRenderFunction = (width: number, height: number) => void;

// returns a function that triggers a render....
// given a canvas and graph, it latches onto the canvas and returns a render fn
// this will make it super easy for onchain shit to work-- we simply call the renderer

export const mount = (renderJobs: RenderJob[], canvas: HTMLCanvasElement): ZenRenderFunction | null => {
    console.log('mounting =', renderJobs);
    // first we attach to it...
    const gl: WebGLRenderingContext | null = canvas.getContext('webgl', { preserveDrawingBuffer: true });

    if (!gl) {
        console.error('Unable to initialize WebGL. Your browser may not support it.');
        return null;
    }

    const ext = gl.getExtension('ANGLE_instanced_arrays');
    if (!ext) {
        console.error('Your browser does not support ANGLE_instanced_arrays');
        return null;
    }

    let _width = 0;
    let _height = 0;

    let programs: ShaderProgram[] = [];
    let feedbackTexture: Texture | null = null;
    for (let renderJob of renderJobs) {
        const shaderProgram = initShaderProgram(gl, renderJob.vertex, renderJob.fragment);
        if (!shaderProgram) return null;
        let program = shaderProgram.program;
        programs.push(shaderProgram);

        renderJob.fragmentContext.webGLProgram = program;
        renderJob.fragmentContext.webGLRenderingContext = gl;

        renderJob.vertexContext.webGLProgram = program;
        renderJob.vertexContext.webGLRenderingContext = gl;

        gl.useProgram(program);

        feedbackTexture = renderJob.fragmentContext.initializeTextures(gl, canvas);
        renderJob.fragmentContext.initializeUniforms();

        // lets go through the vertexContext to see what attributes we need to set up 
        let vertexCount = 0;
        let instanceCount = 0;

        renderJob.buffers = [];
        renderJob.binds = [];

        for (let attribute of renderJob.vertexContext.attributes) {
            let buffer = gl.createBuffer();
            if (buffer) {
                renderJob.buffers.push(buffer);
                let def: AttributeDefinition = attribute.get!();

                def.buffer = buffer;

                renderJob.binds.push(() => {
                    let location = gl.getAttribLocation(program, def.name);
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    gl.vertexAttribPointer(location, def.size, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(location);
                    if (def.isInstance) {
                        let location = gl.getAttribLocation(program, def.name);
                        ext.vertexAttribDivisorANGLE(location, 1); // Set divisor for instanced attributes
                    } else {
                        let location = gl.getAttribLocation(program, def.name);
                        ext.vertexAttribDivisorANGLE(location, 0); // Set divisor for instanced attributes
                    }
                });

                // Calculate counts based on whether the attribute is instanced
                if (def.isInstance) {
                    let _instanceCount = def.data.length / def.size;
                    if (instanceCount < _instanceCount) {
                        instanceCount = _instanceCount;
                    }
                } else {
                    let _vertexCount = def.data.length / def.size;
                    if (vertexCount < _vertexCount) {
                        vertexCount = _vertexCount;
                    }
                }

                attribute.set!(def.data);
            }
        }

        if (renderJob.indices) {
            let indexBuffer = gl.createBuffer();
            if (indexBuffer === null) {
                return null;
            }
            renderJob.indexBuffer = indexBuffer;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(renderJob.indices), gl.STATIC_DRAW);
        }

        renderJob.instanceCount = instanceCount;
        renderJob.vertexCount = vertexCount;
        renderJob.program = program;
    }

    //gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let quadProgram = feedbackTexture ? initializeScreenQuadProgram(gl) : null;
    // this function returned is a render function
    return (width: number | "dispose", height: number) => {
        if (width === "dispose") {
            for (let shaderProgram of programs) {
                for (let renderJob of renderJobs) {
                    if (renderJob.program) {
                        gl.detachShader(renderJob.program, shaderProgram.vertexShader);
                        gl.detachShader(renderJob.program, shaderProgram.fragmentShader);
                        gl.deleteProgram(renderJob.program);
                    }
                    for (let texture of renderJob.fragmentContext.textures) {
                        if (texture.texture) {
                            gl.deleteTexture(texture.texture);
                        } else if (texture.textures) {
                            texture.textures.forEach(x => gl.deleteTexture(x));
                        }
                        if (texture.frameBuffers) {
                            texture.frameBuffers.forEach(
                                frameBuffer => gl.deleteFramebuffer(frameBuffer));
                        }
                    }
                }
            }
            return;
        }
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        let needsUpdate = false;
        if (width !== _width || height !== _height) {
            needsUpdate = true;
        }

        for (let renderJob of renderJobs) {
            if (renderJob.program) {
                gl.useProgram(renderJob.program);

                if (needsUpdate) {
                    for (let renderJob of renderJobs) {
                        if (renderJob.program) {
                            let resolution = gl.getUniformLocation(renderJob.program, "resolution");
                            gl.uniform2f(resolution, width / 2.0, height / 2.0);
                        }
                    }
                    gl.viewport(0, 0, width, height);
                    canvas.width = width;
                    canvas.height = height;
                    _width = width;
                    _height = height;
                    if (feedbackTexture && feedbackTexture.textures) {
                        feedbackTexture.textures.forEach(tex => {
                            gl.bindTexture(gl.TEXTURE_2D, tex);
                            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                            // Set any texture parameters here if needed
                        });
                    }
                }


                if (feedbackTexture && feedbackTexture.frameBuffers && feedbackTexture.textures && feedbackTexture.currentFrameBuffer !== undefined && feedbackTexture.units && feedbackTexture.uniformName) {
                    // then we need to get the correct texture
                    /*
                    let current = feedbackTexture.currentFrameBuffer;
                    let frameBuffer = feedbackTexture.frameBuffers[current];
                    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

                    // finally SWAP buffers
                    feedbackTexture.currentFrameBuffer = 1 - feedbackTexture.currentFrameBuffer;

                    let sourceTextureUnit = feedbackTexture.units[current];

                    let textureLocation = gl.getUniformLocation(renderJob.program, feedbackTexture.uniformName);
                    gl.uniform1i(textureLocation, sourceTextureUnit);

                    gl.activeTexture(gl.TEXTURE0 + sourceTextureUnit);

                    // bind the "other" texture
                    gl.bindTexture(gl.TEXTURE_2D, feedbackTexture.textures[1 - current]);
                    */
                    let current = feedbackTexture.currentFrameBuffer;
                    let frameBuffer = feedbackTexture.frameBuffers[current];
                    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

                    // Bind the texture for reading (the "other" texture)
                    let sourceTextureUnit = feedbackTexture.units[1 - current];
                    gl.activeTexture(gl.TEXTURE0 + sourceTextureUnit);
                    gl.bindTexture(gl.TEXTURE_2D, feedbackTexture.textures[1 - current]);

                    // Update the shader's texture uniform
                    let textureLocation = gl.getUniformLocation(renderJob.program, feedbackTexture.uniformName);
                    gl.uniform1i(textureLocation, sourceTextureUnit);
                }

                if (renderJob.binds) {
                    renderJob.binds.forEach(x => x());
                }

                const offset = 0;
                let glDrawType = getDrawType(gl, renderJob.drawType);
                if (renderJob.instanceCount! > 0) {
                    ext.drawArraysInstancedANGLE(glDrawType, 0, renderJob.vertexCount!, renderJob.instanceCount!); // 4 is the number of vertices for the quad
                } else if (renderJob.indexBuffer && renderJob.indices) {
                    // When drawing
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderJob.indexBuffer);
                    gl.drawElements(glDrawType, renderJob.indices.length, gl.UNSIGNED_SHORT, 0);
                } else {
                    gl.drawArrays(glDrawType, offset, renderJob.vertexCount!);
                }

                // we've rendered it, however for the feedback case, we need to then render
                // to screen
                if (feedbackTexture && feedbackTexture.frameBuffers && feedbackTexture.textures && feedbackTexture.currentFrameBuffer !== undefined && feedbackTexture.units && feedbackTexture.uniformName && quadProgram) {
                    let program = quadProgram.program;
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Bind the default framebuffer for screen rendering
                    gl.useProgram(program);

                    gl.clearColor(0.0, 0.0, 0.0, 1.0);
                    gl.clearDepth(1.0);
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


                    let current = feedbackTexture.currentFrameBuffer;
                    // Activate and bind the texture for sampling
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, feedbackTexture.textures[current]);
                    let uLocation = quadProgram.textureLocation;
                    gl.uniform1i(uLocation, 0);

                    // finally renderer the quad
                    gl.bindBuffer(gl.ARRAY_BUFFER, quadProgram.positionBuffer);
                    gl.vertexAttribPointer(quadProgram.positionLocation, 2, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(quadProgram.positionLocation);

                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); // 4 vertices for the full-screen quad
                    feedbackTexture.currentFrameBuffer = 1 - feedbackTexture.currentFrameBuffer;

                }
            }
        }
    };
};

interface ShaderProgram {
    vertexShader: WebGLShader;
    fragmentShader: WebGLShader;
    program: WebGLProgram;
}
const initShaderProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string): ShaderProgram | null => {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) {
        return null;
    }

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) {
        return null;
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        return null;
    }

    return {
        program: shaderProgram,
        vertexShader,
        fragmentShader
    };
};

const loadShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) {
        return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

export enum DrawType {
    TRIANGLES,
    TRIANGLE_STRIP,
    TRIANGLE_FAN,
    LINE_LOOP,
    LINE_STRIP,
    LINES,
}

const getDrawType = (gl: WebGLRenderingContext, drawType: DrawType): number => {
    switch (drawType) {
        case DrawType.TRIANGLE_STRIP:
            return gl.TRIANGLE_STRIP;
        case DrawType.TRIANGLE_FAN:
            return gl.TRIANGLE_FAN;
        case DrawType.TRIANGLE_STRIP:
            return gl.TRIANGLE_STRIP;
        case DrawType.LINES:
            return gl.LINES;
        case DrawType.LINE_LOOP:
            return gl.LINE_LOOP;
        case DrawType.LINE_STRIP:
            return gl.LINE_STRIP;
        default:
            return gl.TRIANGLES;
    }
};
