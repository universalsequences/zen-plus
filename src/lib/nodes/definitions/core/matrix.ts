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
    const { buffer } = createMatrixBuffer(
      this.objectNode,
      x.buffer.length,
      _type as MatrixType,
      x.buffer || this.objectNode.buffer,
    );
    this.buffer = buffer as Float32Array;

    const _node = this.objectNode;
    _node.buffer = this.buffer;
    _node.send(_node.outlets[0], _node.buffer);
    if (_node.onNewValue) {
      _node.onNewValue(this.counter++);
    }
  }
}

const setupMatrixAttributes = (node: ObjectNode) => {
  let columns = (node.attributes.columns || 4) as number;
  let rows = (node.attributes.rows || 4) as number;

  node.isResizable = true;

  if (!node.attributes.fillColor) {
    node.attributes.fillColor = "#2ad4bf";
  }

  if (!node.attributes.showValue) {
    node.attributes.showValue = false;
  }

  if (!node.attributes.fields) {
    node.attributes.fields = "";
  }

  if (!node.attributes.selectedField) {
    node.attributes.selectedField = "";
  }

  node.newAttribute("options", "");

  node.newAttribute("round", false);

  if (!node.attributes.unit) {
    node.attributes.unit = "";
  }

  node.attributeOptions.type = ["float", "uint8", "boolean", "object"];

  if (!node.attributes.type) {
    node.attributes.type = "float";
  }

  node.attributeOptions.type = ["float", "uint8", "boolean", "object"];
  if (!node.attributes.cornerRadius) {
    node.attributes.cornerRadius = "full";
  }

  node.attributeCallbacks.columns = (_cols) => {
    const columns = _cols as number;
    const rows = node.attributes.rows as number;
    const type = node.attributes.type as MatrixType;
    const { buffer, sharedBuffer } = createMatrixBuffer(
      node,
      columns * rows,
      type,
      Array.from(node.buffer as Float32Array).slice(0, columns * rows),
    );
    node.buffer = buffer;
    node.sharedBuffer = sharedBuffer;
  };

  node.attributeCallbacks.rows = (_rows) => {
    const rows = _rows as number;
    const columns = node.attributes.columns as number;
    const type = node.attributes.type as MatrixType;
    const { buffer, sharedBuffer } = createMatrixBuffer(
      node,
      columns * rows,
      type,
      Array.from(node.buffer as Float32Array).slice(0, columns * rows),
    );
    node.buffer = buffer;
    node.sharedBuffer = sharedBuffer;
  };

  node.attributeCallbacks.type = (type) => {
    const _type = type as MatrixType;
    const { buffer, sharedBuffer } = createMatrixBuffer(
      node,
      columns * rows,
      _type,
      Array.from(node.buffer as Float32Array).slice(0, columns * rows),
    );
    node.buffer = buffer;
    node.sharedBuffer = sharedBuffer;
  };

  node.newAttribute("ux", "circle");
  node.newAttribute("pageSize", 32);
  node.newAttribute("pageStart", 0);
  node.newAttribute("show", "all");
  node.newAttribute("disabledColumns", "");

  node.attributeOptions.ux = ["circle", "line", "bar"];

  node.attributeOptions.show = ["all", "row", "column"];

  if (!node.attributes.rowToShow) {
    node.attributes.rowToShow = 0;
  }

  if (!node.attributes.toggle) {
    node.attributes.toggle = false;
  }

  if (!node.buffer) {
    node.attributes.columns = columns;
    node.attributes.rows = rows;
    const _type = node.attributes.type as MatrixType;
    const { buffer, sharedBuffer } = createMatrixBuffer(node, rows * columns, _type);
    node.buffer = buffer;
    node.sharedBuffer = sharedBuffer;
  }

  if (!node.custom && node.buffer) {
    node.custom = new Matrix(node, node.buffer);
  }

  if (!node.attributes.min) {
    node.attributes.min = 0;
  }
  if (node.attributes.max === undefined) {
    node.attributes.max = 1;
  }

  node.attributeOptions.cornerRadius = ["sm", "lg", "full"];

  return { columns, rows };
};

export type MatrixType = "uint8" | "object" | "float";

export const createMatrixBuffer = (
  node: ObjectNode,
  size: number,
  type: MatrixType,
  values?: number[],
) => {
  size = Math.max(size, 4);
  if (type === "object") {
    return {
      buffer: (values ? values : new Array(size).fill({} as MessageObject)) as MessageObject[],
    };
  }
  if (node.onNewSharedBuffer) {
    // we are in a worklet and need to propagate this to the main thread
    const bytesPerElement =
      type === "float" ? Float32Array.BYTES_PER_ELEMENT : Uint8Array.BYTES_PER_ELEMENT;

    const sharedBuffer = new SharedArrayBuffer(bytesPerElement * size);
    node.onNewSharedBuffer(sharedBuffer);
    const buffer = type === "float" ? new Float32Array(sharedBuffer) : new Uint8Array(sharedBuffer);
    if (values) {
      buffer.set(values);
    }
    if (node.custom) {
      (node.custom as Matrix).buffer = buffer;
    }
    return {
      sharedBuffer,
      buffer,
    };
  } else {
    const buffer = type === "float" ? new Float32Array(size) : new Uint8Array(size);
    if (values) {
      buffer.set(values);
    }
    if (node.custom) {
      (node.custom as Matrix).buffer = buffer;
    }
    return {
      buffer,
    };
  }
};

export const matrix = (_node: ObjectNode) => {
  let { columns, rows } = setupMatrixAttributes(_node);
  /**
   * format for messages is [rowIndex, columnIndex, value]
   * a message like [0, 2, 1] -> will replace the 0th row 2nd column w/ 1
   */
  let counter = 0;
  return (message: Message) => {
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
    if (typeof message === "string" && message.startsWith("backgroundColor")) {
      return [];
    }
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
