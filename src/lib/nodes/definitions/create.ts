import { Message, ObjectNode, Lazy, NodeFunction } from '@/lib/nodes/types';
import { DataType, MessageType, TypeSuccess, TypeError } from '@/lib/nodes/typechecker';
import { Definition } from '@/lib/docs/docs';
import { Operator, Statement } from '@/lib/nodes/definitions/zen/types';

export const createGLFunction = (objectNode: ObjectNode, definition: Definition): NodeFunction => {
    const fn: NodeFunction = (o: ObjectNode, ...args: Lazy[]) => {
        return (message: Message): Statement[] => {
            let statement: Statement = [objectNode.name as Operator];
            if (message !== "bang") {
                statement = [objectNode.name as Operator, message as Statement, ...args.map(x => x() as Statement)];
            }
            statement.node = o;

            if (definition.glTypeChecker) {
                let statements = message === "bang" ? args.map(x => x() as Statement) : [message as Statement, ...args.map(x => x() as Statement)];
                let inputTypes: MessageType[] = statements.map(
                    x => typeof x === "number" ? DataType.Number() : x.type as MessageType);
                if (inputTypes.some(x => x === undefined || x === null)) {
                    if (objectNode.patch.onNewMessage) {
                        objectNode.patch.onNewMessage(objectNode.id, { error: "type check failed" } as TypeError);
                    }
                    return [];
                }

                let outputType: MessageType | null = definition.glTypeChecker.check(inputTypes);
                if (outputType === null) {
                    // error
                    // we have an error...
                    if (objectNode.patch.onNewMessage) {
                        objectNode.patch.onNewMessage(objectNode.id, { error: "type check failed" } as TypeError);
                    }
                    return [];
                } else {
                    statement.type = outputType;
                    if (objectNode.patch.onNewMessage) {
                        objectNode.patch.onNewMessage(objectNode.id, { success: true } as TypeSuccess);
                    }
                }
            }
            return [statement];
        };
    };

    return fn;
};
