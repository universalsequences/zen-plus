import { API } from '@/lib/nodes/context';
import { Uniform } from '@/lib/gl/uniforms';
import { doc } from './doc';
import { CompoundOperator, Statement } from '@/lib/nodes/definitions/zen/types'
import { ObjectNode, Message, Lazy } from '@/lib/nodes/types'
import * as gl from '@/lib/gl/index';
import { compileStatement } from '@/lib/nodes/definitions/gl/AST';

doc(
    '+',
    {
        inletNames: ['num1', 'num2'],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "adds two numbers in GL",
        fn: gl.add
    });

doc(
    '-',
    {
        inletNames: ['num1', 'num2'],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "subtracts two numbers in GL",
        fn: gl.sub
    });

doc(
    '*',
    {
        inletNames: ['num1', 'num2'],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "multiplies two numbers in GL",
        fn: gl.mult
    });

doc(
    '/',
    {
        inletNames: ['num1', 'num2'],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "divides two numbers in GL",
        fn: gl.div
    });

doc(
    '%',
    {
        inletNames: ['num1', 'num2'],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "takes modulo of two numbers in GL",
        fn: gl.mod
    });

doc(
    'dot',
    {
        inletNames: ['num1', 'num2'],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "takes dot product of two vectors in GL",
        fn: gl.mod
    });

doc(
    'pow',
    {
        inletNames: ['num1', 'num2'],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "takes power of two numbers in GL",
        fn: gl.pow
    });

doc(
    'length',
    {
        inletNames: ['num1'],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "takes length of vector in GL",
        fn: gl.length
    });


doc(
    'uv',
    {
        numberOfInlets: 0,
        numberOfOutlets: 1,
        description: "create uv",
        fn: gl.uv
    });

doc(
    'x',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "create uv",
        fn: gl.unpack("x")
    });

doc(
    'y',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "create uv",
        fn: gl.unpack("y")
    });

doc(
    'sin',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "computes the sin of input",
        fn: gl.sin
    });

doc(
    'cos',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "computes the cos of input",
        fn: gl.cos
    });

doc(
    'floor',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "computes the floor of input",
        fn: gl.floor
    });

doc(
    'ceil',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "computes the ceil of input",
        fn: gl.ceil
    });

doc(
    'vec4',
    {
        numberOfInlets: 4,
        numberOfOutlets: 1,
        description: "creates a vec4 gl object",
        fn: gl.vec4
    });

doc(
    'vec3',
    {
        numberOfInlets: 3,
        numberOfOutlets: 1,
        description: "creates a vec3 gl object",
        fn: gl.vec3
    });

doc(
    'smoothstep',
    {
        numberOfInlets: 3,
        numberOfOutlets: 1,
        description: "calculates a smoothstep of 3 numbers",
        fn: gl.smoothstep
    });

doc(
    'step',
    {
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "calculates a step of 2 numbers",
        fn: gl.step
    });


doc(
    'vec2',
    {
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "creates a vec2 gl object",
        fn: gl.vec2
    });


doc(
    "uniform",
    {
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "uniform",
    }
)

export const gl_uniform = (node: ObjectNode, name: Lazy) => {
    node.needsLoad = true;
    let uniform: Uniform;
    return (message: Message) => {
        if (!uniform) {
            uniform = gl.uniform(gl.GLType.Float, 0);
            console.log('created uniform', uniform);
        }


        if (typeof message === "string" && message !== "bang" && message.split(" ").length === 2) {
            let split = message.split(" ");
            message = parseFloat(split[1]);
        }

        if (typeof message === "number") {
            uniform.set!(message as number);
            return [];
        }
        let operator: CompoundOperator = {
            name: "uniform",
            uniform
        };
        let statement: Statement = [operator];
        statement.node = node;
        return [statement];
    };
};


doc(
    "canvas",
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "canvas",
    }
)

export const gl_canvas = (objectNode: ObjectNode) => {
    return (message: Message) => {
        let statement = message as Statement;
        // compile the statement
        let compiled = compileStatement(statement);
        let generated = gl.zen(compiled);

        if (objectNode.patch.onNewMessage) {
            objectNode.patch.onNewMessage(objectNode.id, generated);
        }
        return [];
    };
};
export const api: API = {
    canvas: gl_canvas,
    uniform: gl_uniform
};


