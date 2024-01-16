import { Attribute, AttributeGen } from './attributes';
import { UGen, GLType, Context, Generated } from './types';
import { memo } from './memo';


/**
 * this will be used only in a fragment shader, by a user. However,
 * it will tell the compiler to set up the varyings in the vertex shader,
 * writing whatever is inside the attribute over thorugh the varying to the frag shader
 */

export interface Varying {
    name: string;
    type: GLType;
    attributeName: string;
    code: string;
}

// input is usually an attribute
export const varying = (input: UGen): UGen => {
    return memo((context: Context): Generated => {
        let _input = context.siblingContext ? context.siblingContext.gen(input) : context.gen(input);

        let attributeName = _input.variable as string;
        let _type = _input.type;
        if (!attributeName) {
            let attribute = (_input as any as AttributeGen).attribute;
            if (attribute) {
                let def = attribute.get!();
                attributeName = def.name;
                _type = def.type;
            }
        }

        //console.log("varying called with def=", def);
        let [varyingName] = context.useVariables("v_varying_"); //`v_${def.name}`; // Construct a varying name based on the attribute

        // Add this varying to the context, indicating it needs to be declared in the vertex shader
        let code = _input.code === attributeName ? "" : _input.code;
        context.varyings.push({ name: varyingName, type: _type, attributeName, code: code });

        // Return the varying as it should be used in the fragment shader
        return context.emit(_input.type, "", varyingName);
    });
};
