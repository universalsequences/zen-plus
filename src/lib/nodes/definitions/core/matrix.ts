import { ObjectNode, Message } from '../../types';
import { doc } from './doc';

doc(
    'matrix',
    {
        inletNames: ["operation"],
        numberOfOutlets: 1,
        numberOfInlets: 1,
        description: "creates a matrix UI element that sends its output to be used in data object"
    });

export const matrix = (_node: ObjectNode) => {
    let columns = (_node.attributes.columns || 4) as number;
    let rows = (_node.attributes.rows || 4) as number;
    if (!_node.buffer) {
        _node.attributes["columns"] = columns;
        _node.attributes["rows"] = rows;
        _node.buffer = new Float32Array(columns * rows);
    }

    /**
     * format for messages is [rowIndex, columnIndex, value]
     * a message like [0, 2, 1] -> will replace the 0th row 2nd column w/ 1
     */
    return (message: Message) => {
        if (_node.attributes["columns"] !== columns) {
            columns = _node.attributes["columns"] as number;
            _node.buffer = new Float32Array(columns * rows);
        }
        if (_node.attributes["rows"] !== rows) {
            rows = _node.attributes["rows"] as number;
            _node.buffer = new Float32Array(columns * rows);
        }

        if (!_node.buffer) {
            return [];
        }
        if (message === "bang") {
            return [_node.buffer];
        }

        if (message === "clear") {
            for (let i = 0; i < _node.buffer.length; i++) {
                _node.buffer[i] = 0;
            }
        }
        // this will convert to float32array ...
        if (Array.isArray(message) && _node.buffer) {
            let [column, row, value] = message as number[];
            let idx = row * (columns as number) + column;
            _node.buffer[idx] = value;
        }
        if (_node.patch.onNewMessage) {
            _node.patch.onNewMessage(_node.id, Array.from(_node.buffer));
        }
        return [_node.buffer];
    };
};
