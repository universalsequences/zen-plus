// Types for our AST
export type Message = number | string | boolean | null | object | Message[];

export type Symbol = { type: "Symbol"; value: string };
export type Atom = number | boolean | null | string | Symbol;
export interface CodeLocation {
  input: string;
  start: number;
  end: number;
}
export type Expression = Atom | List | ObjectLiteral | FunctionDefinition;
export type LocatedExpression = {
  expression: Expression;
  location: CodeLocation;
};
export type List = LocatedExpression[];
export type ObjectLiteral = {
  type: "object";
  spread: LocatedExpression | null;
  properties: { [key: string]: LocatedExpression };
};
export type AST = LocatedExpression[];
export type FunctionDefinition = {
  type: "function";
  params: LocatedExpression[];
  body: LocatedExpression;
};

export interface Pattern {
  params: LocatedExpression[]; // The pattern to match against
  body: LocatedExpression;
  predicates?: ((arg: Message) => boolean)[]; // Optional runtime checks
}

export type Environment = Record<string, Message | Function | Pattern[]>;
export const isSymbol = (x: Message | Expression | LocatedExpression) => {
  let y = x;
  if (typeof x === "object" && (x as LocatedExpression).expression) {
    y = (x as LocatedExpression).expression;
  }
  return (y as Symbol).type === "Symbol";
};
