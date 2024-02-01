const simpleVertex = `
// Vertex shader for rendering a full-screen quad
attribute vec2 aPosition;
varying vec2 vTexCoord;

void main() {
    vTexCoord = aPosition * 0.5 + 0.5; // Map from [-1, 1] to [0, 1]
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const simpleFragment = `
// Fragment shader for sampling the texture
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vTexCoord;

void main() {
    gl_FragColor = texture2D(uTexture, vTexCoord);
}
`;


export function initializeScreenQuadProgram(gl: WebGLRenderingContext) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, simpleVertex);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, simpleFragment);
    if (!vertexShader || !fragmentShader) {
        return null;
    }
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
        return null;
    }

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const textureLocation = gl.getUniformLocation(program, "uTexture");

    // Create a buffer for the quad's vertices.
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // An array of vertices to cover the entire screen in normalized device coordinates (NDC).
    const vertices = [
        -1.0, -1.0, // bottom left
        1.0, -1.0,  // bottom right
        -1.0, 1.0, // top left
        1.0, 1.0,  // top right
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    return {
        program,
        positionLocation,
        textureLocation,
        positionBuffer
    };
}


function createShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) {
        return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    // Check for compilation errors...
    return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    const program = gl.createProgram();
    if (!program) {
        return null;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    // Check for linking errors...
    return program;
}
