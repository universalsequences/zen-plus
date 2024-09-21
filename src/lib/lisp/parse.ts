import type { Atom, Expression, List, ObjectLiteral, AST, FunctionDefinition } from "./types";

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"') {
      inString = !inString;
      current += char;
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
  } else if (token === "{") {
    return parseObjectLiteral(tokens);
  } else if (token === ")" || token === "}") {
    throw new Error("Unexpected closing bracket");
  } else {
    return parseAtom(token);
  }
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
      params: list[1] as string[],
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
    if (typeof key !== "string") {
      throw new Error("Object key must be a string");
    }
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing value for key");
    }
    const value = parseExpression(tokens);
    obj.properties[key] = value;
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
    return token.slice(1, -1); // Remove surrounding quotes
  }
  return token;
}

// Export the parse function
export { parse };
