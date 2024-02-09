import { memo } from './memo';
import { func } from './math';
import { Context, Arg, UGen, Generated, GLType } from './types';
import { emitType } from './context';

const coord = (dir: "x" | "y") => {
    return (): UGen => {
        return memo((context: Context): Generated => {
            // we ask for a new variable name
            let [xVar] = context.useVariables(dir + "Val");
            let _type = GLType.Float;
            let type = context.printType(GLType.Float);
            let code = `${type} ${xVar} = gl_FragCoord.${dir};`;

            return context.emit(
                _type,
                code,
                xVar);
        });
    };
};

// unpacks vector element (like vec.x/vec.y/vec.z/vec.w))
export const unpack = (field: "x" | "y" | "z" | "w" | "xy" | "yx" | "xyz" | "xxy" | "xyy" | "yyx" | "yxy" | "xxx") => {
    return (vector: Arg): UGen => {
        return memo((context: Context): Generated => {
            let _vector = context.gen(vector);
            let [fieldVar] = context.useVariables(field + "Val");
            let _type = field.length === 1 ? GLType.Float : field.length === 2 ? GLType.Vec2 : GLType.Vec3;
            let type = context.printType(_type);
            let code = `${type} ${fieldVar} = ${_vector.variable}.${field};`;

            return context.emit(
                _type,
                code,
                fieldVar,
                _vector
            );
        });
    };
};

export type Vector = UGen & {
    x: UGen;
    y: UGen;
    z: UGen;
    w: UGen;
};

export const vector = (input: UGen): Vector => {
    let vec: any = input;
    vec.x = unpack("x")(vec);
    vec.y = unpack("y")(vec);
    vec.z = unpack("z")(vec);
    vec.w = unpack("w")(vec);

    return vec as Vector;
};

export const uv = (): Vector => {
    return vector(memo((context: Context): Generated => {
        let [uvVar] = context.useVariables("uv");
        let type = context.printType(GLType.Vec2);
        let code = `${type} ${uvVar} = ((gl_FragCoord.xy-resolution)/resolution.y) ;
        `;
        //let code = `${ type } ${ uvVar } = ((gl_FragCoord.xy - resolution) / resolution);
        return context.emit(
            GLType.Vec2,
            code,
            uvVar);
    }));
};

export const nuv = (): Vector => {
    return vector(memo((context: Context): Generated => {
        let [uvVar] = context.useVariables("nuv");
        let type = context.printType(GLType.Vec2);
        let code = `${type} ${uvVar} = ((gl_FragCoord.xy)/resolution.xy)/2.0 ;
        `;
        //let code = `${ type } ${ uvVar } = ((gl_FragCoord.xy - resolution) / resolution);
        return context.emit(
            GLType.Vec2,
            code,
            uvVar);
    }));
};

export const resolution = (): Vector => {
    return vector(memo((context: Context): Generated => {
        let [uvVar] = context.useVariables("res");
        let type = context.printType(GLType.Vec2);
        let code = `${type} ${uvVar} = resolution.xy/2.0 ;
        `;
        //let code = `${ type } ${ uvVar } = ((gl_FragCoord.xy - resolution) / resolution);
        return context.emit(
            GLType.Vec2,
            code,
            uvVar);
    }));
}


/**  helper function for creating vec2/vec3/vec4 **/
export const vec = (type: GLType) => {
    return (...inputs: Arg[]) => {
        return vector(memo((context: Context): Generated => {
            let _inputs = inputs.map(input => context.gen(input));
            let [vec] = context.useVariables("vectorVal");
            let _type = context.printType(type);
            let code = `${_type} ${vec} = ${_type} (${_inputs.map(i => i.variable).join(",")}); `;
            return context.emit(
                type,
                code,
                vec,
                ..._inputs);
        }));
    };
};

export const vec2 = vec(GLType.Vec2);
export const vec3 = vec(GLType.Vec3);
export const vec4 = vec(GLType.Vec4);

export const x = coord("x");
export const y = coord("y");

export const red = () => vec4(1, 0, 0, 1);
export const green = () => vec4(0, 1, 0, 1);
export const blue = () => vec4(0, 0, 1, 1);
export const black = () => vec4(0, 0, 0, 1);
export const white = () => vec4(1, 1, 1, 1);
