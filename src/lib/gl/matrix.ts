import { memo } from './memo';
import { normalize, tan, div, dot, cross, mult, sub, add } from './math';
import { vector } from './coordinates';
import { func } from './math';
import { Context, Arg, UGen, Generated, GLType } from './types';
import { emitType } from './context';

/**  helper function for creating mat2/mat3/mat4 **/
const mat = (type: GLType) => {
    return (...inputs: Arg[]) => {
        return memo((context: Context): Generated => {
            let _inputs = inputs.map(input => context.gen(input));
            let [mat] = context.useVariables("matVal");
            let _type = context.printType(type);
            let code = `${_type} ${mat} = ${_type} (${_inputs.map(i => i.variable).join(",")}); `;
            return context.emit(
                type,
                code,
                mat,
                ..._inputs);
        });
    };
};


export const mat2 = mat(GLType.Mat2);
export const mat3 = mat(GLType.Mat3);
export const mat4 = mat(GLType.Mat4);

export const perspectiveMatrix = (fov: Arg, aspect: Arg, near: Arg, far: Arg) => {
    const f = div(1.0, tan(div(fov, 2.0)));
    return mat4(
        div(f, aspect), 0, 0, 0,
        0, f, 0, 0,
        0, 0, div(add(far, near), sub(near, far)), -1.0,
        0, 0, div(mult(2.0, mult(far, near)), sub(near, far)), 0
    );
};

export const viewMatrix = (cameraPosition: Arg, target: Arg, upVector: Arg) => {
    let zAxis = vector(normalize(sub(cameraPosition, target)));
    let xAxis = vector(normalize(cross(upVector, zAxis)));
    let yAxis = vector(cross(zAxis, xAxis));

    return mat4(
        xAxis.x, yAxis.x, zAxis.x, 0,
        xAxis.y, yAxis.y, zAxis.y, 0,
        xAxis.z, yAxis.z, zAxis.z, 0,
        mult(-1, dot(xAxis, cameraPosition)),
        mult(-1, dot(yAxis, cameraPosition)),
        mult(-1, dot(zAxis, cameraPosition)),
        1);
};

