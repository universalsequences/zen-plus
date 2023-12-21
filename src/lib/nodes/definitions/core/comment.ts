import { ObjectNode, Message } from '../../types';
import { doc } from './doc';


doc(
    'comment',
    {
        numberOfOutlets: 0,
        numberOfInlets: 0,
        description: "comment your patch with this node"
    });

export const comment = (_node: ObjectNode) => {
    if (_node && _node.size) {
        _node.size.width = 120;
    }
    return (x: Message) => [];
}

