import { Arg, UGen, ParamGen } from "@/lib/zen/index";
import { printStatement } from "./AST";
import { ObjectNode, Message } from "../../types";
import { BlockGen } from "@/lib/zen/data";
import { Statement, Operator } from "./types";
import { Lazy } from "../../types";

//export type AnyGen = (Arg) | UGen | ParamGen;
export type NodeFunc = (x: Message, ...args: boolean[]) => Statement;

export const memoBlockZen = (object: ObjectNode, zenOperator: Operator, ...args: Lazy[]) => {
  return memo(
    object,
    (x: Message): Statement => {
      let _args = args.map((x) => x());
      if (typeof x === "string") {
        return [zenOperator];
      }
      let xyz: Statement = [zenOperator, x as unknown as BlockGen, ..._args] as Statement;
      return xyz;
    },
    ...args,
  );
};

// does this even do anything? except just tacking on node to object
export const memoZen = (object: ObjectNode, operator: Operator, ...args: Lazy[]) => {
  return (x: Message): Statement[] => {
    let a = new Date().getTime();
    let _args: Message[] = args.map((x) => x());
    if (typeof x === "string") {
      return [[operator]];
    }

    let xyz: Statement = [operator, x as unknown as Statement, ...(_args as Statement[])];
    xyz.node = object;
    if ((operator as string) === "zswitch") {
      // console.log(xyz);
    }
    let b = new Date().getTime();
    if (b - a > 5) {
      //console.log("memozen took %s ms", b - a, object.name);
    }
    //console.log("memozen %s complted", object.id, b);
    return [xyz];
  };
};

export const memo = (object: ObjectNode, fn: NodeFunc, ...args: Lazy[]) => {
  let last: Statement | BlockGen;
  let lastArgs: string[];
  let out: Statement;
  let id = 0;
  return (msg: Message): Statement[] => {
    out = fn(msg);
    if (out) {
      out.node = object;
    }
    return [out];
  };
};
