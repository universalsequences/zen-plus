import { op_doc } from './math';
import { Statement, Operator } from './types';
import { doc } from './doc';
import { BlockGen } from '@/lib/zen/data';
import { Lazy, ObjectNode, Message } from '../../types';


doc(
    'gate',
    {
        description: "gates",
        numberOfInlets: 2,
        numberOfOutlets: "channels",
        attributes: {
            attributes: 2
        }
    }
)
export const gate = (
    object: ObjectNode,
    input: Lazy) => {
    return (message: Message): Statement[] => {
        let outputs: Statement[] = [];
        for (let i = 0; i < (object.attributes["channels"] as number || 1); i++) {
            let _node = {
                ...object,
                id: object.id + '_' + i
            }
            let statement: Statement = [
                "zswitch" as Operator,
                ["eq" as Operator, message as Statement, i + 1] as Statement,
                input() as Statement,
                0 as Statement
            ] as Statement;
            statement.node = _node;
            outputs.push(statement);
        }
        return outputs;
    };
};
