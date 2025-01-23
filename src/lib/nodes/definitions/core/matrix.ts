import { ObjectNode, Message, MessageObject, NodeFunction } from "../../types";
import { publish } from "@/lib/messaging/queue";
import { doc } from "./doc";

doc("matrix", {
  inletNames: ["operation"],
  outletNames: ["matrix", "statechange", "peek"],
  numberOfOutlets: 3,
  numberOfInlets: 1,
  description: "creates a matrix UI element that sends its output to be used in data object",
});

export class Matrix {
  objectNode: ObjectNode;
  buffer: Float32Array | Uint8Array | MessageObject[];
  counter: number;
  value: Message;
  constructor(objectNode: ObjectNode, buffer: Float32Array | Uint8Array | MessageObject[]) {
    this.objectNode = objectNode;
    this.buffer = buffer;
    this.counter = 77777777;
    this.value = 0;
  }

  update() {
    publish("statechanged", {
      node: this.objectNode,
      state: this.getJSON(),
    });
  }

  getJSON() {
    return {
      buffer: ArrayBuffer.isView(this.buffer) ? Array.from(this.buffer) : [...this.buffer],
    };
  }

  fromJSON(x: any) {
    const _type = this.objectNode.attributes.type;
    this.buffer =
      _type === "uint8"
        ? new Uint8Array(x.buffer)
        : _type === "object"
          ? (x.buffer as MessageObject[])
          : new Float32Array(x.buffer);

    const _node = this.objectNode;
    _node.buffer = this.buffer;
    _node.send(_node.outlets[0], _node.buffer);
    if (_node.onNewValue) {
      _node.onNewValue(this.counter++);
    }
  }
}

const setupMatrixAttributes = (_node: ObjectNode) => {
  let columns = (_node.attributes.columns || 4) as number;
  let rows = (_node.attributes.rows || 4) as number;

  if (!_node.attributes.fillColor) {
    _node.attributes.fillColor = "#2ad4bf";
  }

  if (!_node.attributes.showValue) {
    _node.attributes.showValue = false;
  }

  if (!_node.attributes.fields) {
    _node.attributes.fields = "";
  }

  if (!_node.attributes.selectedField) {
    _node.attributes.selectedField = "";
  }

  _node.newAttribute("options", "");

  _node.newAttribute("round", false);

  if (!_node.attributes.unit) {
    _node.attributes.unit = "";
  }

  _node.attributeOptions.type = ["float", "uint8", "boolean", "object"];

  if (!_node.attributes.type) {
    _node.attributes.type = "float";
  }

  _node.attributeOptions.type = ["float", "uint8", "boolean", "object"];
  if (!_node.attributes.cornerRadius) {
    _node.attributes.cornerRadius = "full";
  }

  _node.attributeCallbacks.columns = (cols) => {
    const total = (cols as number) * (_node.attributes.rows as number);
    _node.buffer =
      _node.attributes.type === "uint8"
        ? new Uint8Array(total)
        : _node.attributes.type === "object"
          ? newObjectList(_node.buffer as MessageObject[], total)
          : changeLength(_node.buffer as Float32Array, total);
  };

  _node.attributeCallbacks.type = (type) => {
    _node.buffer =
      type === "uint8"
        ? new Uint8Array(columns * rows)
        : type === "object"
          ? new Array(columns * rows).fill({} as MessageObject)
          : new Float32Array(columns * rows);
  };

  _node.newAttribute("ux", "circle");
  _node.newAttribute("pageSize", 32);
  _node.newAttribute("pageStart", 0);
  _node.newAttribute("show", "all");
  _node.newAttribute("disabledColumns", "");

  _node.attributeOptions.ux = ["circle", "line"];

  _node.attributeOptions.show = ["all", "row", "column"];

  if (!_node.attributes.rowToShow) {
    _node.attributes.rowToShow = 0;
  }

  if (!_node.attributes.toggle) {
    _node.attributes.toggle = false;
  }

  if (!_node.buffer) {
    _node.attributes.columns = columns;
    _node.attributes.rows = rows;
    const _type = _node.attributes.type;
    _node.buffer =
      _type === "uint8"
        ? new Uint8Array(columns * rows)
        : _type === "object"
          ? (new Array(columns * rows).fill({} as MessageObject) as MessageObject[])
          : new Float32Array(columns * rows);
  }

  if (!_node.custom && _node.buffer) {
    _node.custom = new Matrix(_node, _node.buffer);
  }

  if (!_node.attributes.min) {
    _node.attributes.min = 0;
  }
  if (_node.attributes.max === undefined) {
    _node.attributes.max = 1;
  }

  _node.attributeOptions.cornerRadius = ["sm", "lg", "full"];

  return { columns, rows };
};

export const matrix = (_node: ObjectNode) => {
  let { columns, rows } = setupMatrixAttributes(_node);
  /**
   * format for messages is [rowIndex, columnIndex, value]
   * a message like [0, 2, 1] -> will replace the 0th row 2nd column w/ 1
   */
  let counter = 0;
  return (message: Message) => {
    if (_node.attributes.columns !== columns) {
      columns = _node.attributes.columns as number;
      _node.buffer =
        _node.attributes.type === "uint8"
          ? new Uint8Array(columns * rows)
          : _node.attributes.type === "object"
            ? newObjectList(_node.buffer as MessageObject[], columns * rows)
            : new Float32Array(columns * rows);
    }
    if (_node.attributes.rows !== rows) {
      rows = _node.attributes.rows as number;
      _node.buffer =
        _node.attributes.type === "uint8"
          ? new Uint8Array(columns * rows)
          : _node.attributes.type === "object"
            ? newObjectList(_node.buffer as MessageObject[], columns * rows)
            : new Float32Array(columns * rows);
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
    let skipReturn = false;
    if (isOperation(message, "select")) {
      const tokens = (message as string).split(" ");
      const selected = Number.parseInt(tokens[1]);
      _node.saveData = selected;
      skipReturn = true;
    }

    if (isOperation(message, "get")) {
      const tokens = (message as string).split(" ");
      const num = Number.parseInt(tokens[1]);
      if (_node.buffer[num] === undefined) {
        return [];
      }
      return [undefined, undefined, _node.buffer[num]];
    }

    if (isOperation(message, "column")) {
      const tokens = (message as string).split(" ");
      const col = Number.parseInt(tokens[1]);
      const list = [];
      for (let i = 0; i < rows; i++) {
        const idx = i * columns + col;
        list.push(_node.buffer[idx]);
      }
      return [undefined, undefined, list];
    }

    if (isOperation(message, "set-field")) {
      const tokens = (message as string).split(" ");
      const [_op, field, idx, val] = tokens;
      const _idx = Number.parseInt(idx);
      const _value = Number.parseFloat(val);
      if (typeof _node.buffer[_idx] === "object") {
        (_node.buffer[_idx] as MessageObject)[field] = _value;

        (_node.buffer[_idx] as MessageObject) = {
          ...(_node.buffer[_idx] as MessageObject),
        };
      }

      if (_node.onNewValue) {
        _node.onNewValue(counter++);
      }
      return [];
    }

    let idx = undefined;
    let _value = undefined;
    let colChange = undefined;

    if (Array.isArray(message) && _node.buffer) {
      if (message.length > 3) {
        // replacing the full buffer
        for (let idx = 0; idx < _node.buffer.length; idx++) {
          if (message[idx] !== undefined) {
            _node.buffer[idx] = message[idx] as number;
          }
        }
      } else {
        // setting the buffer by index

        let [column, row, value] = message as number[];
        _value = value;
        idx = row * (columns as number) + column;
        if (message.length === 2) {
          idx = message[0] as number;
          value = message[1] as number;
          _value = value as number;
        }

        if (_node.attributes.type === "object") {
          const selectedField = _node.attributes.selectedField as string;
          const buffer = _node.buffer as MessageObject[];
          buffer[idx] = { ...buffer[idx] };
          if (value !== undefined) {
            buffer[idx][selectedField] = value;
          }
        } else {
          if (value !== undefined) {
            _node.buffer[idx] = value;
          }
        }

        colChange = [];
        for (let _row = 0; _row < rows; _row++) {
          const idx = _row * (columns as number) + column;
          colChange.push(_node.buffer[idx]);
        }
      }
    }

    (_node.custom as Matrix).buffer = _node.buffer;
    if (_node.onNewValue) {
      _node.onNewValue(counter++);
    }
    if (!skipReturn && _node.buffer) {
      if (idx !== undefined && _value !== undefined && colChange) {
        return [_node.buffer, [idx, _value, colChange]];
      }
      return [_node.buffer];
    }

    return [];
  };
};

doc("button", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  aliases: ["b"],
  description: "button that when pressed, sends a [[bang]] message",
  inletNames: ["trigger"],
  outletNames: ["bang"],
});

export const button = (node: ObjectNode) => {
  node.newAttribute("label", "");
  if (!node.attributes.fillColor) {
    node.attributes.fillColor = "#2f2f2f";
  }
  if (!node.attributes.backgroundColor) {
    node.attributes.backgroundColor = "#2f2f2f";
  }

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

const changeLength = (list: Float32Array, size: number): Float32Array => {
  const newList = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const idx = i % list.length;
    if (idx < list.length) {
      newList[i] = list[idx];
    }
  }
  return newList;
};

const newObjectList = (list: MessageObject[], size: number): MessageObject[] => {
  const newList = new Array(size).fill({} as MessageObject);
  for (let i = 0; i < size; i++) {
    const idx = i % list.length;
    if (list[idx]) {
      newList[i] = { ...list[idx] };
    }
  }
  return newList;
};

const isOperation = (x: Message, operation: string): boolean => {
  return typeof x === "string" && x.startsWith(operation);
};
