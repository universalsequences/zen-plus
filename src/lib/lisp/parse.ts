import type {
  Atom,
  Expression,
  List,
  ObjectLiteral,
  AST,
  FunctionDefinition,
  Symbol,
} from "./types";

// Update the Atom type to include a new 'Symbol' type

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inString = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (inString) {
        current += char;
        tokens.push(current);
        current = "";
        inString = false;
      } else {
        if (current.trim().length > 0) {
          tokens.push(current.trim());
        }
        current = char;
        inString = true;
      }
    } else if (inString) {
      current += char;
    } else if (char === "(" || char === ")" || char === "{" || char === "}") {
      if (current.trim().length > 0) {
        tokens.push(current.trim());
        current = "";
      }
      tokens.push(char);
    } else if (/\s/.test(char)) {
      if (current.trim().length > 0) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    tokens.push(current.trim());
  }
  return tokens;
}

function parse(input: string): AST {
  const tokens = tokenize(input);
  const expressions: Expression[] = [];
  const expr = parseExpression(tokens);
  expressions.push(expr);
  while (tokens.length > 0) {
    expressions.push(parseExpression(tokens));
  }
  return expressions;
}

function parseExpression(tokens: string[]): Expression {
  const token = tokens.shift();
  if (token === undefined) {
    throw new Error("Unexpected end of input");
  }
  if (token === "(") {
    return parseList(tokens);
  }
  if (token === "{") {
    return parseObjectLiteral(tokens);
  }
  if (token === ")" || token === "}") {
    throw new Error("Unexpected closing bracket");
  }
  return parseAtom(token);
}

function parseList(tokens: string[]): List | FunctionDefinition {
  const list: Expression[] = [];
  while (tokens[0] !== ")") {
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing closing parenthesis");
    }
    list.push(parseExpression(tokens));
  }
  tokens.shift(); // Remove closing parenthesis
  if (list[0] === "defun" && list.length === 3 && Array.isArray(list[1])) {
    return {
      type: "function",
      params: list[1] as unknown as Symbol[],
      body: list[2],
    };
  }
  return list;
}

function parseObjectLiteral(tokens: string[]): ObjectLiteral {
  const obj: ObjectLiteral = {
    type: "object",
    spread: null,
    properties: {},
  };
  if (tokens[0] === "}") {
    tokens.shift(); // Remove closing brace for empty object
    return obj;
  }
  if (tokens[0] === "...") {
    tokens.shift(); // Remove spread operator
    obj.spread = parseExpression(tokens);
  }
  while (tokens[0] !== "}") {
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing closing brace");
    }
    const key = parseExpression(tokens);
    if (
      typeof key !== "string" &&
      !(typeof key === "object" && (key as Symbol).type === "Symbol")
    ) {
      throw new Error("Object key must be a string or symbol");
    }
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing value for key");
    }
    const value = parseExpression(tokens);
    obj.properties[typeof key === "string" ? key : (key as Symbol).value] = value;
  }
  tokens.shift(); // Remove closing brace
  return obj;
}

function parseAtom(token: string): Atom {
  if (token === "true") return true;
  if (token === "false") return false;
  if (token === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
  // Handle string literals
  if (token.startsWith('"') && token.endsWith('"')) {
    return token; // Keep the quotes
  }
  // Everything else is a symbol
  return { type: "Symbol", value: token };
}

// Export the parse function
export { parse };
