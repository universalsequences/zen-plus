import { UGen, Context, Generated, GLType } from './types';
import { memo } from './memo';

export type AttributeData = number[]; // Can be expanded for more complex data types
export type Attribute = (() => UGen) & {
    set?: (v: AttributeData) => void
    get?: () => AttributeDefinition;
}
export type AttributeGen = UGen & {
    attribute?: Attribute;
};

export type AttributeDefinition = {
    name: string,
    type: GLType,
    data: AttributeData,
    buffer?: WebGLBuffer, // WebGL buffer for this attribute
    size: number,
    isInstance: boolean
};

export const attribute = (type: GLType, initialData: AttributeData, size: number = 2, isInstance: boolean = false): Attribute => {
    let contexts: Context[] = [];
    let attributeDefinition: AttributeDefinition = {
        name: '',
        type: type,
        data: initialData,
        size,
        isInstance
    };

    let _attribute: Attribute = (): AttributeGen => {
        let attributeGen: UGen = memo((context: Context): Generated => {
            if (!attributeDefinition.name) {
                let [attributeName] = context.useVariables("attribute");
                attributeDefinition.name = attributeName;
            }

            if (!contexts.includes(context)) {
                contexts.push(context);
                context.attributes.push(_attribute);
            }

            // No GLSL code emission is needed here as it's for setup
            let generated: Generated = context.emit(
                type, "", attributeDefinition.name
            );
            if (!generated.attributes) {
                generated.attributes = [];
            }
            generated.attributes.push(attributeDefinition);
            return generated;
        });

        (attributeGen as any).attribute = _attribute;
        return attributeGen as AttributeGen;
    };

    _attribute.set = (v: AttributeData) => {
        attributeDefinition.data = v;

        // Update WebGL buffer if it already exists
        for (let context of contexts) {
            if (attributeDefinition.buffer) {
                let gl = context.webGLRenderingContext;
                if (gl) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, attributeDefinition.buffer);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attributeDefinition.data), gl.STATIC_DRAW);
                }
            }
        }
    };

    _attribute.get = () => attributeDefinition;

    return _attribute;
};

export const emitAttributes = (...gen: Generated[]): AttributeDefinition[] => {
    let generated = new Set<AttributeDefinition>();
    for (let x of gen) {
        if (x.attributes) {
            for (let attr of x.attributes) {
                generated.add(attr);
            }
        }
    }
    return Array.from(generated);
};

