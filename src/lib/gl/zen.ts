import { Generated, UGen, Context, UniformDefinition } from './types';
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

    for (let renderJob of renderJobs) {
        const program = initShaderProgram(gl, renderJob.vertex, renderJob.fragment);
        if (!program) return null;


        renderJob.fragmentContext.webGLProgram = program;
        renderJob.fragmentContext.webGLRenderingContext = gl;

        renderJob.vertexContext.webGLProgram = program;
        renderJob.vertexContext.webGLRenderingContext = gl;

        gl.useProgram(program);

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

                //                renderJob.bind();

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

    // this function returned is a render function
    return (width: number, height: number) => {
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
            }
        }
    };
};

const initShaderProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null => {
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

    return shaderProgram;
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
