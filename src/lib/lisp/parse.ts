import type {
  Atom,
  Expression,
  CodeLocation,
  List,
  ObjectLiteral,
  AST,
  FunctionDefinition,
  Symbol,
  LocatedExpression,
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
  const expressions: LocatedExpression[] = [];
  const expr = parseExpression(tokens, input);
  expressions.push(expr);
  while (tokens.length > 0) {
    expressions.push(parseExpression(tokens, input));
  }
  return expressions;
}
const locate = (expr: Expression, input: string): LocatedExpression => {
  return { expression: expr, location: { input, start: 0, end: input.length } };
};

function parseExpression(tokens: string[], input: string): LocatedExpression {
  const token = tokens.shift();
  if (token === undefined) {
    throw new Error("Unexpected end of input");
  }
  if (token === "(") {
    return parseList(tokens, input);
  }
  if (token === "{") {
    return locate(parseObjectLiteral(tokens, input), input);
  }
  if (token === ")" || token === "}") {
    throw new Error("Unexpected closing bracket");
  }
  return parseAtom(token, input);
}

function parseList(tokens: string[], input: string): LocatedExpression {
  const list: LocatedExpression[] = [];
  let parsedInput = "";
  while (tokens[0] !== ")") {
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing closing parenthesis");
    }
    //parsedInput += tokens[0];
    const parsed = parseExpression(tokens, input);
    console.log("adding sub parse", parsed);
    parsedInput += `${parsed.location.input} `;
    list.push(parsed);
  }
  tokens.shift(); // Remove closing parenthesis
  console.log("parsedInput", parsedInput, list);
  if (list[0].expression === "defun" && list.length === 3 && Array.isArray(list[1])) {
    return {
      expression: {
        type: "function",
        params: list[1] as LocatedExpression[],
        body: list[2],
      },
      location: { input: parsedInput, start: 0, end: parsedInput.length },
    };
  }
  return {
    expression: list,
    location: { input: parsedInput, start: 0, end: parsedInput.length },
  };
}

function parseObjectLiteral(tokens: string[], input: string): ObjectLiteral {
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
    obj.spread = parseExpression(tokens, input);
  }
  while (tokens[0] !== "}") {
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing closing brace");
    }
    const key = parseExpression(tokens, input);
    if (
      typeof key !== "string" &&
      !(typeof key === "object" && (key as Symbol).type === "Symbol")
    ) {
      throw new Error("Object key must be a string or symbol");
    }
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing value for key");
    }
    const value = parseExpression(tokens, input);
    obj.properties[typeof key === "string" ? key : (key as Symbol).value] = value;
  }
  tokens.shift(); // Remove closing brace
  return obj;
}

function parseAtom(token: string, input: string): LocatedExpression {
  if (token === "true") return locate(true, input);
  if (token === "false") return locate(false, input);
  if (token === "null") return locate(null, input);
  if (/^-?\d+(\.\d+)?$/.test(token)) return locate(Number(token), input);
  // Handle string literals
  if (token.startsWith('"') && token.endsWith('"')) {
    return locate(token, token); // Keep the quotes
  }
  // Everything else is a symbol
  return locate({ type: "Symbol", value: token }, token);
}

// Export the parse function
export { parse };
