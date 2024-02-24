import { ObjectNode, Message } from '../../types';
import { publish } from '@/lib/messaging/queue';
import { doc } from './doc';

doc(
    'matrix',
    {
        inletNames: ["operation"],
        numberOfOutlets: 1,
        numberOfInlets: 1,
        description: "creates a matrix UI element that sends its output to be used in data object"
    });

export class Matrix {
    objectNode: ObjectNode;
    buffer: Float32Array | Uint8Array;
    counter: number;
    constructor(objectNode: ObjectNode, buffer: Float32Array | Uint8Array) {
        this.objectNode = objectNode;
        this.buffer = buffer;
        this.counter = 77777777;
    }

    update() {
        publish('statechanged', {
            node: this.objectNode,
            state: this.getJSON()
        });
    }

    getJSON() {
        return {
            buffer: Array.from(this.buffer)
        };
    }

    fromJSON(x: any) {
        this.buffer = this.objectNode.attributes["type"] === "uint8" ? new Uint8Array(x.buffer) : new Float32Array(x.buffer);

        let _node = this.objectNode;
        _node.buffer = this.buffer;
        _node.send(_node.outlets[0], _node.buffer);
        if (_node.onNewValue) {
            _node.onNewValue(this.counter++);
        }
    }
}

export const matrix = (_node: ObjectNode) => {
    let columns = (_node.attributes.columns || 4) as number;
    let rows = (_node.attributes.rows || 4) as number;

    if (!_node.attributes["showValue"]) {
        _node.attributes["showValue"] = false;
    }

    if (!_node.attributes["unit"]) {
        _node.attributes["unit"] = "";
    }

    _node.attributeOptions["type"] = ["float", "uint8", "boolean"];

    if (!_node.attributes["type"]) {
        _node.attributes["type"] = "float";
    }

    _node.attributeOptions["type"] = ["float", "uint8", "boolean"];
    if (!_node.attributes["cornerRadius"]) {
        _node.attributes["cornerRadius"] = "full";
    }

    _node.attributeCallbacks["type"] = (type) => {
        _node.buffer = type === "uint8" ? new Uint8Array(columns * rows) : new Float32Array(columns * rows);
    };

    if (!_node.attributes["ux"]) {
        _node.attributes["ux"] = "circle";
    }

    _node.attributeOptions["ux"] = ["circle", "line"];

    if (!_node.buffer) {
        _node.attributes["columns"] = columns;
        _node.attributes["rows"] = rows;
        _node.buffer = _node.attributes["type"] === "uint8" ? new Uint8Array(columns * rows) : new Float32Array(columns * rows);
    }

    if (!_node.custom) {
        _node.custom = new Matrix(_node, _node.buffer);
    }


    if (!_node.attributes["min"]) {
        _node.attributes["min"] = 0;
    }
    if (!_node.attributes["max"]) {
        _node.attributes["max"] = 1;
    }


    if (!_node.attributes["fillColor"]) {
        _node.attributes["fillColor"] = "#2ad4bf";
    }
    _node.attributeOptions["cornerRadius"] = ["sm", "lg", "full"];

    /**
     * format for messages is [rowIndex, columnIndex, value]
     * a message like [0, 2, 1] -> will replace the 0th row 2nd column w/ 1
     */
    let counter = 0;
    return (message: Message) => {
        if (_node.attributes["columns"] !== columns) {
            columns = _node.attributes["columns"] as number;
            _node.buffer = _node.attributes["type"] === "uint8" ? new Uint8Array(columns * rows) : new Float32Array(columns * rows);
        }
        if (_node.attributes["rows"] !== rows) {
            rows = _node.attributes["rows"] as number;
            _node.buffer = _node.attributes["type"] === "uint8" ? new Uint8Array(columns * rows) : new Float32Array(columns * rows);
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
        if (typeof message === "string" &&
            message.startsWith("select")) {
            let tokens = message.split(" ");
            let selected = parseInt(tokens[1])
            _node.saveData = selected;
        }
        if (Array.isArray(message) && _node.buffer) {
            let [column, row, value] = message as number[];
            let idx = row * (columns as number) + column;
            if (message.length == 2) {
                idx = message[0] as number;
                value = message[1] as number;
            }
            _node.buffer[idx] = value;
        }
        (_node.custom as Matrix).buffer = _node.buffer;
        if (_node.onNewValue) {
            _node.onNewValue(counter++);
        }
        return [_node.buffer];
    };
};

doc(
    'button',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "button",
        inletNames: ["bang"]
    });

export const button = (node: ObjectNode) => {
    let counter = 0;
    if (!node.size) {
        node.size = { width: 25, height: 25 };
    }
    const bang = "bang";
    return (message: Message) => {
        if (node.onNewValue) {
            node.onNewValue(counter++);
        }
        return [bang];
    };
};
