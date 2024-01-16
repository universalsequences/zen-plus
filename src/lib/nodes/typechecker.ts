import { GLType } from '@/lib/gl/types';

export interface TypeError {
    error: string;
}

export interface TypeSuccess {
    success: boolean;
}

export enum CoreType {
    Number,
    List,
    String,
    Zen,
    GL // Represents OpenGL-related types
}

export interface FunctionSignature {
    arguments: MessageType[];
    returnType: MessageType;
}

export interface MessageType {
    type: CoreType,
    subType?: GLType,
    functionSignature?: FunctionSignature

};

type DataTypeish = {
    [x: string]: (subType?: GLType, functionSignature?: FunctionSignature) => MessageType;
}

export const DataType: DataTypeish = {
    Number: () => ({ type: CoreType.Number }),
    List: () => ({ type: CoreType.List }),
    GL: (subType?: GLType, functionSignature?: FunctionSignature) => ({ type: CoreType.GL, subType, functionSignature } as MessageType),
    Zen: () => ({ type: CoreType.Zen })
};

// some utility type checkers

export const convertToGlType = (t: MessageType): GLType | null => {
    if (!t) {
        return null;
    }
    if (t.type === CoreType.Number) {
        return GLType.Float;
    } else if (t.type === CoreType.GL) {
        let glType = t.subType;
        if (glType !== undefined) {
            return glType;
        }
    } else {
        // error
        return null;
    }
    return null;
};

export const glAllowedCheck = (types: MessageType[], allowed: MessageType[]): MessageType[] | null => {
    let _types: MessageType[] = [];

    for (let t of types) {
        if (t.type === CoreType.Number) {
            _types.push(DataType.GL(GLType.Float));
        } else if (t.type === CoreType.GL) {
            _types.push(t);
        } else {
            _types.push(t);
        }
    }
    return _types;
}
export const eqTypes = (a: MessageType, b: MessageType) =>
    a.type === b.type && a.subType === b.subType;

export type GLTypeCheck = {
    check: (inputs: MessageType[]) => MessageType | null,
    allowed: MessageType[][]
    outputType: MessageType | null;
}

// this type will exist in the doc definition for each function. We evaluate inputs off of this...
export type GLTypeChecker = (_outputType: MessageType | null, ...allowed: MessageType[][]) => GLTypeCheck;

// second arg becomes the type (for example: argument a float)
export const userDefinedType_arg2 = (_outputType: MessageType | null, ...allowed: MessageType[][]): GLTypeCheck => {
    return {
        check: (inputs: MessageType[]): MessageType | null => {
            if (inputs[1] !== undefined) {
                return inputs[1];
            }
            return null;
        },
        allowed: allowed,
        outputType: _outputType
    }
};

export const maxCompatibleType = (_outputType: MessageType | null, allowed: MessageType[]): GLTypeCheck => {
    return {
        check: (inputs: MessageType[]): MessageType | null => {
            let allowedConversion = glAllowedCheck(inputs, allowed);
            if (!allowedConversion) {
                return null;
            }
            let _types: GLType[] | null = allowedConversion.map(x => x.subType as GLType);
            let maxType = Math.max(..._types);
            return DataType.GL(maxType);
        },
        allowed: [allowed],
        outputType: _outputType
    }
};

export const functionType = (_outputType: MessageType | null): GLTypeCheck => {
    return {
        check: (inputs: MessageType[]): MessageType | null => {
            // first arg is function...
            let { type, subType, functionSignature } = inputs[0];

            console.log("functionSig", functionSignature);

            if (!functionSignature) {
                return null;
            }

            let outputType = functionSignature.returnType;

            // ensure the arguments fit the function signature
            let argInputs = inputs.slice(1);
            console.log("function type arg inputs = ", argInputs);

            for (let i = 0; i < functionSignature.arguments.length; i++) {
                if (!argInputs[i]) {
                    return null;
                }
                let glType = convertToGlType(argInputs[i]);
                if (glType) {
                    if (!eqTypes(DataType.GL(glType), functionSignature.arguments[i])) {
                        return null;
                    }
                }
            }

            console.log('function type called...', outputType);
            return outputType;
        },
        allowed: [],
        outputType: _outputType
    }
};



export const strictGLType = (outputType: MessageType | null, ...allowed: MessageType[][]): GLTypeCheck => {
    return {
        check: (inputs: MessageType[]): MessageType | null => {

            for (let i = 0; i < inputs.length; i++) {
                let _allowed = allowed[i];
                if (_allowed === undefined) {
                    console.log('allowed missing', i);
                    return null;
                }
                if (!inputs[i]) {
                    console.log('input missing', i);
                    return null;
                }
                if (inputs[i].type === CoreType.Number || inputs[i].type === CoreType.GL) {
                    let inputType = convertToGlType(inputs[i]);
                    if (inputType === null) {
                        console.log("allowed type 1", inputs[i]);
                        return null;
                    }
                    if (!_allowed.map(x => x.subType).includes(inputType)) {
                        console.log('inputs[%s]=', i, inputs[i]);
                        console.log("allowed did not have inputType = ", _allowed, inputType);
                        return null;
                    }
                } else {
                    let inputType = inputs[i];
                    if (!_allowed.some(x => eqTypes(inputType, x))) {
                        // type did not exist in allowds
                        console.log("allowed type 2");
                        return null;
                    }
                }
            }
            return outputType;
        },
        allowed: allowed,
        outputType
    };
};




