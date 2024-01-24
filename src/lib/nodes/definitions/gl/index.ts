import { API } from '@/lib/nodes/context';
import { attribute, Attribute, AttributeGen } from '@/lib/gl/attributes';
import { printCode } from './printCode';
import { FunctionSignature, DataType, MessageType, functionType, maxCompatibleType, equalArguments, strictGLType, GLTypeCheck } from '@/lib/nodes/typechecker';
import { stringToType, GLType, UGen, Arg } from '@/lib/gl/types';
import { Uniform } from '@/lib/gl/uniforms';
import { Definition } from '@/lib/docs/docs';
import * as DOC from './doc';
import { Operator, CompoundOperator, Statement } from '@/lib/nodes/definitions/zen/types'
import { ObjectNode, Message, Lazy } from '@/lib/nodes/types'
import * as gl from '@/lib/gl/index';
import { registerFunction, compileStatement } from '@/lib/nodes/definitions/gl/AST';

export const doc = (name: string, definition: Definition, registerName: string = name) => {
    DOC.doc(name, definition);
    if (definition.fn) {
        registerFunction(registerName, definition.fn);
    }
}

const typed_op = (name: string, numberOfInlets: number, fn: (...args: Arg[]) => UGen, typeChecker: GLTypeCheck, fnString?: string) => {
    doc(
        name,
        {
            numberOfInlets,
            numberOfOutlets: 1,
            description: `${name} ${numberOfInlets} GLSL expressions together`,
            fn,
            fnString,
            glTypeChecker: typeChecker
        })
};

const conditional_op = (name: string, fn: (...args: Arg[]) => UGen, fnString: string) =>
    typed_op(name, 2, fn, equalArguments(DataType.GL(GLType.Bool), [DataType.GL(GLType.Float), DataType.GL(GLType.Vec2), DataType.GL(GLType.Vec3), DataType.GL(GLType.Vec4)]), fnString);


const flexible_op = (name: string, numberOfInlets: number, fn: (...args: Arg[]) => UGen, fnString?: string) =>
    typed_op(name, numberOfInlets, fn, maxCompatibleType(null, [DataType.GL(GLType.Float), DataType.GL(GLType.Vec2), DataType.GL(GLType.Vec3), DataType.GL(GLType.Vec4)]), fnString);


const strict_vec_op = (name: string, numberOfInlets: number, fn: (...args: Arg[]) => UGen, outputType: GLType, fnString?: string) =>
    typed_op(name, numberOfInlets, fn,
        strictGLType(
            DataType.GL(outputType),
            [DataType.GL(GLType.Vec2), DataType.GL(GLType.Vec3), DataType.GL(GLType.Vec4)],
            [DataType.GL(GLType.Vec2), DataType.GL(GLType.Vec3), DataType.GL(GLType.Vec4)],
            [DataType.GL(GLType.Vec2), DataType.GL(GLType.Vec3), DataType.GL(GLType.Vec4)
            ]),
        fnString
    );



const strict_float_op = (name: string, numberOfInlets: number, fn: (...args: Arg[]) => UGen, outputType: GLType) =>
    typed_op(name, numberOfInlets, fn,
        strictGLType(
            DataType.GL(outputType),
            [DataType.GL(GLType.Float)],
            [DataType.GL(GLType.Float)],
            [DataType.GL(GLType.Float)],
            [DataType.GL(GLType.Float)]));

conditional_op("<", gl.lt, "lt");
conditional_op("==", gl.eq, "eq");
conditional_op(">", gl.gt, "gt");
conditional_op(">=", gl.gte, "gte");
conditional_op("<=", gl.lte, "lte");

flexible_op("+", 2, gl.add, "add");
flexible_op('-', 2, gl.sub, "sub");
flexible_op('*', 2, gl.mult, "mult");
flexible_op('/', 2, gl.div, "div");
flexible_op('%', 2, gl.mod, "mod");
strict_vec_op('dot', 2, gl.dot, GLType.Float);
flexible_op('pow', 2, gl.pow);
strict_vec_op('length', 1, gl.length, GLType.Float);
strict_vec_op('uv', 0, gl.uv, GLType.Vec2);
strict_vec_op('x', 1, gl.unpack("x"), GLType.Float, `unpack("x")`);
strict_vec_op('y', 1, gl.unpack("y"), GLType.Float, `unpack("y")`);
strict_vec_op('z', 1, gl.unpack("z"), GLType.Float, `unpack("z")`);
strict_vec_op('xy', 1, gl.unpack("xy"), GLType.Vec2, `unpack("xy")`);
strict_vec_op('xyz', 1, gl.unpack("xyz"), GLType.Vec3, `unpack("xyz")`);
strict_vec_op('xyy', 1, gl.unpack("xyy"), GLType.Vec3, `unpack("xyy")`);
strict_vec_op('yyx', 1, gl.unpack("yyx"), GLType.Vec3, `unpack("yyx")`);
strict_vec_op('yxy', 1, gl.unpack("yxy"), GLType.Vec3, `unpack("yxy")`);
strict_vec_op('xxx', 1, gl.unpack("xxx"), GLType.Vec3, `unpack("xxx")`);
flexible_op('normalize', 1, gl.normalize);
flexible_op('sin', 1, gl.sin);
flexible_op('cos', 1, gl.cos);
flexible_op('floor', 1, gl.floor);
flexible_op('abs', 1, gl.abs);
flexible_op('sqrt', 1, gl.sqrt);
flexible_op('max', 2, gl.max);
flexible_op('min', 2, gl.min);
flexible_op('exp', 1, gl.exp);
flexible_op('exp2', 1, gl.exp2);
flexible_op('sign', 1, gl.sign);
flexible_op('tan', 1, gl.tan);
flexible_op('ceil', 1, gl.ceil);
strict_float_op('vec4', 4, gl.vec4, GLType.Vec4);
strict_float_op('vec3', 3, gl.vec3, GLType.Vec3);
strict_float_op('vec2', 2, gl.vec2, GLType.Vec2);
flexible_op('smoothstep', 3, gl.smoothstep);
flexible_op('mix', 3, gl.mix);
flexible_op('step', 2, gl.step);
strict_float_op('perspectiveMatrix', 4, gl.perspectiveMatrix, GLType.Mat4);
strict_vec_op('cameraMatrix', 3, gl.viewMatrix, GLType.Mat4);

doc(
    "sumLoop",
    {
        numberOfInlets: 3,
        inletNames: ["body", "iterations", "initialVal"],
        numberOfOutlets: 1,
        description: "iterates on body summing the result",
        fn: gl.sumLoop,
    });

export const sumLoop = (node: ObjectNode, iterations: Lazy, initialVal: Lazy) => {
    return (body: Message) => {
        if ((body as Statement).type !== (initialVal() as Statement).type) {
            // type error
        }
        let statement: Statement = ["sumLoop" as Operator, body as Statement, iterations() as Statement, initialVal() as Statement];
        statement.node = node;
        statement.type = (body as Statement).type;
        return [statement];
    };
};

doc(
    "breakIf",
    {
        numberOfInlets: 2,
        inletNames: ["condition", "else"],
        numberOfOutlets: 1,
        description: "breaks out of loop if condition is met, otherwise returns the else",
        fn: gl.breakIf,
    });

export const breakIf = (node: ObjectNode, elseStatement: Lazy) => {
    return (condition: Message) => {
        /*
        if ((body as Statement).type !== (initialVal() as Statement).type) {
            // type error
        }
        */

        let statement: Statement = ["breakIf" as Operator, condition as Statement, elseStatement() as Statement];
        statement.node = node;
        statement.type = (elseStatement() as Statement).type;
        return [statement];
    };
};


doc(
    "switch",
    {
        numberOfInlets: 3,
        inletNames: ["cond", "then", "else"],
        numberOfOutlets: 1,
        description: "conditional switch statement",
        fn: gl.zswitch,
    },
    "zswitch");

export const zswitch = (node: ObjectNode, thenStatement: Lazy, elseStatement: Lazy) => {
    return (condition: Message): Statement[] => {
        //if ((body as Statement).type !== (initialVal() as Statement).type) {
        //    // type error
        //}
        let statement: Statement = ["zswitch" as Operator, condition as Statement, thenStatement() as Statement, elseStatement() as Statement];
        statement.node = node;
        statement.type = (thenStatement() as Statement).type;
        return [statement];
    };
};

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
            let defaultValue = node.storedMessage === undefined ?
                node.attributes["min"] as number || 0 : node.storedMessage as number;
            uniform = gl.uniform(gl.GLType.Float, defaultValue);
        }

        if (typeof message === "string" && message !== "bang" && message.split(" ").length === 2) {
            let split = message.split(" ");
            message = parseFloat(split[1]);
        }

        if (typeof message === "number") {
            uniform.set!(message as number);
            node.storedMessage = message;
            return [];
        }
        let operator: CompoundOperator = {
            name: "uniform",
            uniform
        };
        let statement: Statement = [operator];
        statement.node = node;
        statement.type = DataType.GL(GLType.Float);
        return [statement];
    };
};

doc(
    'defun',
    {
        inletNames: ["body", "name"],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "creates a function",
    });

export const defun = (node: ObjectNode, name: Lazy) => {
    return (body: Message) => {

        let statement: Statement = ["defun" as Operator, body as Statement, name() as Statement];
        statement.node = node;
        let args: Statement[] = parseArguments(body as Statement);
        args.sort((a, b) => (Array.isArray(a) && Array.isArray(b)) ? (a[0]! as CompoundOperator).value! - (b[0] as CompoundOperator).value! : 0);

        let nodes = new Set<ObjectNode>();
        let _args: Statement[] = []
        for (let s of args) {
            if (s.node && nodes.has(s.node)) {
                continue;
            }
            if (s.node) {
                nodes.add(s.node);
                _args.push(s);
            }
        }

        let returnType = (body as Statement).type;
        let argTypes: (MessageType)[] = _args.map(x => x.type).filter(x => x !== undefined) as MessageType[];

        let functionSignature: FunctionSignature = {
            arguments: argTypes,
            returnType: returnType!
        };

        statement.type = DataType.GL(GLType.Function, functionSignature);

        return [statement];
    };
};

const parseArguments = (statement: Statement): Statement[] => {
    if (Array.isArray(statement)) {
        let compoundOperator = statement[0] as CompoundOperator;
        if (compoundOperator && compoundOperator.name === "argument") {
            return [statement];
        }
        let args: Statement[] = [];
        let i = 0;
        for (let a of statement.slice(1)) {
            if (statement[0] as string === "call" && i === 0) {
                continue;
            }
            args = [...args, ...parseArguments(a as Statement)];
            i++;
        }
        return args;
    }
    return [];
};

doc(
    'argument',
    {
        inletNames: ["none", "name", "number", "type"],
        numberOfInlets: 4,
        numberOfOutlets: 1,
        description: "creates argument for function"
    });

export const argument = (node: ObjectNode, name: Lazy, num: Lazy, type: Lazy) => {
    node.needsLoad = true;
    return (message: Message) => {
        let statement: Statement = [{ name: "argument", value: num() as number } as CompoundOperator, name() as Statement, type() as Statement];
        statement.node = node;

        // we have the type...
        statement.type = DataType.GL(stringToType(type() as string));

        return [statement];
    };
};

doc(
    'mat2',
    {
        inletNames: ["matrix list"],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "creates argument for function",
        fn: gl.mat2
    });

const mat = (op: string, type: GLType) => (node: ObjectNode) => {
    node.needsLoad = true;
    return (message: Message) => {
        if (!Array.isArray(message)) {
            return [];
        }
        let statement: Statement = [op as Operator, ...message as Statement[]];
        statement.node = node;

        // we have the type...
        statement.type = DataType.GL(type);

        return [statement];
    };
};

doc(
    'mat2',
    {
        inletNames: ["matrix list"],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "creates argument for function",
        fn: gl.mat2
    });

doc(
    'mat3',
    {
        inletNames: ["matrix list"],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "creates argument for function",
        fn: gl.mat3
    });

doc(
    'mat4',
    {
        inletNames: ["matrix list"],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "creates argument for function",
        fn: gl.mat4
    });


export const mat2 = mat("mat2", GLType.Mat2);
export const mat3 = mat("mat3", GLType.Mat3);
export const mat4 = mat("mat4", GLType.Mat4);

doc(
    'call',
    {
        inletNames: ["function", "argument1", "argument2", "argument3", "argument4"],
        numberOfInlets: (x) => x,
        numberOfOutlets: 1,
        description: "creates argument for function",
        fn: gl.call,
        glTypeChecker: functionType(null)
    });


doc(
    'attribute',
    {
        inletNames: ["data", "type", "size", "is instance"],
        numberOfInlets: 4,
        numberOfOutlets: 1,
        description: "generates an attribute",
        defaultValue: 0
    });

export const gl_attribute = (node: ObjectNode, type: Lazy, size: Lazy, isInstance: Lazy) => {
    let attr: Attribute;
    return (data: Message) => {
        // so given an attribute we want to generate a new 
        if (!Array.isArray(data)) {
            // trigger type error
            return [];
        }
        let array: number[] = data as number[];

        let _type = stringToType(type() as string);
        if (!attr) {
            attr = attribute(_type, array, (size() as number) || 2, isInstance() as number ? true : false);
        } else {
            // we already have an attribute so we just want to update it
            attr.set!(data as number[]);
            return [];
        }

        // lets create the attribute


        let operator: CompoundOperator = { name: "attribute", attribute: attr };
        let statement: Statement = [operator];

        statement.type = DataType.GL(_type);

        statement.node = node;
        return [statement];
    };
};

doc(
    'varying',
    {
        inletNames: ["attribute"],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "converts attribute to a varying so that fragment shader can access attribute",
    });

export const gl_varying = (node: ObjectNode) => {
    let attr: Attribute;
    return (data: Message) => {
        let _statement = data as Statement;
        if (!Array.isArray(_statement)) {
            return [];
        }
        let compoundOperator: CompoundOperator = _statement[0] as CompoundOperator;
        let attr = compoundOperator.attribute;
        let operator: CompoundOperator = { name: "varying", attribute: attr };
        let statement: Statement = [operator, data as Statement];

        statement.node = node;
        statement.type = attr ? DataType.GL(attr.get!().type) : (data as Statement).type as MessageType;
        return [statement];
    };
};



doc(
    "canvas",
    {
        numberOfInlets: 3,
        numberOfOutlets: 1,
        description: "canvas",
        defaultValue: 0,
        inletNames: ["fragment graph", "vertex graph", "indices"]
    }
)

export const gl_canvas = (objectNode: ObjectNode, vertexGraph: Lazy, indices: Lazy) => {
    if (!objectNode.attributes["draw type"]) {
        objectNode.attributes["draw type"] = "TRIANGLE_STIP";
    }

    objectNode.attributeOptions = {
        "draw type": ["TRIANGLE_STRIP", "LINE_STRIP"]
    };

    return (message: Message) => {
        let statement = message as Statement;

        if (statement.type && statement.type.subType !== GLType.Vec4) {
            statement = ["vec4" as Operator, statement];
        }

        let vertexStatement = vertexGraph() as Statement | number | undefined;

        if (typeof vertexStatement === "number") {
            vertexStatement = undefined;
        } else if (vertexStatement !== undefined && vertexStatement.type && vertexStatement.type.subType !== GLType.Vec4) {
            vertexStatement = ["vec4" as Operator, vertexStatement];
        }

        //setTimeout(() => {
        let code = printCode(statement);
        if (objectNode.patch.setVisualsCode) {
            objectNode.patch.setVisualsCode(code);
        }
        //}, 500);
        // compile the statement

        let compiled = compileStatement(statement);
        if (typeof compiled === "function") {
            if (!vertexStatement) {
                let generated = gl.zen(compiled);
                if (Array.isArray(indices())) {
                    generated.indices = indices() as number[];
                }
                generated.drawType = objectNode.attributes["draw type"] === "LINE_STRIP" ? gl.DrawType.LINE_STRIP : gl.DrawType.TRIANGLE_STRIP;

                if (objectNode.patch.onNewMessage) {
                    objectNode.patch.onNewMessage(objectNode.id, generated);
                }
            } else {
                // there is also a vertex statement
                let vertexCompiled = compileStatement(vertexStatement);
                if (typeof vertexCompiled === "function") {
                    let generated = gl.zen(compiled, vertexCompiled);
                    if (Array.isArray(indices())) {
                        generated.indices = indices() as number[];
                    }
                    generated.drawType = objectNode.attributes["draw type"] === "LINE_STRIP" ? gl.DrawType.LINE_STRIP : gl.DrawType.TRIANGLE_STRIP;
                    if (objectNode.patch.onNewMessage) {
                        objectNode.patch.onNewMessage(objectNode.id, generated);
                    }
                }
            }
        }

        return [];
    };
};
export const api: API = {
    canvas: gl_canvas,
    uniform: gl_uniform,
    argument,
    defun,
    attribute: gl_attribute,
    varying: gl_varying,
    mat2,
    mat3,
    mat4,
    sumLoop,
    switch: zswitch,
    breakIf: breakIf
};


