// Types for our AST
export type Message = number | string | boolean | null | object | Message[];

export type Symbol = { type: "Symbol"; value: string };
export type Atom = number | boolean | null | string | Symbol;
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
  params: Symbol[];
  body: Expression;
};
export type Environment = Record<string, Message | Function>;
export const isSymbol = (x: Message | Expression) => (x as Symbol).type === "Symbol";
