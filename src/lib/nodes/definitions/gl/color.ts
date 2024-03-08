import { doc } from './doc';
import { MutableValue } from '@/lib/nodes/definitions/core/MutableValue';
import { DataType } from '@/lib/nodes/typechecker';
import { Uniform, uniform } from '@/lib/gl/uniforms';
import { GLType } from '@/lib/gl/types';
import { ObjectNode, Message } from '@/lib/nodes/types';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { Operator, CompoundOperator, Statement } from '@/lib/nodes/definitions/zen/types'


doc(
    'color',
    {
        inletNames: ["hex"],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "outputs color via uniforms"
    });
export const color = (objectNode: ObjectNode) => {
    objectNode.needsLoad = true;

    let r_uniform: Uniform;
    let g_uniform: Uniform;
    let b_uniform: Uniform;
    let custom: MutableValue;

    if (!objectNode.custom) {
        custom = new MutableValue(objectNode, 0);
        objectNode.custom = custom;
    } else {
        custom = objectNode.custom as MutableValue;
    }


    return (hex: Message) => {
        if (typeof hex !== "string" || hex === "bang") {
            if (objectNode.custom) {
                hex = objectNode.custom.value as string;
            } else {
                hex = "#000000";
            }
        }
        if (!hex.slice || hex.length !== 7) {
            hex = "#000000";
        }

        custom.value = hex;

        hex = hex.slice(1);
        let r = hex.slice(0, 2);
        let g = hex.slice(2, 4);
        let b = hex.slice(4, 6);

        let rgb = [parseInt(r, 16) / 255.0, parseInt(g, 16) / 255.0, parseInt(b, 16) / 255.0];


        if (r_uniform && g_uniform && b_uniform) {
            // just set
            r_uniform.set!(rgb[0]);
            g_uniform.set!(rgb[1]);
            b_uniform.set!(rgb[2]);
            return [];
        }

        let [_r_uniform, r_statement] = floatUniform("r", rgb[0], objectNode);
        let [_g_uniform, g_statement] = floatUniform("g", rgb[1], objectNode);
        let [_b_uniform, b_statement] = floatUniform("b", rgb[2], objectNode);

        let statement: Statement = [
            "vec4" as Operator,
            r_statement,
            g_statement,
            b_statement,
            1];

        r_uniform = _r_uniform;
        g_uniform = _g_uniform;
        b_uniform = _b_uniform;

        statement.node = objectNode;
        statement.type = DataType.GL(GLType.Vec4);
        return [statement];
    };
};

const floatUniform = (colorType: string, num: number, node: ObjectNode): [Uniform, Statement] => {
    let objectNode = new ObjectNodeImpl(node.patch, node.id + '_' + colorType);
    objectNode.attributes.type = "float";
    objectNode.storedMessage = num;

    let uni: Uniform = uniform(GLType.Float, num);
    let statement: Statement = [
        {
            name: "uniform",
            uniform: uni
        }
    ];
    statement.node = objectNode;
    return [uni, statement];
};
