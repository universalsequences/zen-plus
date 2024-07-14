import { doc } from "./doc";
import { Statement } from "./types";
import { data, BlockGen, Interpolation } from "@/lib/zen/data";
import { ObjectNode } from "../../types";
import { Lazy, Message } from "../../types";

doc("data", {
  numberOfInlets: 3,
  numberOfOutlets: 1,
  inletNames: ["initData", "size", "channels"],
  description:
    "creates a data buffer with set size & channels, to be used by peek/poke objects",
});

export const zen_data = (_node: ObjectNode, size: Lazy, channels: Lazy) => {
  let block: BlockGen | null = null;
  let lastChannels: number = 0;
  let lastSize: number = 0;
  let lastData: Message;

  _node.attributeOptions.interpolation = ["linaer", "none"];
  if (!_node.attributes.interpolation) {
    _node.attributes["interpolation"] = "linear";
  }
  return (inputData: Message): Statement[] => {
    if (lastSize !== size() || lastChannels !== channels()) {
      block = null;
      lastChannels = channels() as number;
      lastSize = size() as number;
    }
    if (!block) {
      let initBuffer: Float32Array | undefined = Array.isArray(inputData)
        ? new Float32Array(inputData as number[])
        : ArrayBuffer.isView(inputData)
          ? (inputData as Float32Array)
          : undefined;
      if (initBuffer === undefined) {
        initBuffer = new Float32Array(
          (size() as number) * (channels() as number),
        );
      }
      block = data(
        size() as number,
        channels() as number,
        initBuffer,
        true,
        _node.attributes.interpolation as Interpolation,
      );
    } else {
      // we've already initialized the data, so we need to simply
      // feed this data into the block
      //if (lastData === inputData) {
      //  return [];
      //}
      lastData = inputData;
      if (ArrayBuffer.isView(inputData)) {
        if (block.set) {
          block.set(inputData as Float32Array);
        }
      } else if (Array.isArray(inputData)) {
        if (block.set) {
          block.set(new Float32Array(inputData as number[]));
        }
      }
      return [];
    }

    return [block];
  };
};

doc("peek", {
  inletNames: ["data", "index", "channel", "maxLength"],
  numberOfOutlets: "channels",
  numberOfInlets: 4,
  description: "peeks values out of data buffer",
  attributes: {
    channels: 1,
  },
  // todo: add "channels" as an acceptable attribute
});

export type BlockArg = BlockGen[];

export const zen_peek = (
  node: ObjectNode,
  index: Lazy,
  channel: Lazy,
  maxLength: Lazy,
) => {
  if (!maxLength()) {
    node.inlets[3].lastMessage = 1000000;
  }
  return (x: Message): Statement[] => {
    let outputs: Statement[] = [];
    if (node.attributes["channels"] === 1) {
      let operator = {
        name: "peek",
        params: x as unknown as BlockGen,
      };

      if (maxLength()) {
        let ret = [
          operator,
          index() as Statement,
          channel() as Statement,
          maxLength() as Statement,
        ] as Statement;
        (ret as Statement).node = node;
        return [ret];
      } else {
        let ret = [
          operator,
          index() as Statement,
          channel() as Statement,
        ] as Statement;
        (ret as Statement).node = node;
        return [ret];
      }
    }

    node.inlets[2].hidden = true;
    for (let i = 0; i < ((node.attributes["channels"] as number) || 1); i++) {
      let operator = {
        name: "peek",
        params: x as unknown as BlockGen,
      };
      if (maxLength()) {
        let ret = [operator, index() as Statement, i, maxLength() as Statement];
        (ret as Statement).node = {
          ...node,
          id: node.id + "_" + i,
        };
        outputs.push(ret as Statement);
      } else {
        let ret = [operator, index() as Statement, i as Statement];
        (ret as Statement).node = {
          ...node,
          id: node.id + "_" + i,
        };
        outputs.push(ret as Statement);
      }
    }
    return outputs;
  };
};

doc("poke", {
  inletNames: ["data", "index", "channel", "value"],
  numberOfInlets: 4,
  numberOfOutlets: 1,
  description: "poke value into buffer",
});

export const zen_poke = (
  _object: ObjectNode,
  index: Lazy,
  channel: Lazy,
  value: Lazy,
) => {
  return (msg: Message): Statement[] => {
    let operator = {
      name: "poke",
      params: msg as unknown as BlockGen,
    };
    return [
      [
        operator,
        index() as Statement,
        channel() as Statement,
        value() as Statement,
      ],
    ];
  };
};

export const data_index = {
  peek: zen_peek,
  poke: zen_poke,
  data: zen_data,
};
