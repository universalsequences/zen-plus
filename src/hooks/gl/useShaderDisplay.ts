import { MutableRefObject, useRef, useEffect, useState } from 'react';

type ShaderDisplayProps = {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    fragmentShaderSrc: string;
    width: number;
    height: number;
};

interface Buffers {
    position: WebGLBuffer | null
};

const useShaderDisplay = ({ width, height, canvasRef, fragmentShaderSrc }: ShaderDisplayProps) => {
    let glRef = useRef<WebGLRenderingContext | null>(null);
    let programInfoRef = useRef<any | null>(null);
    let buffersRef = useRef<Buffers | null>(null);
    let [webGLProgram, setWebGLProgram] = useState<WebGLProgram | null>(null);
    let [webGLRenderingContext, setWebGLRenderingContext] = useState<WebGLRenderingContext | null>(null);

    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
        }
    }, [width, height]);

    useEffect(() => {
        if (!canvasRef.current) return;

        canvasRef.current.width = width;
        canvasRef.current.height = height;
        const gl = canvasRef.current.getContext('webgl');
        glRef.current = gl;
        if (!gl) {
            console.error('Unable to initialize WebGL. Your browser may not support it.');
            return;
        }

        const vsSource = `
      attribute vec4 aVertexPosition;
      void main() {
        gl_Position = aVertexPosition;
      }
    `;

        const shaderProgram = initShaderProgram(gl, vsSource, fragmentShaderSrc);
        if (!shaderProgram) return;

        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                resolution: gl.getUniformLocation(shaderProgram, 'resolution'),
            },
        };

        programInfoRef.current = programInfo;

        const buffers = initBuffers(gl);
        buffersRef.current = buffers;
        drawScene(glRef, programInfoRef, buffersRef, canvasRef.current);
        setWebGLRenderingContext(gl);
        setWebGLProgram(shaderProgram);
    }, [canvasRef, fragmentShaderSrc, setWebGLRenderingContext, setWebGLProgram]);

    useEffect(() => {
        if (webGLRenderingContext && webGLProgram) {
            let resolution = webGLRenderingContext.getUniformLocation(webGLProgram, 'resolution');
            webGLRenderingContext.uniform2f(resolution, width / 2.0, height / 2.0);
            webGLRenderingContext.viewport(0, 0, width, height);

        }
    }, [width, height, webGLRenderingContext, webGLProgram]);

    return { webGLProgram, webGLRenderingContext };
};

const initBuffers = (gl: WebGLRenderingContext): { position: WebGLBuffer | null } => {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
        1.0, 1.0,
        -1.0, 1.0,
        1.0, -1.0,
        -1.0, -1.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
};

const drawScene = (glRef: MutableRefObject<WebGLRenderingContext | null>, programInfoRef: MutableRefObject<any | null>, buffersRef: MutableRefObject<Buffers | null>, canvas: HTMLCanvasElement) => {
    let gl = glRef.current;
    let programInfo = programInfoRef.current;
    let buffers = buffersRef.current;

    if (!gl || !programInfo || !buffers) {
        requestAnimationFrame(
            () => drawScene(glRef, programInfoRef, buffersRef, canvas))
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(programInfo.program);


    if (buffers.position) {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);

    requestAnimationFrame(
        () => drawScene(glRef, programInfoRef, buffersRef, canvas))
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
        gl.deleteShader(shader);
        return null;
    }

    return shader;
};

export default useShaderDisplay;
