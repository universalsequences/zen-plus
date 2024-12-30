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

type Token = {
  value: string;
  start: number;
  end: number;
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let current = "";
  let currentStart = 0;
  let inString = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (inString) {
        current += char;
        tokens.push({
          value: current,
          start: currentStart,
          end: i + 1,
        });
        current = "";
        inString = false;
      } else {
        if (current.trim().length > 0) {
          tokens.push({
            value: current.trim(),
            start: currentStart,
            end: i,
          });
        }
        current = char;
        currentStart = i;
        inString = true;
      }
    } else if (inString) {
      current += char;
    } else if (char === "(" || char === ")" || char === "{" || char === "}") {
      if (current.trim().length > 0) {
        tokens.push({
          value: current.trim(),
          start: currentStart,
          end: i,
        });
        current = "";
      }
      tokens.push({
        value: char,
        start: i,
        end: i + 1,
      });
      currentStart = i + 1;
    } else if (/\s/.test(char)) {
      if (current.trim().length > 0) {
        tokens.push({
          value: current.trim(),
          start: currentStart,
          end: i,
        });
        current = "";
      }
      currentStart = i + 1;
    } else {
      if (current === "") {
        currentStart = i;
      }
      current += char;
    }
  }
  if (current.trim().length > 0) {
    tokens.push({
      value: current.trim(),
      start: currentStart,
      end: input.length,
    });
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

const locate = (expr: Expression, input: string, start: number, end: number): LocatedExpression => {
  return { expression: expr, location: { input, start, end } };
};

function parseExpression(tokens: Token[], input: string): LocatedExpression {
  const token = tokens.shift();
  if (token === undefined) {
    throw new Error("Unexpected end of input");
  }
  if (token.value === "(") {
    return parseList(tokens, input);
  }
  if (token.value === "{") {
    return locate(parseObjectLiteral(tokens, input), input, token.start, token.end);
  }
  if (token.value === ")" || token.value === "}") {
    throw new Error("Unexpected closing bracket");
  }
  return parseAtom(token, input);
}

function parseList(tokens: Token[], input: string): LocatedExpression {
  const list: LocatedExpression[] = [];
  let parsedInput = "";
  const startToken = tokens[0];
  while (tokens[0]?.value !== ")") {
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing closing parenthesis");
    }
    const parsed = parseExpression(tokens, input);
    console.log("adding sub parse", parsed);
    parsedInput += `${parsed.location.input} `;
    list.push(parsed);
  }
  const endToken = tokens[0];
  tokens.shift(); // Remove closing parenthesis
  console.log("parsedInput", parsedInput, list);
  if (list[0]?.expression === "defun" && list.length === 3 && Array.isArray(list[1])) {
    return {
      expression: {
        type: "function",
        params: list[1] as LocatedExpression[],
        body: list[2],
      },
      location: { input: parsedInput, start: startToken.start, end: endToken.end },
    };
  }
  return {
    expression: list,
    location: { input: parsedInput, start: startToken.start, end: endToken.end },
  };
}

function parseObjectLiteral(tokens: Token[], input: string): ObjectLiteral {
  const obj: ObjectLiteral = {
    type: "object",
    spread: null,
    properties: {},
  };
  if (tokens[0]?.value === "}") {
    tokens.shift(); // Remove closing brace for empty object
    return obj;
  }
  if (tokens[0]?.value === "...") {
    tokens.shift(); // Remove spread operator
    obj.spread = parseExpression(tokens, input);
  }
  while (tokens[0]?.value !== "}") {
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing closing brace");
    }
    const key = parseExpression(tokens, input);
    if (
      typeof key.expression !== "string" &&
      !(typeof key.expression === "object" && (key.expression as Symbol).type === "Symbol")
    ) {
      throw new Error("Object key must be a string or symbol");
    }
    if (tokens.length === 0) {
      throw new Error("Unexpected end of input: missing value for key");
    }
    const value = parseExpression(tokens, input);
    obj.properties[
      typeof key.expression === "string" ? key.expression : (key.expression as Symbol).value
    ] = value;
  }
  tokens.shift(); // Remove closing brace
  return obj;
}

function parseAtom(token: Token, input: string): LocatedExpression {
  if (token.value === "true") return locate(true, input, token.start, token.end);
  if (token.value === "false") return locate(false, input, token.start, token.end);
  if (token.value === "null") return locate(null, input, token.start, token.end);
  if (/^-?\d+(\.\d+)?$/.test(token.value))
    return locate(Number(token.value), input, token.start, token.end);
  // Handle string literals
  if (token.value.startsWith('"') && token.value.endsWith('"')) {
    return locate(token.value, token.value, token.start, token.end); // Keep the quotes
  }
  // Everything else is a symbol
  return locate({ type: "Symbol", value: token.value }, token.value, token.start, token.end);
}

// Export the parse function
export { parse };
