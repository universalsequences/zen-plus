// Types for our AST
export type Message = number | string | boolean | null | object | Message[];

export type Atom = string | number | boolean | null;
export type Expression = Atom | List | ObjectLiteral | FunctionDefinition;
export type List = Expression[];
export type ObjectLiteral = {
  type: "object";
  spread: Expression | null;
  properties: { [key: string]: Expression };
};
export type AST = Expression[];
export type FunctionDefinition = {
  type: "function";
  params: string[];
  body: Expression;
};
export type Environment = Record<string, Message | Function>;
