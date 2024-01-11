import { Message, ObjectNode, Lazy, NodeFunction } from '@/lib/nodes/types';
import { Operator, Statement } from '@/lib/nodes/definitions/zen/types';

export const createGLFunction = (objectNode: ObjectNode): NodeFunction => {
    const fn: NodeFunction = (o: ObjectNode, ...args: Lazy[]) => {
        return (message: Message): Statement[] => {
            let statement: Statement = [objectNode.name as Operator];
            if (message !== "bang") {
                statement = [objectNode.name as Operator, message as Statement, ...args.map(x => x() as Statement)];
            }
            statement.node = o;
            return [statement];
        };
    };

    return fn;
};
