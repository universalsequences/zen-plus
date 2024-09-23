import { safeStringify } from "@/utils/safePrint";
import { Message } from "../types";

function tokenize(input: string): string[] {
  // Regex to match atoms (sequences of non-whitespace and non-parenthesis chars)
  // and separate parentheses as their own tokens.
  const regex = /[()]|[^()\s]+/g;
  return input.match(regex) || [];
}

function parse(tokens: string[]): Message {
  if (tokens.length === 0) {
    throw new Error("Unexpected EOF while reading");
  }

  // Take the first token
  const token = tokens.shift() as Message;

  if (token === "(") {
    // If the token is '(', start parsing a new list
    const list = [];
    while (tokens[0] !== ")") {
      list.push(parse(tokens)); // Recursively parse the contents of the list
      if (tokens.length === 0) {
        throw new Error("Unexpected EOF while reading");
      }
    }
    tokens.shift(); // Remove the closing ')'
    return list;
  } else if (token === ")") {
    throw new Error("Unexpected )");
  } else {
    // If it's not a parenthesis, it must be an atom (symbol or number)
    const num = Number.parseFloat(token as string);
    if (Number.isNaN(num)) {
      return token;
    }
    return num;
  }
}

export const parseLispExpression = (input: string): Message => {
  const tokens = tokenize(input); // Tokenize the input
  return parse(tokens); // Parse the tokenized input into an AST
};

export const printLispExpression = (expr: Message): string => {
  if (Array.isArray(expr)) {
    // Recursively process each element of the list
    const innerExpr = expr.map((x) => printLispExpression(x as Message)).join(" ");
    return `(${innerExpr})`;
  } else {
    // Base case: if it's a symbol or number, return it as a string
    return safeStringify(expr);
  }
};
